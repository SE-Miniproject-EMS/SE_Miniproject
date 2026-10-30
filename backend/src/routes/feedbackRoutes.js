const express = require("express");
const { authenticate, authorize } = require("../middleware/auth");
const { submitFeedback, eventFeedback } = require("../controllers/feedbackController");
const router = express.Router();
router.post("/events/:eventId", authenticate, authorize("ATTENDEE"), submitFeedback);
router.get("/events/:eventId", authenticate, authorize("ORGANIZER", "ADMIN"), eventFeedback);
module.exports = router;
