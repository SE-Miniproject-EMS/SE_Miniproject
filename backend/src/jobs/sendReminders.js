require("dotenv").config();

const { Op } = require("sequelize");
const sequelize = require("../config/db");
const Event = require("../models/Event");
const Registration = require("../models/Registration");
require("../models/Notification");

const { enqueue, dispatchPending } = require("../services/notificationService");

let isRunning = false;

async function runReminderJob() {
  if (isRunning) {
    console.log("[Reminders] Previous reminder job is still running. Skipping.");
    return;
  }

  isRunning = true;

  try {
    await require("../services/notificationService").ensureNotificationSchema();

    const now = Date.now();

    const events = await Event.findAll({
      where: {
        status: "PUBLISHED",
        startDateTime: {
          [Op.between]: [
            new Date(now + 23 * 3600000),
            new Date(now + 25 * 3600000),
          ],
        },
      },
    });

    let queued = 0;

    for (const event of events) {
      const registrations = await Registration.findAll({
        where: {
          eventId: event.id,
          status: "CONFIRMED",
        },
      });

      for (const registration of registrations) {
        const item = await enqueue({
          recipientId: registration.attendeeId,
          eventId: event.id,
          registrationId: registration.id,
          type: "EVENT_REMINDER",
          dedupeKey: `event-reminder-24h:${event.id}:${registration.id}`,
          payload: {
            title: event.title,
            startDateTime: event.startDateTime,
            venue: event.venue,
          },
        });

        if (item) queued++;
      }
    }

    const delivery = await dispatchPending();

    console.log("[Reminders]", JSON.stringify({
      checkedAt: new Date().toISOString(),
      eventsFound: events.length,
      queued,
      delivery,
    }, null, 2));

    return { eventsFound: events.length, queued, delivery };
  } finally {
    isRunning = false;
  }
}

// Preserve the existing `npm run reminders` command.
if (require.main === module) {
  (async () => {
    try {
      await sequelize.authenticate();
      await sequelize.sync();
      await runReminderJob();
    } catch (error) {
      console.error("[Reminders] Job failed:", error);
      process.exitCode = 1;
    } finally {
      await sequelize.close();
    }
  })();
}

module.exports = { runReminderJob };
