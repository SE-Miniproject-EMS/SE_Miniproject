require("dotenv").config();
const { Op } = require("sequelize");

function loadDependencies() {
  const sequelize = require("../config/db");
  const Event = require("../models/Event");
  const Registration = require("../models/Registration");
  require("../models/Notification");
  const notificationService = require("../services/notificationService");

  return {
    sequelize,
    Event,
    Registration,
    enqueue: notificationService.enqueue,
    dispatchPending: notificationService.dispatchPending,
    ensureNotificationSchema: notificationService.ensureNotificationSchema,
  };
}

/**
 * Queue and dispatch reminders for confirmed registrations in the 23–25 hour
 * window before a published event. Injected dependencies and clock make the
 * selection, deduplication and cleanup behavior testable without a real DB.
 */
async function runReminderJob({
  sequelize,
  Event,
  Registration,
  enqueue,
  dispatchPending,
  ensureNotificationSchema,
  logger = console,
  now = Date.now(),
}) {
  let queued = 0;

  try {
    await sequelize.authenticate();
    await sequelize.sync();
    await ensureNotificationSchema();

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

    for (const event of events) {
      const registrations = await Registration.findAll({
        where: { eventId: event.id, status: "CONFIRMED" },
      });

      for (const registration of registrations) {
        const notification = await enqueue({
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

        if (notification) queued++;
      }
    }

    const delivery = await dispatchPending();
    const result = { queued, delivery };
    logger.log(JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    logger.error("Reminder job failed:", error.message);
    throw error;
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  runReminderJob(loadDependencies()).catch(() => {
    process.exitCode = 1;
  });
}

module.exports = { loadDependencies, runReminderJob };
