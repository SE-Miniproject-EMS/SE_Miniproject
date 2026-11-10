const crypto = require("node:crypto");
const { Op, literal, Transaction } = require("sequelize");
const sequelize = require("../config/db");
const Event = require("../models/Event");
const Registration = require("../models/Registration");
const Payment = require("../models/Payment");
const Refund = require("../models/Refund");
const { enqueue } = require("./notificationService");
const { createPaymentAttempt } = require("./paymentService");
const mockAdapter = require("./mockPaymentAdapter");
const { ApiError } = require("../middleware/errorHandler");

const digest = (value) => crypto.createHash("sha256").update(value).digest("hex");
const activeRefundStatuses = ["PENDING", "FAILED"];

function mockOnly() {
  if (process.env.NODE_ENV === "production") {
    throw new ApiError(404, "NOT_FOUND", "Route not found");
  }
}

function assertMockAdapterEnabled() { mockOnly(); }


async function hasUnresolvedRefund(registrationId, transaction) {
  const refund = await Refund.findOne({
    where: { status: { [Op.in]: activeRefundStatuses } },
    include: [{
      model: Payment,
      as: "payment",
      where: { registrationId },
      attributes: [],
    }],
    transaction,
  });
  return Boolean(refund);
}

async function nextQueueTime(eventId, transaction, now = new Date()) {
  const last = await Registration.findOne({
    where: { eventId, status: "WAITLISTED" },
    order: [["waitlistPositionAt", "DESC"], ["id", "DESC"]],
    transaction,
  });
  const lastTime = last?.waitlistPositionAt ? new Date(last.waitlistPositionAt).getTime() : 0;
  return new Date(Math.max(now.getTime(), lastTime + 1));
}

async function reserveOneSeat(eventId, capacity, transaction) {
  const [claimed] = await Event.update({ seatsTaken: literal('"seatsTaken" + 1') }, {
    where: { id: eventId, status: "PUBLISHED", seatsTaken: { [Op.lt]: capacity } },
    transaction,
  });
  return claimed === 1;
}

async function releaseOneSeat(eventId, transaction) {
  const [released] = await Event.update({
    seatsTaken: literal('CASE WHEN "seatsTaken" > 0 THEN "seatsTaken" - 1 ELSE 0 END'),
  }, {
    where: { id: eventId, seatsTaken: { [Op.gt]: 0 } },
    transaction,
  });
  if (released !== 1) throw new Error("Capacity invariant failed while releasing a payment reservation");
}

async function createRefund(payment, transaction) {
  const [refund] = await Refund.findOrCreate({
    where: { paymentId: payment.id },
    defaults: {
      amountPaise: payment.amountPaise,
      status: "PENDING",
      idempotencyKey: "refund:" + payment.id,
    },
    transaction,
  });
  return refund;
}

async function offerNextWaitlistInTransaction(eventId, transaction, now = new Date(), excludedRegistrationId = null) {
  const event = await Event.findByPk(eventId, { transaction });
  if (!event || event.status !== "PUBLISHED" || new Date(event.endDateTime).getTime() <= now.getTime()) return null;

  const candidates = await Registration.findAll({
    where: { eventId, status: "WAITLISTED" },
    order: [["waitlistPositionAt", "ASC"], ["id", "ASC"]],
    transaction,
  });

  for (const candidate of candidates) {
    if (candidate.id === excludedRegistrationId) continue;
    if (await hasUnresolvedRefund(candidate.id, transaction)) continue;
    if (!(await reserveOneSeat(event.id, event.capacity, transaction))) return null;

    const [offered] = await Registration.update({ status: "PENDING_PAYMENT" }, {
      where: { id: candidate.id, status: "WAITLISTED" },
      transaction,
    });
    if (offered !== 1) {
      await releaseOneSeat(event.id, transaction);
      continue;
    }
    const payment = await createPaymentAttempt({
      registrationId: candidate.id,
      ticketPrice: event.ticketPrice,
      paymentPurpose: "WAITLIST_OFFER",
      transaction,
      now,
    });
    await enqueue({
      recipientId: candidate.attendeeId,
      eventId: event.id,
      registrationId: candidate.id,
      type: "WAITLIST_PAYMENT_OFFER",
      dedupeKey: "waitlist-payment-offer:" + payment.id,
      payload: {
        eventTitle: event.title,
        expiresAt: payment.expiresAt,
        mockPayment: true,
        message: "Mock payment offer; no real payment was processed.",
      },
      transaction,
    });
    return { registration: candidate, payment };
  }
  return null;
}

