require("dotenv").config();

function loadDependencies() {
  const sequelize = require("../config/db");
  require("../models/User");
  require("../models/Event");
  require("../models/Registration");
  require("../models/Notification");
  const { ensureNotificationSchema, dispatchPending } = require("../services/notificationService");
  return { sequelize, ensureNotificationSchema, dispatchPending };
}

/**
 * Dispatch queued event notifications. Dependencies, batch size and process
 * exit handling are injectable so the worker can be tested without a DB or
 * external mail provider.
 */
async function runDispatchJob({
  sequelize,
  ensureNotificationSchema,
  dispatchPending,
  batchSize = Number(process.env.NOTIFICATION_BATCH_SIZE || 50),
  logger = console,
  setExitCode = (code) => { process.exitCode = code; },
}) {
  try {
    await sequelize.authenticate();
    await sequelize.sync();
    await ensureNotificationSchema();

    const result = await dispatchPending(batchSize);
    const summary = { processed: result.length, result };
    logger.log(JSON.stringify(summary, null, 2));

    if (result.some((item) => item.status === "FAILED")) setExitCode(1);
    return summary;
  } catch (error) {
    logger.error("Notification dispatch failed:", error.message);
    setExitCode(1);
    throw error;
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  runDispatchJob(loadDependencies()).catch(() => {
    // runDispatchJob has already set a non-zero exit code and logged the error.
  });
}

module.exports = { loadDependencies, runDispatchJob };
