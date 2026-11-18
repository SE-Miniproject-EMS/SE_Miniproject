const express = require("express");
const { authenticate, authorize } = require("../middleware/auth");
const { runReminders, dispatchNotifications } = require("../controllers/notificationController");
const router = express.Router();
router.post("/jobs/reminders", authenticate, authorize("ADMIN"), runReminders);
router.post("/jobs/dispatch", authenticate, authorize("ADMIN"), dispatchNotifications);
module.exports = router;
