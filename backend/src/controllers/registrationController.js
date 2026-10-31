const crypto = require("node:crypto");
const { Op, literal, Transaction } = require("sequelize");
const sequelize = require("../config/db");
const Event = require("../models/Event");
const User = require("../models/User");
const Registration = require("../models/Registration");
const Payment = require("../models/Payment");
const Refund = require("../models/Refund");
const { createRefund, offerNextWaitlistInTransaction } = require("../services/registrationPaymentService");
const { createPaymentAttempt, isRefundWindowOpen } = require("../services/paymentService");
const { assertMockAdapterEnabled } = require("../services/registrationPaymentService");
const { ApiError } = require("../middleware/errorHandler");
const { enqueue } = require("../services/notificationService");
const digest = (value) => crypto.createHash("sha256").update(value).digest("hex");
const ticketPayload = (reg) => ({ id: reg.id, eventId: reg.eventId, status: reg.status, checkedInAt: reg.checkedInAt });

async function register(req, res, next) {
  try {
    const eventId = Number(req.params.eventId);
    if (!Number.isInteger(eventId) || eventId < 1) throw new ApiError(400, "INVALID_EVENT_ID", "Event ID must be a positive integer");
    const result = await sequelize.transaction({ type: Transaction.TYPES.IMMEDIATE }, async (transaction) => {
      const event = await Event.findByPk(eventId, { transaction });
      if (!event || event.status !== "PUBLISHED") throw new ApiError(404, "EVENT_UNAVAILABLE", "Published event not found");
      if (new Date(event.endDateTime).getTime() <= Date.now()) throw new ApiError(409, "EVENT_ENDED", "Registration is closed because the event has ended");
      if (Number(event.ticketPrice) > 0) assertMockAdapterEnabled();
      const existing = await Registration.findOne({ where: { eventId, attendeeId: req.user.id }, transaction });
      if (existing && existing.status !== "CANCELLED") throw new ApiError(409, "ALREADY_REGISTERED", "You already have an active registration for this event");
      if (existing) throw new ApiError(409, "DUPLICATE_REGISTRATION", "A cancelled registration cannot be reused");

      // A single conditional UPDATE is the capacity gate. SQLite serializes writes;
      // concurrent requests cannot both increment seatsTaken past capacity.
      const [claimed] = await Event.update({ seatsTaken: literal('"seatsTaken" + 1') }, {
        where: { id: eventId, status: "PUBLISHED", seatsTaken: { [Op.lt]: event.capacity } }, transaction,
      });
      if (claimed && Number(event.ticketPrice) > 0) {
        const reg = await Registration.create({ eventId, attendeeId: req.user.id, status: "PENDING_PAYMENT" }, { transaction });
        const payment = await createPaymentAttempt({ registrationId: reg.id, ticketPrice: event.ticketPrice, paymentPurpose: "INITIAL_CHECKOUT", transaction });
        return { registration: reg, payment, ticketToken: null, waitlisted: false, paymentPending: true };
      }
      if (claimed) {
        const rawToken = crypto.randomBytes(32).toString("base64url");
        const reg = await Registration.create({ eventId, attendeeId: req.user.id, status: "CONFIRMED", ticketTokenHash: digest(rawToken) }, { transaction });
        await enqueue({ recipientId: req.user.id, eventId, registrationId: reg.id, type: "REGISTRATION_CONFIRMED", dedupeKey: `registration-confirmed:${reg.id}`, payload: { eventTitle: event.title, startDateTime: event.startDateTime, venue: event.venue }, transaction });
        return { registration: reg, ticketToken: rawToken, waitlisted: false };
      }
      const reg = await Registration.create({ eventId, attendeeId: req.user.id, status: "WAITLISTED", waitlistPositionAt: new Date() }, { transaction });
      return { registration: reg, ticketToken: null, waitlisted: true };
    });
    res.status(201).json({ registration: ticketPayload(result.registration), payment: result.payment ? { id: result.payment.id, status: result.payment.status, paymentPurpose: result.payment.paymentPurpose, amountPaise: result.payment.amountPaise, expiresAt: result.payment.expiresAt, adapter: result.payment.adapter } : null, ticketToken: result.ticketToken, message: result.paymentPending ? "Mock payment checkout created; no real payment was processed." : result.waitlisted ? "Event is full; you have been added to the waitlist" : "Registration confirmed" });
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") return next(new ApiError(409, "ALREADY_REGISTERED", "You already have a registration for this event"));
    next(err);
  }
}

