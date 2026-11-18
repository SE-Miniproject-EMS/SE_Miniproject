const express = require("express");
const { QueryTypes } = require("sequelize");
const db = require("../config/db");
const { authenticate, authorize } = require("../middleware/auth");
const { ApiError } = require("../middleware/errorHandler");

const router = express.Router();
router.use(authenticate, authorize("ORGANIZER", "ADMIN"));

function eventScope(query, user) {
  const filters = [];
  const replacements = {};
  if (user.role !== "ADMIN") {
    filters.push("e.organizerId = :owner");
    replacements.owner = user.id;
  }
  if (query.eventId !== undefined) {
    if (typeof query.eventId !== "string" || !/^[1-9]\d*$/.test(query.eventId) || !Number.isSafeInteger(Number(query.eventId))) {
      throw new ApiError(400, "INVALID_REPORT_FILTER", "Event ID must be a positive integer.");
    }
    replacements.eventId = Number(query.eventId);
    filters.push("e.id = :eventId");
  }

  for (const [key, operator] of [["from", ">="], ["to", "<="]]) {
    const value = query[key];
    if (value === undefined) continue;
    const date = new Date(typeof value === "string" ? value : NaN);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(date.valueOf()) ||
        date.toISOString().slice(0, 10) !== value) {
      throw new ApiError(400, "INVALID_REPORT_FILTER", "Dates must be valid YYYY-MM-DD values.");
    }
    replacements[key] = value;
    filters.push("date(e.startDateTime) " + operator + " :" + key);
  }
  if (replacements.from && replacements.to && replacements.from > replacements.to) {
    throw new ApiError(400, "INVALID_REPORT_FILTER", "Start date must be on or before end date.");
  }
  return { where: filters.length ? "WHERE " + filters.join(" AND ") : "", replacements };
}

function csvCell(value) {
  let text = String(value ?? "");
  // Neutralize spreadsheet formulas, including ones preceded by whitespace.
  if (/^[\t\r\n]|^\s*[=+@-]/u.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}

router.get("/", async (req, res, next) => {
  try {
    const { where, replacements } = eventScope(req.query, req.user);
    const report = await db.transaction(async (transaction) => {
      const options = { replacements, transaction, type: QueryTypes.SELECT };
      const events = await db.query(`
        SELECT e.id, e.title, e.status, e.startDateTime, e.capacity, e.seatsTaken,
          (SELECT COUNT(*) FROM registrations r WHERE r.eventId = e.id AND r.status = 'CONFIRMED') AS confirmed,
          (SELECT COUNT(*) FROM registrations r WHERE r.eventId = e.id AND r.status = 'WAITLISTED') AS waitlisted,
          (SELECT COUNT(*) FROM registrations r WHERE r.eventId = e.id AND r.checkedInAt IS NOT NULL) AS checkedIn,
          COALESCE(SUM(CASE WHEN p.adapter <> 'MOCK' AND p.status = 'SUCCEEDED'
            THEN p.amountPaise - CASE WHEN f.status = 'COMPLETED' THEN f.amountPaise ELSE 0 END END), 0) AS revenuePaise,
          COALESCE(SUM(CASE WHEN p.adapter = 'MOCK' AND p.status = 'SUCCEEDED'
            THEN p.amountPaise - CASE WHEN f.status = 'SIMULATED' THEN f.amountPaise ELSE 0 END END), 0) AS simulatedRevenuePaise
        FROM events e
        LEFT JOIN registrations pr ON pr.eventId = e.id
        LEFT JOIN payments p ON p.registrationId = pr.id
        LEFT JOIN refunds f ON f.paymentId = p.id
        ${where}
        GROUP BY e.id
        ORDER BY e.startDateTime, e.id
      `, options);
      const totals = events.reduce((sum, event) => {
        for (const key of Object.keys(sum)) sum[key] += event[key];
        return sum;
      }, { confirmed: 0, waitlisted: 0, checkedIn: 0, capacity: 0, seatsTaken: 0, revenuePaise: 0, simulatedRevenuePaise: 0 });
      totals.events = events.length;
      if (req.user.role === "ADMIN") {
        const [row] = await db.query("SELECT COUNT(*) AS users FROM users", options);
        totals.users = row.users;
      }
      return { events, totals };
    });
    res.json(report);
  } catch (error) {
    next(error);
  }
});

router.get("/:kind.csv", async (req, res, next) => {
  try {
    const { kind } = req.params;
    if (kind !== "registrations" && kind !== "attendance") {
      throw new ApiError(404, "REPORT_NOT_FOUND", "Report not found.");
    }
    const { where, replacements } = eventScope(req.query, req.user);
    const columns = ["event_id", "event_title", "registration_id", "attendee_id", "status", "registered_at", "checked_in_at"];
    const attendance = kind === "attendance";
    const rows = await db.query(`
      SELECT e.id AS eventId, e.title, r.id, r.attendeeId, r.status, r.createdAt, r.checkedInAt
      FROM events e JOIN registrations r ON r.eventId = e.id
      ${where}
      ${attendance ? (where ? "AND" : "WHERE") + " r.checkedInAt IS NOT NULL" : ""}
      ORDER BY e.id, r.id
    `,
    { replacements, type: QueryTypes.SELECT });
    const lines = rows.map((row) => [
      row.eventId, row.title, row.id, row.attendeeId, row.status, row.createdAt, row.checkedInAt,
    ].map(csvCell).join(","));
    res.set("Cache-Control", "no-store");
    res.attachment(kind + ".csv").type("text/csv").send([columns.join(","), ...lines].join("\r\n") + "\r\n");
  } catch (error) {
    next(error);
  }
});

module.exports = router;