async function expirePendingInTransaction(payment, transaction, now = new Date()) {
  const [expired] = await Payment.update({ status: "EXPIRED" }, {
    where: { id: payment.id, status: "PENDING", expiresAt: { [Op.lte]: now } },
    transaction,
  });
  if (expired !== 1) return false;

  const registration = await Registration.findByPk(payment.registrationId, { transaction });
  if (!registration || registration.status !== "PENDING_PAYMENT") throw new Error("Pending payment has no active registration reservation");
  const event = await Event.findByPk(registration.eventId, { transaction });
  if (!event) throw new Error("Payment event not found");
  await releaseOneSeat(event.id, transaction);

  if (payment.paymentPurpose === "WAITLIST_OFFER") {
    const waitlistPositionAt = await nextQueueTime(event.id, transaction, now);
    const [requeued] = await Registration.update(
      { status: "WAITLISTED", waitlistPositionAt },
      { where: { id: registration.id, status: "PENDING_PAYMENT" }, transaction },
    );
    if (requeued !== 1) throw new Error("Waitlist offer state changed during expiry");
    await offerNextWaitlistInTransaction(event.id, transaction, now, registration.id);
  } else {
    const [required] = await Registration.update(
      { status: "PAYMENT_REQUIRED" },
      { where: { id: registration.id, status: "PENDING_PAYMENT" }, transaction },
    );
    if (required !== 1) throw new Error("Initial checkout state changed during expiry");
    await offerNextWaitlistInTransaction(event.id, transaction, now);
  }
  return true;
}

async function expirePayment(paymentId, now = new Date()) {
  return sequelize.transaction({ type: Transaction.TYPES.IMMEDIATE }, async (transaction) => {
    const payment = await Payment.findByPk(paymentId, { transaction });
    if (!payment || payment.status !== "PENDING" || new Date(payment.expiresAt).getTime() > now.getTime()) return false;
    return expirePendingInTransaction(payment, transaction, now);
  });
}

async function processExpiredPayments(now = new Date()) {
  const due = await Payment.findAll({
    where: { status: "PENDING", expiresAt: { [Op.lte]: now } },
    attributes: ["id"],
    order: [["expiresAt", "ASC"], ["id", "ASC"]],
  });
  let processed = 0;
  for (const item of due) if (await expirePayment(item.id, now)) processed += 1;
  return processed;
}

