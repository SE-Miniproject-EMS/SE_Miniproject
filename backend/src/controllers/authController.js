const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { startSession } = require("../models/Session");
const { ApiError } = require("../middleware/errorHandler");
const {
  signAccessToken,
  verifyAccessToken,
  signEmailVerificationToken,
  verifyEmailVerificationToken,
} = require("../utils/jwt");
const {
  isValidEmail,
  isValidPassword,
  isValidName,
  isValidRole,
} = require("../utils/validators");

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes, per SRS REQ-3

// POST /api/auth/register  (SRS REQ-1)
async function register(req, res, next) {
  try {
    const { name, email, password, role } = req.body;

    if (!isValidName(name)) throw new ApiError(400, "INVALID_NAME", "Name must be at least 2 characters");
    if (!isValidEmail(email)) throw new ApiError(400, "INVALID_EMAIL", "A valid email address is required");
    if (!isValidPassword(password)) throw new ApiError(400, "INVALID_PASSWORD", "Password must be at least 8 characters");
    if (!isValidRole(role)) throw new ApiError(400, "INVALID_ROLE", "Role must be ATTENDEE or ORGANIZER");

    const existing = await User.findOne({ where: { email } });
    if (existing) throw new ApiError(409, "EMAIL_IN_USE", "An account with this email already exists");

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash, role });

    await issueVerificationLink(user);

    res.status(201).json({
      message: verificationMessage(),
      user: toPublicUser(user),
    });
  } catch (err) {
    next(err);
  }
}

function verificationMessage() {
  return process.env.NOTIFICATION_ADAPTER === "resend"
    ? "If this account needs verification, a link has been sent to its email address."
    : "If this account needs verification, a fresh link is available in the backend service logs. Search for Verification link.";
}

async function issueVerificationLink(user) {
  const token = signEmailVerificationToken(user);
  const origin = process.env.PUBLIC_API_URL || process.env.RENDER_EXTERNAL_URL || `http://localhost:${process.env.PORT || 5000}`;
  const link = origin + "/api/auth/verify/" + token;
  if (process.env.NOTIFICATION_ADAPTER === "resend") {
    const { createResendAdapter } = require("../services/notificationService");
    await createResendAdapter().send({
      to: user.email,
      subject: "Verify your Event Management System account",
      text: "Open this link to verify your account. It expires in 24 hours.\n\n" + link,
      html: '<p>Verify your Event Management System account. This link expires in 24 hours.</p><p><a href="' + link.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;") + '">Verify account</a></p>',
      idempotencyKey: "account-verification:" + user.id + ":" + Math.floor(Date.now() / 60000),
    });
  } else {
    console.log(`[DEV ONLY] Verification link for ${user.email}: ${link}`);
  }
}

async function resendVerification(req, res, next) {
  try {
    const { email } = req.body;
    if (!isValidEmail(email)) throw new ApiError(400, "INVALID_EMAIL", "Enter a valid email address.");
    const user = await User.findOne({ where: { email } });
    if (user && !user.isVerified) await issueVerificationLink(user);
    res.json({ message: verificationMessage() });
  } catch (error) { next(error); }
}

// GET /api/auth/verify/:token  (SRS REQ-2)
async function verifyEmail(req, res, next) {
  try {
    const { token } = req.params;
    let payload;
    try {
      payload = verifyEmailVerificationToken(token);
    } catch {
      throw new ApiError(400, "INVALID_TOKEN", "Verification link is invalid or expired");
    }

    const user = await User.findByPk(payload.sub);
    if (!user) throw new ApiError(404, "NOT_FOUND", "User not found");

    user.isVerified = true;
    await user.save();

    res.json({ message: "Email verified successfully", user: toPublicUser(user) });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/login  (SRS REQ-3)
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!isValidEmail(email) || typeof password !== "string") {
      throw new ApiError(400, "INVALID_CREDENTIALS", "Email and password are required");
    }

    const user = await User.findOne({ where: { email } });
    // Use the same error for "no such user" and "wrong password" so we
    // don't leak which emails are registered (basic account-enumeration defense).
    const genericError = new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password");

    if (!user) throw genericError;

    if (user.lockUntil && user.lockUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockUntil.getTime() - Date.now()) / 60000);
      throw new ApiError(423, "ACCOUNT_LOCKED", `Account locked. Try again in ${minutesLeft} minute(s).`);
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
      const failedAttempts = user.failedAttempts + 1;
      const shouldLock = failedAttempts >= MAX_FAILED_ATTEMPTS;

      user.failedAttempts = shouldLock ? 0 : failedAttempts;
      user.lockUntil = shouldLock ? new Date(Date.now() + LOCK_DURATION_MS) : null;
      await user.save();

      if (shouldLock) {
        throw new ApiError(423, "ACCOUNT_LOCKED", "Too many failed attempts. Account locked for 15 minutes.");
      }
      throw genericError;
    }

    if (!user.isVerified) {
      throw new ApiError(
        403,
        "EMAIL_NOT_VERIFIED",
        "Verify your email before signing in"
      );
    }

    // Successful login: reset failed-attempt counter
    user.failedAttempts = 0;
    user.lockUntil = null;
    await user.save();

    const token = signAccessToken(user);
    await startSession(verifyAccessToken(token));
    res.json({ token, user: toPublicUser(user) });
  } catch (err) {
    next(err);
  }
}

// GET /api/auth/me  (protected, example of `authenticate` middleware in use)
async function me(req, res, next) {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) throw new ApiError(404, "NOT_FOUND", "User not found");
    res.json({ user: toPublicUser(user) });
  } catch (err) {
    next(err);
  }
}

function toPublicUser(user) {
  // Never return passwordHash or lock/attempt counters to the client.
  const { id, name, email, role, isVerified, createdAt } = user;
  return { id, name, email, role, isVerified, createdAt };
}

module.exports = { register, resendVerification, verifyEmail, login, me };
