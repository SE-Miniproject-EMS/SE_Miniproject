const express = require("express");
const rateLimit = require("express-rate-limit");
const { register, resendVerification, verifyEmail, login, me } = require("../controllers/authController");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

// Basic brute-force / DoS mitigation on the login endpoint (NFR-Sec-2 in the Test Plan).
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "RATE_LIMITED", message: "Too many login attempts. Please try again later." } },
});

const verificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: true, legacyHeaders: false,
  message: { error: { code: "RATE_LIMITED", message: "Please wait before requesting another verification link." } },
});
router.post("/resend-verification", verificationLimiter, resendVerification);
router.post("/register", register);
router.get("/verify/:token", verifyEmail);
router.post("/login", loginLimiter, login);
router.get("/me", authenticate, me);

module.exports = router;