async function myRegistrations(req, res, next) {
  try {
    const registrations = await Registration.findAll({
      where: { attendeeId: req.user.id },
      attributes: { exclude: ["ticketTokenHash"] },
      include: [
        { model: Event, as: "event", attributes: ["id", "title", "startDateTime", "endDateTime", "venue", "status"] },
        {
          model: Payment, as: "payments",
          attributes: ["id", "paymentPurpose", "amountPaise", "status", "expiresAt", "createdAt"],
          include: [{ model: Refund, as: "refund", attributes: ["id", "amountPaise", "status"] }],
        },
      ],
      order: [["createdAt", "DESC"], [{ model: Payment, as: "payments" }, "createdAt", "DESC"]],
    });
    res.json({ registrations });
  } catch (err) { next(err); }
}

async function cancelRegistration(req, res, next) {
  try {
    const regId = Number(req.params.id);
    const now = new Date();
    const result = await sequelize.transaction({ type: Transaction.TYPES.IMMEDIATE }, async (transaction) => {
      const reg = await Registration.findByPk(regId, { transaction });
      if (!reg) throw new ApiError(404, "REGISTRATION_NOT_FOUND", "Registration not found");
      if (Number(reg.attendeeId) !== Number(req.user.id)) throw new ApiError(403, "FORBIDDEN", "You may only cancel your own registration");
      const event = await Event.findByPk(reg.eventId, { transaction });
      if (!event) throw new ApiError(404, "EVENT_NOT_FOUND", "Event not found");
      if (reg.status === "CANCELLED") {
        if (event.status !== "CANCELLED") throw new ApiError(409, "ALREADY_CANCELLED", "Registration is already cancelled");
        const existingRefund = await Refund.findOne({
          include: [{ model: Payment, as: "payment", where: { registrationId: reg.id }, attributes: [] }],
          order: [["createdAt", "DESC"]], transaction,
        });
        return { registration: reg, refund: existingRefund };
      }
      const wasConfirmed = reg.status === "CONFIRMED";
      const wasPendingPayment = reg.status === "PENDING_PAYMENT";
      const wasReserved = wasConfirmed || wasPendingPayment;
      let refund = null;
      let paidPayment = null;
      if (wasConfirmed) {
        paidPayment = await Payment.findOne({
          where: { registrationId: reg.id, status: "SUCCEEDED" },
          order: [["createdAt", "DESC"], ["id", "DESC"]], transaction,
        });
        if (paidPayment) {
          if (!isRefundWindowOpen(event.startDateTime, event.refundWindowHours, now)) throw new ApiError(400, "CANCELLATION_CUTOFF_PASSED", "The cancellation window has closed");
          refund = await createRefund(paidPayment, transaction);
        } else if (event.refundWindowHours !== null && now.getTime() > event.startDateTime.getTime() - event.refundWindowHours * 60 * 60 * 1000) {
          // Preserve the existing free-registration cancellation window.
          throw new ApiError(400, "CANCELLATION_CUTOFF_PASSED", "The cancellation window has closed");
        }
      }
      if (wasPendingPayment) {
        const [expired] = await Payment.update({ status: "EXPIRED" }, {
          where: { registrationId: reg.id, status: "PENDING" }, transaction,
        });
        if (expired !== 1) throw new Error("Pending registration has no active payment reservation");
      }
      await reg.update({ status: "CANCELLED", ticketTokenHash: null }, { transaction });
      if (wasReserved) {
        const [released] = await Event.update({
          seatsTaken: literal('CASE WHEN "seatsTaken" > 0 THEN "seatsTaken" - 1 ELSE 0 END'),
        }, { where: { id: event.id, seatsTaken: { [Op.gt]: 0 } }, transaction });
        if (released !== 1) throw new Error("Capacity invariant failed while cancelling registration");
      }
      const eventIsActive = event.status === "PUBLISHED" && event.endDateTime.getTime() > now.getTime();
      if (wasReserved && eventIsActive) {
        if (Number(event.ticketPrice) > 0) {
          await offerNextWaitlistInTransaction(event.id, transaction, now, reg.id);
        } else {
          const next = await Registration.findOne({
            where: { eventId: event.id, status: "WAITLISTED" },
            order: [["waitlistPositionAt", "ASC"], ["id", "ASC"]], transaction,
          });
          if (next) {
            const rawToken = crypto.randomBytes(32).toString("base64url");
            await next.update({ status: "CONFIRMED", ticketTokenHash: digest(rawToken) }, { transaction });
            await Event.update({ seatsTaken: literal('"seatsTaken" + 1') }, { where: { id: event.id }, transaction });
            await enqueue({ recipientId: next.attendeeId, eventId: event.id, registrationId: next.id, type: "WAITLIST_PROMOTED", dedupeKey: "waitlist-promoted:" + next.id, payload: { eventTitle: event.title, ticketToken: rawToken }, transaction });
          }
        }
      }
      return { registration: reg, refund };
    });
    res.json({ registration: ticketPayload(result.registration), refund: result.refund ? { id: result.refund.id, amountPaise: result.refund.amountPaise, status: result.refund.status } : null, message: result.refund ? "Registration cancelled; a full mock refund is pending. No real refund occurred." : "Registration cancelled" });
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
