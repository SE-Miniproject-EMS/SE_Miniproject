const { randomUUID } = require("node:crypto");
const jwt = require("jsonwebtoken");

function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { jwtid: randomUUID(), expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

function signEmailVerificationToken(user) {
  return jwt.sign(
    { sub: user.id, purpose: "email_verification" },
    process.env.EMAIL_VERIFICATION_SECRET,
    { expiresIn: "1d" }
  );
}

function verifyEmailVerificationToken(token) {
  return jwt.verify(token, process.env.EMAIL_VERIFICATION_SECRET);
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
  signEmailVerificationToken,
  verifyEmailVerificationToken,
};
