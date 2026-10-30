const crypto = require("node:crypto");
const { Op, literal } = require("sequelize");
const sequelize = require("../config/db");
const Event = require("../models/Event");
const User = require("../models/User");
const Registration = require("../models/Registration");
const { ApiError } = require("../middleware/errorHandler");
const { enqueue } = require("../services/notificationService");
const digest = (value) => crypto.createHash("sha256").update(value).digest("hex");
const ticketPayload = (reg) => ({ id: reg.id, eventId: reg.eventId, status: reg.status, checkedInAt: reg.checkedInAt });

async function register(req, res, next) {
  try {
    const eventId = Number(req.params.eventId);
    if (!Number.isInteger(eventId) || eventId < 1) throw new ApiError(400, "INVALID_EVENT_ID", "Event ID must be a positive integer");
    const result = await sequelize.transaction(async (transaction) => {
      const event = await Event.findByPk(eventId, { transaction });
      if (!event || event.status !== "PUBLISHED") throw new ApiError(404, "EVENT_UNAVAILABLE", "Published event not found");
      if (new Date(event.endDateTime).getTime() <= Date.now()) throw new ApiError(409, "EVENT_ENDED", "Registration is closed because the event has ended");
      if (Number(event.ticketPrice) > 0) throw new ApiError(402, "PAYMENT_INTEGRATION_REQUIRED", "Paid-event registration is disabled until a payment gateway is configured and verified");
      const existing = await Registration.findOne({ where: { eventId, attendeeId: req.user.id }, transaction });
      if (existing && existing.status !== "CANCELLED") throw new ApiError(409, "ALREADY_REGISTERED", "You already have an active registration for this event");
      if (existing) throw new ApiError(409, "DUPLICATE_REGISTRATION", "A cancelled registration cannot be reused");

      // A single conditional UPDATE is the capacity gate. SQLite serializes writes;
      // concurrent requests cannot both increment seatsTaken past capacity.
      const [claimed] = await Event.update({ seatsTaken: literal('"seatsTaken" + 1') }, {
        where: { id: eventId, status: "PUBLISHED", seatsTaken: { [Op.lt]: event.capacity } }, transaction,
      });
      if (claimed) {
        const rawToken = crypto.randomBytes(32).toString("base64url");
        const reg = await Registration.create({ eventId, attendeeId: req.user.id, status: "CONFIRMED", ticketTokenHash: digest(rawToken) }, { transaction });
        await enqueue({ recipientId: req.user.id, eventId, registrationId: reg.id, type: "REGISTRATION_CONFIRMED", dedupeKey: `registration-confirmed:${reg.id}`, payload: { eventTitle: event.title, startDateTime: event.startDateTime, venue: event.venue }, transaction });
        return { registration: reg, ticketToken: rawToken, waitlisted: false };
      }
      const reg = await Registration.create({ eventId, attendeeId: req.user.id, status: "WAITLISTED" }, { transaction });
      return { registration: reg, ticketToken: null, waitlisted: true };
    });
    res.status(201).json({ registration: ticketPayload(result.registration), ticketToken: result.ticketToken, message: result.waitlisted ? "Event is full; you have been added to the waitlist" : "Registration confirmed" });
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") return next(new ApiError(409, "ALREADY_REGISTERED", "You already have a registration for this event"));
    next(err);
  }
}

async function myRegistrations(req, res, next) {
  try { const registrations = await Registration.findAll({ where: { attendeeId: req.user.id }, include: [{ model: Event, as: "event", attributes: ["id", "title", "startDateTime", "endDateTime", "venue", "status"] }], order: [["createdAt", "DESC"]] }); res.json({ registrations }); }
  catch (err) { next(err); }
}

async function cancelRegistration(req, res, next) {
  try {
    const regId = Number(req.params.id);
    const result = await sequelize.transaction(async (transaction) => {
      const reg = await Registration.findByPk(regId, { transaction });
      if (!reg) throw new ApiError(404, "REGISTRATION_NOT_FOUND", "Registration not found");
      if (reg.attendeeId !== Number(req.user.id)) throw new ApiError(403, "FORBIDDEN", "You may only cancel your own registration");
      if (reg.status === "CANCELLED") throw new ApiError(409, "ALREADY_CANCELLED", "Registration is already cancelled");
      const event = await Event.findByPk(reg.eventId, { transaction });
      if (reg.status === "CONFIRMED") {
        if (event.refundWindowHours !== null && event.startDateTime.getTime() - Date.now() < event.refundWindowHours * 3600000) throw new ApiError(400, "CANCELLATION_CUTOFF_PASSED", "The cancellation window has closed");
        await Event.update({ seatsTaken: literal('CASE WHEN "seatsTaken" > 0 THEN "seatsTaken" - 1 ELSE 0 END') }, { where: { id: event.id }, transaction });
      }
      await reg.update({ status: "CANCELLED", ticketTokenHash: null }, { transaction });
      if (reg.status === "CONFIRMED") {
        const next = await Registration.findOne({ where: { eventId: event.id, status: "WAITLISTED" }, order: [["createdAt", "ASC"]], transaction });
        if (next) {
          const rawToken = crypto.randomBytes(32).toString("base64url");
          await next.update({ status: "CONFIRMED", ticketTokenHash: digest(rawToken) }, { transaction });
          await Event.update({ seatsTaken: literal('"seatsTaken" + 1') }, { where: { id: event.id }, transaction });
          await enqueue({ recipientId: next.attendeeId, eventId: event.id, registrationId: next.id, type: "WAITLIST_PROMOTED", dedupeKey: `waitlist-promoted:${next.id}`, payload: { eventTitle: event.title, ticketToken: rawToken }, transaction });
        }
      }
      return reg;
    });
    res.json({ registration: ticketPayload(result), message: "Registration cancelled" });
  } catch (err) { next(err); }
}

async function checkIn(req, res, next) {
  try {
    const { ticketToken, eventId } = req.body;
    if (typeof ticketToken !== "string" || ticketToken.length < 20) throw new ApiError(400, "INVALID_TICKET", "A valid ticket token is required");
    const reg = await Registration.findOne({ where: { ticketTokenHash: digest(ticketToken), eventId: Number(eventId), status: "CONFIRMED" } });
    if (!reg) throw new ApiError(404, "INVALID_TICKET", "Ticket is invalid or does not belong to this event");
    const event = await Event.findByPk(reg.eventId);
    if (!event) throw new ApiError(404, "EVENT_NOT_FOUND", "Event not found");
    if (req.user.role !== "ADMIN" && (req.user.role !== "ORGANIZER" || Number(event.organizerId) !== Number(req.user.id))) throw new ApiError(403, "FORBIDDEN", "Only this event's organizer or an admin may check in attendees");
    const [updated] = await Registration.update({ checkedInAt: new Date() }, { where: { id: reg.id, checkedInAt: null, status: "CONFIRMED" } });
    if (!updated) throw new ApiError(409, "TICKET_ALREADY_USED", "This ticket has already been checked in");
    res.json({ checkedIn: true, registrationId: reg.id, eventId: reg.eventId });
  } catch (err) { next(err); }
}

module.exports = { register, myRegistrations, cancelRegistration, checkIn };
