const crypto = require("node:crypto");
const Payment = require("../models/Payment");

const DEFAULT_RESERVATION_MINUTES = 10;

function reservationMinutes() {
  const configured = Number(process.env.PAYMENT_RESERVATION_TTL_MINUTES || DEFAULT_RESERVATION_MINUTES);
  return Number.isInteger(configured) && configured > 0 ? configured : DEFAULT_RESERVATION_MINUTES;
}

function toPaise(price) {
  const text = String(price);
  const match = /^(0|[1-9]\d*)(?:\.(\d{1,2}))?$/.exec(text);
  if (!match) throw new Error("Ticket price must have no more than two decimal places");
  const paise = Number(match[1]) * 100 + Number((match[2] || "").padEnd(2, "0"));
  if (!Number.isSafeInteger(paise) || paise < 1) throw new Error("Paid ticket amount is invalid");
  return paise;
}

function isRefundWindowOpen(startDateTime, refundWindowHours, now = new Date()) {
  const hours = refundWindowHours == null ? 24 : Number(refundWindowHours);
  if (!Number.isInteger(hours) || hours < 0) throw new Error("Refund window must be a non-negative whole number of hours");
  const cutoff = new Date(startDateTime).getTime() - hours * 60 * 60 * 1000;
  return now.getTime() <= cutoff;
}

async function createPaymentAttempt({ registrationId, ticketPrice, paymentPurpose, transaction, now = new Date() }) {
  const ttlMs = reservationMinutes() * 60 * 1000;
  return Payment.create({
    registrationId,
    paymentPurpose,
    amountPaise: toPaise(ticketPrice),
    status: "PENDING",
    idempotencyKey: crypto.randomUUID(),
    adapter: "MOCK",
    expiresAt: new Date(now.getTime() + ttlMs),
  }, { transaction });
}

module.exports = { createPaymentAttempt, isRefundWindowOpen, reservationMinutes, toPaise };
