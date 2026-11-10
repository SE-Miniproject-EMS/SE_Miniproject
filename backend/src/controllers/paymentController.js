const { ApiError } = require("../middleware/errorHandler");
const {
  retryCheckout,
  simulatePaymentOutcome,
  simulateRefundOutcome,
} = require("../services/registrationPaymentService");

function positiveId(value, label) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) throw new ApiError(400, "INVALID_ID", label + " must be a positive integer");
  return id;
}

async function mockPaymentOutcome(req, res, next) {
  try {
    const paymentId = positiveId(req.params.paymentId, "Payment ID");
    const result = await simulatePaymentOutcome(paymentId, req.user.id, req.body?.outcome);
    res.json({
      payment: {
        id: result.payment.id,
        status: result.payment.status,
        paymentPurpose: result.payment.paymentPurpose,
        amountPaise: result.payment.amountPaise,
      },
      registration: { id: result.registration.id, status: result.registration.status },
      refund: result.refund ? { id: result.refund.id, status: result.refund.status, amountPaise: result.refund.amountPaise } : null,
      ticketToken: result.ticketToken || null,
      adapter: "MOCK",
      simulated: true,
      message: result.message,
    });
  } catch (error) { next(error); }
}

async function retryPayment(req, res, next) {
  try {
    const registrationId = positiveId(req.params.registrationId, "Registration ID");
    const result = await retryCheckout(registrationId, req.user.id);
    res.status(201).json({
      registration: { id: result.registration.id, eventId: result.registration.eventId, status: result.registration.status },
      payment: {
        id: result.payment.id,
        status: result.payment.status,
        paymentPurpose: result.payment.paymentPurpose,
        amountPaise: result.payment.amountPaise,
        expiresAt: result.payment.expiresAt,
        adapter: "MOCK",
      },
      simulated: true,
      message: "Retry checkout created with the mock adapter; no real payment was processed.",
    });
  } catch (error) { next(error); }
}

async function mockRefundOutcome(req, res, next) {
  try {
    const paymentId = positiveId(req.params.paymentId, "Payment ID");
    const result = await simulateRefundOutcome(paymentId, req.user.id, req.body?.outcome);
    res.json({
      refund: { id: result.refund.id, status: result.refund.status, amountPaise: result.refund.amountPaise },
      adapter: "MOCK",
      simulated: true,
      message: result.message,
    });
  } catch (error) { next(error); }
}

module.exports = { mockPaymentOutcome, mockRefundOutcome, retryPayment };
