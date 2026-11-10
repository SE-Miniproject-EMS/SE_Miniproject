const assert = require("node:assert/strict");
const { test } = require("node:test");
const jwt = require("jsonwebtoken");
const { signAccessToken, verifyAccessToken } = require("../src/utils/jwt");

test("access token uses the configured absolute lifetime and rejects expiry", (t) => {
  process.env.JWT_SECRET = "test-only-signing-key";
  process.env.JWT_EXPIRES_IN = "10m";
  t.mock.method(Date, "now", () => 1_800_000_000_000);

  const token = signAccessToken({ id: 1, role: "ATTENDEE", email: "test@example.com" });
  const claims = verifyAccessToken(token);
  assert.equal(claims.exp - claims.iat, 600);

  Date.now.mock.mockImplementation(() => (claims.exp - 1) * 1000);
  assert.equal(verifyAccessToken(token).sub, 1);
  Date.now.mock.mockImplementation(() => claims.exp * 1000);
  assert.throws(() => verifyAccessToken(token), jwt.TokenExpiredError);
});
