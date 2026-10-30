require("dotenv").config();
const { Op } = require("sequelize");
const sequelize = require("../config/db");
const Event = require("../models/Event");
const Registration = require("../models/Registration");
require("../models/Notification");
const { enqueue, dispatchPending } = require("../services/notificationService");

(async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync();
    const now = Date.now();
    const events = await Event.findAll({ where: { status: "PUBLISHED", startDateTime: { [Op.between]: [new Date(now + 23 * 3600000), new Date(now + 25 * 3600000)] } } });
    let queued = 0;
    for (const event of events) {
      const regs = await Registration.findAll({ where: { eventId: event.id, status: "CONFIRMED" } });
      for (const reg of regs) {
        const item = await enqueue({ recipientId: reg.attendeeId, eventId: event.id, registrationId: reg.id, type: "EVENT_REMINDER", dedupeKey: `event-reminder-24h:${event.id}:${reg.id}`, payload: { title: event.title, startDateTime: event.startDateTime, venue: event.venue } });
        if (item) queued++;
      }
    }
    const delivery = await dispatchPending();
    console.log(JSON.stringify({ queued, delivery }, null, 2));
  } catch (error) {
    console.error("Reminder job failed:", error.message);
    process.exitCode = 1;
  } finally { await sequelize.close(); }
})();
