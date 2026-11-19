const crypto = require("node:crypto");
const { Op, DataTypes } = require("sequelize");
const Notification = require("../models/Notification");
const User = require("../models/User");
const Event = require("../models/Event");

const MAX_ATTEMPTS = 3;
const CLAIM_TIMEOUT_MS = 5 * 60 * 1000;

async function enqueue({ recipientId, eventId, registrationId = null, type, dedupeKey, payload, transaction }) {
  try {
    const [notification, created] = await Notification.findOrCreate({
      where: { dedupeKey },
      defaults: {
        recipientId, eventId, registrationId, type, dedupeKey,
        payload: JSON.stringify(payload),
      },
      transaction,
    });
    return created ? notification : null;
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") return null;
    throw error;
  }
}

// Additive migration for existing SQLite databases. Model.sync() creates these
// columns on new databases but does not add them to an existing table.
async function ensureNotificationSchema() {
  const qi = Notification.sequelize.getQueryInterface();
  const columns = await qi.describeTable("notifications");
  if (!columns.claimedAt) {
    await qi.addColumn("notifications", "claimedAt", { type: DataTypes.DATE, allowNull: true });
  }
  if (!columns.claimToken) {
    await qi.addColumn("notifications", "claimToken", { type: DataTypes.STRING(64), allowNull: true });
  }
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
}

function formatDate(value) {
  if (!value) return "Not specified";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not specified" : date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: process.env.NOTIFICATION_TIME_ZONE || "Asia/Kolkata" });
}

function buildNotificationEmail(notification, event) {
  const payload = typeof notification.payload === "string" ? JSON.parse(notification.payload) : (notification.payload || {});
  const title = payload.eventTitle || payload.title || event.title;
  const start = payload.startDateTime || event.startDateTime;
  const end = payload.endDateTime || event.endDateTime;
  const venue = payload.venue || event.venue;

  const copy = {
    REGISTRATION_CONFIRMED: ["Your registration is confirmed", `You are registered for ${title}.`],
    EVENT_REMINDER: ["Your event is tomorrow", `This is a reminder that ${title} starts in approximately 24 hours.`],
    EVENT_RESCHEDULED: ["Event details have changed", `${title} has been rescheduled or its venue/details have changed. Please review the updated details below.`],
    EVENT_CANCELLED: ["Event cancelled", `${title} has been cancelled by the organizer.`],
    WAITLIST_PROMOTED: ["A place is available — your registration is confirmed", `A place has become available for ${title}. Your waitlist registration has been promoted.`],
  }[notification.type];

  if (!copy) throw new Error(`Unsupported notification type: ${notification.type}`);
  const details = [
    `Event: ${title}`,
    `Starts: ${formatDate(start)}`,
    `Ends: ${formatDate(end)}`,
    `Venue: ${venue || "Not specified"}`,
  ].join("\n");
  const safeTitle = escapeHtml(title);
  const html = `<div style="font-family:Arial,sans-serif;line-height:1.5;color:#202124"><h2>${escapeHtml(copy[0])}</h2><p>${escapeHtml(copy[1])}</p><hr><p><strong>Event:</strong> ${safeTitle}<br><strong>Starts:</strong> ${escapeHtml(formatDate(start))}<br><strong>Ends:</strong> ${escapeHtml(formatDate(end))}<br><strong>Venue:</strong> ${escapeHtml(venue || "Not specified")}</p><p style="color:#666;font-size:12px">This is an automated message from Event Management System.</p></div>`;
  return { subject: `${copy[0]}: ${title}`, text: `${copy[0]}\n\n${copy[1]}\n\n${details}\n\nEvent Management System`, html };
}

function createResendAdapter({ apiKey = process.env.RESEND_API_KEY, from = process.env.NOTIFICATION_FROM_EMAIL, fetchImpl = globalThis.fetch } = {}) {
  return {
    async send({ to, subject, text, html, idempotencyKey }) {
      if (!apiKey) throw new Error("RESEND_API_KEY is not configured");
      if (!from) throw new Error("NOTIFICATION_FROM_EMAIL is not configured");
      if (typeof fetchImpl !== "function") throw new Error("Node.js fetch is unavailable; use Node 18 or newer");
      const response = await fetchImpl("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({ from, to: [to], subject, text, html }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = body.message || body.error || `Resend API returned HTTP ${response.status}`;
        throw new Error(String(message).slice(0, 450));
      }
      if (!body.id) throw new Error("Resend accepted no email ID in its response");
      return { providerMessageId: body.id };
    },
  };
}

