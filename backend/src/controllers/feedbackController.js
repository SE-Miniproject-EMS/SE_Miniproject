const { Op, fn, col } = require("sequelize");
const Event = require("../models/Event");
const Registration = require("../models/Registration");
const Feedback = require("../models/Feedback");
const { ApiError } = require("../middleware/errorHandler");

async function submitFeedback(req, res, next) {
  try {
    const eventId = Number(req.params.eventId);
    const { rating, comment = null } = req.body;
    if (!Number.isInteger(eventId) || eventId < 1) throw new ApiError(400, "INVALID_EVENT_ID", "Event ID must be a positive integer");
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new ApiError(400, "INVALID_RATING", "Rating must be an integer from 1 to 5");
    if (comment !== null && (typeof comment !== "string" || comment.length > 2000)) throw new ApiError(400, "INVALID_COMMENT", "Comment must be text of at most 2000 characters");
    const event = await Event.findByPk(eventId);
    if (!event) throw new ApiError(404, "EVENT_NOT_FOUND", "Event not found");
    if (new Date(event.endDateTime).getTime() > Date.now()) throw new ApiError(400, "EVENT_NOT_CONCLUDED", "Feedback is available after the event concludes");
    const registration = await Registration.findOne({ where: { eventId, attendeeId: req.user.id, status: "CONFIRMED", checkedInAt: { [Op.ne]: null } } });
    if (!registration) throw new ApiError(403, "FEEDBACK_NOT_ELIGIBLE", "Only checked-in attendees may review this event");
    const feedback = await Feedback.create({ eventId, attendeeId: req.user.id, rating, comment: comment?.trim() || null });
    res.status(201).json({ feedback });
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") return next(new ApiError(409, "FEEDBACK_ALREADY_SUBMITTED", "You have already submitted feedback for this event"));
    next(err);
  }
}

async function eventFeedback(req, res, next) {
  try {
    const eventId = Number(req.params.eventId);
    const event = await Event.findByPk(eventId);
    if (!event) throw new ApiError(404, "EVENT_NOT_FOUND", "Event not found");
    if (req.user.role !== "ADMIN" && (req.user.role !== "ORGANIZER" || Number(event.organizerId) !== Number(req.user.id))) throw new ApiError(403, "FORBIDDEN", "Only the event organizer or an admin may view feedback");
    const feedback = await Feedback.findAll({ where: { eventId }, attributes: ["id", "attendeeId", "rating", "comment", "createdAt"], order: [["createdAt", "DESC"]] });
    const aggregate = await Feedback.findOne({ where: { eventId }, attributes: [[fn("COUNT", col("id")), "count"], [fn("AVG", col("rating")), "averageRating"]], raw: true });
    res.json({ eventId, aggregate: { count: Number(aggregate.count), averageRating: aggregate.averageRating === null ? null : Number(Number(aggregate.averageRating).toFixed(2)) }, feedback });
  } catch (err) { next(err); }
}
module.exports = { submitFeedback, eventFeedback };
