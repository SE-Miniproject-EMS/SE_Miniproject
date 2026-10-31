const assert = require("node:assert/strict");
const { test } = require("node:test");
const { isRefundWindowOpen, toPaise } = require("../src/services/paymentService");

test("ticket prices convert to exact integer paise", () => {
  assert.equal(toPaise("10"), 1000);
  assert.equal(toPaise("10.5"), 1050);
  assert.equal(toPaise("10.05"), 1005);
});

test("ticket prices with fractional paise are rejected", () => {
  assert.throws(() => toPaise("10.001"), /two decimal places/);
});

test("24-hour default refund cutoff allows before and exactly at cutoff only", () => {
  const start = new Date("2026-12-01T12:00:00.000Z");
  const cutoff = new Date("2026-11-30T12:00:00.000Z");
  assert.equal(isRefundWindowOpen(start, null, new Date(cutoff.getTime() - 1)), true);
  assert.equal(isRefundWindowOpen(start, null, cutoff), true);
  assert.equal(isRefundWindowOpen(start, null, new Date(cutoff.getTime() + 1)), false);
});

test("zero-hour refund window allows through event start", () => {
  const start = new Date("2026-12-01T12:00:00.000Z");
  assert.equal(isRefundWindowOpen(start, 0, new Date(start.getTime() - 1)), true);
  assert.equal(isRefundWindowOpen(start, 0, start), true);
  assert.equal(isRefundWindowOpen(start, 0, new Date(start.getTime() + 1)), false);
});
