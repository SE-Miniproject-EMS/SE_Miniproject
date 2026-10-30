const express = require("express");
const { authenticate, authorize } = require("../middleware/auth");
const { runReminders } = require("../controllers/notificationController");
const router = express.Router();
router.post("/jobs/reminders", authenticate, authorize("ADMIN"), runReminders);
module.exports = router;