function createConsoleAdapter({ logger = console } = {}) {
  return {
    async send({ to, subject, text, idempotencyKey }) {
      logger.log(`[EMS NOTIFICATION TEST-DELIVERY] to=${to} subject=${subject} key=${idempotencyKey}\n${text}`);
      return { providerMessageId: `console:${idempotencyKey}` };
    },
  };
}

function getAdapter() {
  const mode = process.env.NOTIFICATION_ADAPTER || (process.env.NODE_ENV === "production" ? "resend" : "console");
  if (mode === "resend") return createResendAdapter();
  if (mode === "console" && process.env.NODE_ENV !== "production") return createConsoleAdapter();
  throw new Error(`Unsupported or unsafe NOTIFICATION_ADAPTER: ${mode}`);
}

async function dispatchPending(limit = 50, { adapter = null, now = new Date() } = {}) {
  const deliveryAdapter = adapter || getAdapter();
  const staleBefore = new Date(now.getTime() - CLAIM_TIMEOUT_MS);
  const rows = await Notification.findAll({
    where: {
      status: { [Op.in]: ["PENDING", "FAILED"] },
      attempts: { [Op.lt]: MAX_ATTEMPTS },
      [Op.or]: [{ claimToken: null }, { claimedAt: { [Op.lt]: staleBefore } }],
    },
    order: [["createdAt", "ASC"]],
    limit,
  });

  const results = [];
  for (const row of rows) {
    // Exponential retry delay for failed attempts: 1, 2, then 4 minutes.
    if (row.status === "FAILED") {
      const delayMs = 60 * 1000 * (2 ** Math.max(0, row.attempts - 1));
      if (now.getTime() - new Date(row.updatedAt).getTime() < delayMs) continue;
    }

    const claimToken = crypto.randomBytes(24).toString("hex");
    const [claimed] = await Notification.update(
      { claimToken, claimedAt: now },
      {
        where: {
          id: row.id,
          status: row.status,
          [Op.or]: [{ claimToken: null }, { claimedAt: { [Op.lt]: staleBefore } }],
        },
      }
    );
    if (!claimed) continue;

    try {
      const [user, event] = await Promise.all([
        User.findByPk(row.recipientId),
        Event.findByPk(row.eventId),
      ]);
      if (!user || !user.email || !event) throw new Error("Notification recipient or event is missing");
      const email = buildNotificationEmail(row, event);
      const sent = await deliveryAdapter.send({
        to: user.email,
        ...email,
        idempotencyKey: row.dedupeKey,
      });
      await Notification.update(
        { status: "SENT", attempts: row.attempts + 1, sentAt: new Date(), lastError: null, claimToken: null, claimedAt: null },
        { where: { id: row.id, claimToken } }
      );
      results.push({ id: row.id, status: "SENT", providerMessageId: sent.providerMessageId });
    } catch (error) {
      await Notification.update(
        { status: "FAILED", attempts: row.attempts + 1, lastError: String(error.message).slice(0, 500), claimToken: null, claimedAt: null },
        { where: { id: row.id, claimToken } }
      );
      results.push({ id: row.id, status: "FAILED", error: String(error.message).slice(0, 160) });
    }
  }
  return results;
}

async function queueEventNotice(event, type) {
  const Registration = require("../models/Registration");
  const regs = await Registration.findAll({
    where: { eventId: event.id, status: { [Op.in]: ["CONFIRMED", "WAITLISTED"] } },
  });
  let queued = 0;
  for (const reg of regs) {
    const item = await enqueue({
      recipientId: reg.attendeeId,
      eventId: event.id,
      registrationId: reg.id,
      type,
      dedupeKey: `${type}:${event.id}:${reg.id}:${event.updatedAt.getTime()}`,
      payload: {
        eventTitle: event.title,
        startDateTime: event.startDateTime,
        endDateTime: event.endDateTime,
        venue: event.venue,
      },
    });
    if (item) queued++;
  }
  return queued;
}

module.exports = {
  enqueue, dispatchPending, queueEventNotice, ensureNotificationSchema,
  buildNotificationEmail, createResendAdapter, createConsoleAdapter,
};