async function simulatePaymentOutcome(paymentId, attendeeId, outcomeValue, now = new Date()) {
  mockOnly();
  let outcome;
  try { outcome = mockAdapter.paymentOutcome(outcomeValue); }
  catch (error) { throw new ApiError(400, "INVALID_MOCK_OUTCOME", error.message); }

  return sequelize.transaction({ type: Transaction.TYPES.IMMEDIATE }, async (transaction) => {
    let payment = await Payment.findByPk(paymentId, { transaction });
    if (!payment) throw new ApiError(404, "PAYMENT_NOT_FOUND", "Payment not found");
    let registration = await Registration.findByPk(payment.registrationId, { transaction });
    if (!registration) throw new ApiError(404, "REGISTRATION_NOT_FOUND", "Registration not found");
    if (Number(registration.attendeeId) !== Number(attendeeId)) throw new ApiError(403, "FORBIDDEN", "This payment belongs to another attendee");

    if (payment.status === "PENDING" && new Date(payment.expiresAt).getTime() <= now.getTime()) {
      await expirePendingInTransaction(payment, transaction, now);
      payment = await Payment.findByPk(payment.id, { transaction });
      registration = await Registration.findByPk(payment.registrationId, { transaction });
    }

    if (outcome === "PENDING") {
      return { payment, registration, refund: null, message: "Mock payment remains pending; no real payment was processed." };
    }

    if (outcome === "SUCCESS" && payment.status === "EXPIRED") {
      const [late] = await Payment.update({ status: "LATE_SUCCEEDED", capturedAt: now }, {
        where: { id: payment.id, status: "EXPIRED" },
        transaction,
      });
      if (late === 1) await createRefund({ ...payment.toJSON(), status: "LATE_SUCCEEDED" }, transaction);
      const refund = await Refund.findOne({ where: { paymentId: payment.id }, transaction });
      payment = await Payment.findByPk(payment.id, { transaction });
      return { payment, registration, refund, message: "Late mock payment recorded; refund is pending. No real payment or refund occurred." };
    }

    if (outcome === "SUCCESS" && payment.status === "PENDING") {
      const [confirmedPayment] = await Payment.update({ status: "SUCCEEDED", capturedAt: now }, {
        where: { id: payment.id, status: "PENDING", expiresAt: { [Op.gt]: now } },
        transaction,
      });
      if (confirmedPayment === 1) {
        const rawToken = crypto.randomBytes(32).toString("base64url");
        const [confirmedRegistration] = await Registration.update({
          status: "CONFIRMED",
          ticketTokenHash: digest(rawToken),
        }, {
          where: { id: registration.id, status: "PENDING_PAYMENT" },
          transaction,
        });
        if (confirmedRegistration !== 1) throw new Error("Payment succeeded without an active registration");
        await enqueue({
          recipientId: registration.attendeeId,
          eventId: registration.eventId,
          registrationId: registration.id,
          type: "REGISTRATION_CONFIRMED",
          dedupeKey: "registration-confirmed:" + registration.id,
          payload: { mockPayment: true, message: "Mock payment confirmation; no real payment was processed." },
          transaction,
        });
        payment = await Payment.findByPk(payment.id, { transaction });
        registration = await Registration.findByPk(registration.id, { transaction });
        return { payment, registration, refund: null, ticketToken: rawToken, message: "Mock payment simulated as successful; no real payment was processed." };
      }
      payment = await Payment.findByPk(payment.id, { transaction });
    }

    if (outcome === "FAILURE" && payment.status === "PENDING") {
      const [failed] = await Payment.update({ status: "FAILED" }, {
        where: { id: payment.id, status: "PENDING", expiresAt: { [Op.gt]: now } },
        transaction,
      });
      if (failed === 1) {
        const [released] = await Event.update({
          seatsTaken: literal('CASE WHEN "seatsTaken" > 0 THEN "seatsTaken" - 1 ELSE 0 END'),
        }, {
          where: { id: registration.eventId, seatsTaken: { [Op.gt]: 0 } },
          transaction,
        });
        if (released !== 1) throw new Error("Capacity invariant failed while releasing failed checkout");
        if (payment.paymentPurpose === "WAITLIST_OFFER") {
          const waitlistPositionAt = await nextQueueTime(registration.eventId, transaction, now);
          const [requeued] = await Registration.update(
            { status: "WAITLISTED", waitlistPositionAt },
            { where: { id: registration.id, status: "PENDING_PAYMENT" }, transaction },
          );
          if (requeued !== 1) throw new Error("Waitlist offer state changed during failure");
          await offerNextWaitlistInTransaction(registration.eventId, transaction, now, registration.id);
        } else {
          const [required] = await Registration.update(
            { status: "PAYMENT_REQUIRED" },
            { where: { id: registration.id, status: "PENDING_PAYMENT" },
              transaction,
            },
          );
          if (required !== 1) throw new Error("Initial checkout state changed during failure");
          await offerNextWaitlistInTransaction(registration.eventId, transaction, now);
        }
      }
      payment = await Payment.findByPk(payment.id, { transaction });
      registration = await Registration.findByPk(registration.id, { transaction });
      return { payment, registration, refund: null, message: "Mock payment failed; no real payment was processed." };
    }

    return { payment, registration, refund: null, message: "Mock payment outcome recorded as " + payment.status + "; no real payment was processed." };
  });
}

