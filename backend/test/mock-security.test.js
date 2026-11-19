const assert = require("node:assert/strict");
const { test } = require("node:test");
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const { paymentOutcome, refundOutcome } = require("../src/services/mockPaymentAdapter");

test("mock adapters reject unsupported outcomes instead of inventing success", () => {
  for (const value of [undefined, "", "PAID", "COMPLETED", "<script>", {}]) {
    assert.throws(() => paymentOutcome(value), /must be SUCCESS, FAILURE, or PENDING/);
    assert.throws(() => refundOutcome(value), /must be SUCCESS, FAILURE, or PENDING/);
  }
});

test("production blocks mock checkout, retry, payment and refund simulation before database access", () => {
  const script = `
    const assert = require('node:assert/strict');
    const service = require('./src/services/registrationPaymentService');
    assert.throws(() => service.assertMockAdapterEnabled(), error => error.status === 404);
    (async () => {
      for (const action of [
        () => service.retryCheckout(1, 1),
        () => service.simulatePaymentOutcome(1, 1, 'SUCCESS'),
        () => service.simulateRefundOutcome(1, 1, 'SUCCESS')
      ]) await assert.rejects(action, error => error.status === 404);
    })().catch(() => { process.exitCode = 1; });
  `;
  const result = spawnSync(process.execPath, ["-e", script], {
    cwd: path.resolve(__dirname, ".."),
    env: { ...process.env, NODE_ENV: "production", DATABASE_URL: "", DATABASE_FILE: ":memory:" },
    encoding: "utf8",
    timeout: 10000,
  });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
