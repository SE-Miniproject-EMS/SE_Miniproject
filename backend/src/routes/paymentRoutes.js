const express = require("express");
const { authenticate, authorize } = require("../middleware/auth");
const { mockPaymentOutcome, mockRefundOutcome } = require("../controllers/paymentController");

const router = express.Router();
router.use(authenticate, authorize("ATTENDEE"));
router.post("/:paymentId/mock-outcome", mockPaymentOutcome);
router.post("/:paymentId/mock-refund-outcome", mockRefundOutcome);

module.exports = router;
