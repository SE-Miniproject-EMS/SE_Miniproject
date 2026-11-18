require("dotenv").config();
const sequelize = require("../config/db");
require("../models/User");
require("../models/Event");
require("../models/Registration");
require("../models/Notification");
const { ensureNotificationSchema, dispatchPending } = require("../services/notificationService");

(async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync();
    await ensureNotificationSchema();
    const result = await dispatchPending(Number(process.env.NOTIFICATION_BATCH_SIZE || 50));
    console.log(JSON.stringify({ processed: result.length, result }, null, 2));
    if (result.some((item) => item.status === "FAILED")) process.exitCode = 1;
  } catch (error) {
    console.error("Notification dispatch failed:", error.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
})();
