const Notification = require("../models/Notification");
const { Op } = require("sequelize");
const User = require("../models/User");
const Event = require("../models/Event");

async function enqueue({ recipientId, eventId, registrationId = null, type, dedupeKey, payload, transaction }) {
  try {
    return await Notification.create({ recipientId, eventId, registrationId, type, dedupeKey, payload: JSON.stringify(payload) }, { transaction });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") return null;
    throw error;
  }
}

// Provider seam: set NOTIFICATION_ADAPTER=console for development. No email/SMS
// is claimed to have been delivered; production needs a real provider adapter.
async function dispatchPending(limit = 50) {
  const rows = await Notification.findAll({ where: { [Op.or]: [{ status: "PENDING" }, { status: "FAILED", attempts: { [Op.lt]: 3 } }] }, order: [["createdAt", "ASC"]], limit });
  const results = [];
  for (const row of rows) {
    try {
      const user = await User.findByPk(row.recipientId);
      const event = await Event.findByPk(row.eventId);
      if (!user || !event) throw new Error("Notification recipient or event no longer exists");
      if (process.env.NOTIFICATION_ADAPTER !== "console" && process.env.NODE_ENV === "production") {
        throw new Error("No production notification provider configured");
      }
      console.log(`[EMS NOTIFICATION TEST-DELIVERY] to=${user.email} type=${row.type} event=${event.title} payload=${row.payload}`);
      await row.update({ status: "SENT", attempts: row.attempts + 1, sentAt: new Date(), lastError: null });
      results.push({ id: row.id, status: "SENT" });
    } catch (error) {
      await row.update({ status: "FAILED", attempts: row.attempts + 1, lastError: String(error.message).slice(0, 500) });
      results.push({ id: row.id, status: "FAILED" });
    }
  }
  return results;
}

async function queueEventNotice(event, type) {
  const regs = await require("../models/Registration").findAll({ where: { eventId: event.id, status: "CONFIRMED" } });
  for (const reg of regs) await enqueue({ recipientId: reg.attendeeId, eventId: event.id, registrationId: reg.id, type, dedupeKey: `${type}:${event.id}:${reg.id}:${event.updatedAt.getTime()}`, payload: { title: event.title, startDateTime: event.startDateTime, endDateTime: event.endDateTime, venue: event.venue } });
}

module.exports = { enqueue, dispatchPending, queueEventNotice };