async function retryCheckout(registrationId, attendeeId, now = new Date()) {
  mockOnly();
  return sequelize.transaction({ type: Transaction.TYPES.IMMEDIATE }, async (transaction) => {
    const registration = await Registration.findByPk(registrationId, { transaction });
    if (!registration) throw new ApiError(404, "REGISTRATION_NOT_FOUND", "Registration not found");
    if (Number(registration.attendeeId) !== Number(attendeeId)) throw new ApiError(403, "FORBIDDEN", "You may only retry your own checkout");
    if (registration.status !== "PAYMENT_REQUIRED") throw new ApiError(409, "CHECKOUT_NOT_RETRYABLE", "This registration does not need payment retry");
    if (await hasUnresolvedRefund(registration.id, transaction)) throw new ApiError(409, "REFUND_PENDING", "Resolve the previous refund before retrying payment");

    const event = await Event.findByPk(registration.eventId, { transaction });
    if (!event || event.status !== "PUBLISHED" || new Date(event.endDateTime).getTime() <= now.getTime()) throw new ApiError(409, "EVENT_UNAVAILABLE", "This event is not accepting payment retries");
    const waitlisted = await Registration.count({ where: { eventId: event.id, status: "WAITLISTED" }, transaction });
    if (waitlisted > 0) throw new ApiError(409, "FIFO_WAITLIST_PRIORITY", "A waitlisted attendee has priority for the next seat");
    if (!(await reserveOneSeat(event.id, event.capacity, transaction))) throw new ApiError(409, "CAPACITY_UNAVAILABLE", "No seat is currently available; no payment was started");

    const [updated] = await Registration.update({ status: "PENDING_PAYMENT" }, {
      where: { id: registration.id, status: "PAYMENT_REQUIRED" },
      transaction,
    });
    if (updated !== 1) throw new ApiError(409, "CHECKOUT_NOT_RETRYABLE", "This registration changed before retry could start");
    const payment = await createPaymentAttempt({
      registrationId: registration.id,
      ticketPrice: event.ticketPrice,
      paymentPurpose: "INITIAL_CHECKOUT",
      transaction,
      now,
    });
    return { registration: await Registration.findByPk(registration.id, { transaction }), payment };
  });
}

async function simulateRefundOutcome(paymentId, attendeeId, outcomeValue) {
  mockOnly();
  let outcome;
  try { outcome = mockAdapter.refundOutcome(outcomeValue); }
  catch (error) { throw new ApiError(400, "INVALID_MOCK_OUTCOME", error.message); }

  return sequelize.transaction({ type: Transaction.TYPES.IMMEDIATE }, async (transaction) => {
    const payment = await Payment.findByPk(paymentId, {
      include: [{ model: Registration, as: "registration" }],
      transaction,
    });
    if (!payment) throw new ApiError(404, "PAYMENT_NOT_FOUND", "Payment not found");
    if (Number(payment.registration.attendeeId) !== Number(attendeeId)) throw new ApiError(403, "FORBIDDEN", "This payment belongs to another attendee");
    const refund = await Refund.findOne({ where: { paymentId }, transaction });
    if (!refund) throw new ApiError(404, "REFUND_NOT_FOUND", "No refund is pending for this payment");

    if (outcome === "PENDING") return { refund, message: "Mock refund remains pending; no real refund occurred." };
    if (outcome === "FAILURE" && refund.status === "PENDING") {
      await refund.update({ status: "FAILED" }, { transaction });
    }
    let resolvedNow = false;
    if (outcome === "SUCCESS" && ["PENDING", "FAILED"].includes(refund.status)) {
      await refund.update({ status: "SIMULATED", adapterReference: "mock-refund-" + refund.id }, { transaction });
      resolvedNow = true;
    }
    if (resolvedNow && payment.registration.status === "WAITLISTED") {
      await offerNextWaitlistInTransaction(payment.registration.eventId, transaction);
    }
    return {
      refund,
      message: refund.status === "SIMULATED"
        ? "Mock refund simulated; no real refund occurred."
        : "Mock refund status: " + refund.status + "; no real refund occurred.",
    };
  });
}

module.exports = {
  assertMockAdapterEnabled,
  createRefund,
  expirePayment,
  offerNextWaitlistInTransaction,
  processExpiredPayments,
  retryCheckout,
  simulatePaymentOutcome,
  simulateRefundOutcome,
};
