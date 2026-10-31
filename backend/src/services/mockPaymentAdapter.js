const PAYMENT_OUTCOMES = new Set(["SUCCESS", "FAILURE", "PENDING"]);
const REFUND_OUTCOMES = new Set(["SUCCESS", "FAILURE", "PENDING"]);

function paymentOutcome(value) {
  const normalized = String(value || "").toUpperCase();
  if (!PAYMENT_OUTCOMES.has(normalized)) throw new Error("Mock payment outcome must be SUCCESS, FAILURE, or PENDING");
  return normalized;
}

function refundOutcome(value) {
  const normalized = String(value || "").toUpperCase();
  if (!REFUND_OUTCOMES.has(normalized)) throw new Error("Mock refund outcome must be SUCCESS, FAILURE, or PENDING");
  return normalized;
}

module.exports = { paymentOutcome, refundOutcome };
