const { Op } = require("sequelize");
const Event = require("../models/Event");
const Registration = require("../models/Registration");
const { enqueue, dispatchPending } = require("../services/notificationService");
const { ApiError } = require("../middleware/errorHandler");

async function runReminders(req, res, next) {
  try {
    if (req.user.role !== "ADMIN") throw new ApiError(403, "FORBIDDEN", "Only an admin may run the reminder job");
    const now = new Date();
    const from = new Date(now.getTime() + 23 * 3600000);
    const to = new Date(now.getTime() + 25 * 3600000);
    const events = await Event.findAll({ where: { status: "PUBLISHED", startDateTime: { [Op.between]: [from, to] } } });
    let queued = 0;
    for (const event of events) {
      const registrations = await Registration.findAll({ where: { eventId: event.id, status: "CONFIRMED" } });
      for (const reg of registrations) {
        const item = await enqueue({ recipientId: reg.attendeeId, eventId: event.id, registrationId: reg.id, type: "EVENT_REMINDER", dedupeKey: `event-reminder-24h:${event.id}:${reg.id}`, payload: { title: event.title, startDateTime: event.startDateTime, venue: event.venue } });
        if (item) queued++;
      }
    }
    const delivery = await dispatchPending();
    res.json({ queued, delivery, note: "Reminder job ran. Configure a production email/SMS provider before claiming real delivery." });
  } catch (err) { next(err); }
}
module.exports = { runReminders };
