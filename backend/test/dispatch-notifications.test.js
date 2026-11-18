const assert = require("node:assert/strict");
const { test } = require("node:test");
const { loadDependencies, runDispatchJob } = require("../src/jobs/dispatchNotifications");

function createLogger() {
  return {
    messages: [],
    errors: [],
    log(message) { this.messages.push(message); },
    error(...args) { this.errors.push(args); },
  };
}

function createDatabase(calls, authenticate = async () => {}) {
  return {
    async authenticate() { calls.push("authenticate"); await authenticate(); },
    async sync() { calls.push("sync"); },
    async close() { calls.push("close"); },
  };
}

test("initializes the schema and dispatches a bounded batch", async () => {
  const calls = [];
  const logger = createLogger();
  const exitCodes = [];
  let receivedBatchSize;

  const result = await runDispatchJob({
    sequelize: createDatabase(calls),
    async ensureNotificationSchema() { calls.push("ensure-schema"); },
    async dispatchPending(batchSize) {
      calls.push("dispatch");
      receivedBatchSize = batchSize;
      return [{ id: 12, status: "SENT", providerMessageId: "mail_12" }];
    },
    batchSize: 10,
    logger,
    setExitCode(code) { exitCodes.push(code); },
  });

  assert.deepEqual(calls, ["authenticate", "sync", "ensure-schema", "dispatch", "close"]);
  assert.equal(receivedBatchSize, 10);
  assert.deepEqual(result, {
    processed: 1,
    result: [{ id: 12, status: "SENT", providerMessageId: "mail_12" }],
  });
  assert.equal(logger.messages.length, 1);
  assert.match(logger.messages[0], /"processed": 1/);
  assert.deepEqual(logger.errors, []);
  assert.deepEqual(exitCodes, []);
});

test("sets a failing exit code when a dispatch batch contains failed deliveries", async () => {
  const calls = [];
  const logger = createLogger();
  const exitCodes = [];

  const result = await runDispatchJob({
    sequelize: createDatabase(calls),
    async ensureNotificationSchema() { calls.push("ensure-schema"); },
    async dispatchPending() {
      calls.push("dispatch");
      return [
        { id: 12, status: "SENT" },
        { id: 13, status: "FAILED", error: "provider unavailable" },
      ];
    },
    logger,
    setExitCode(code) { exitCodes.push(code); },
  });

  assert.equal(result.processed, 2);
  assert.deepEqual(exitCodes, [1]);
  assert.deepEqual(calls, ["authenticate", "sync", "ensure-schema", "dispatch", "close"]);
});

test("logs startup errors, sets failure exit status and closes the database", async () => {
  const calls = [];
  const logger = createLogger();
  const exitCodes = [];
  const failure = new Error("database unavailable");

  await assert.rejects(
    runDispatchJob({
      sequelize: createDatabase(calls, async () => { throw failure; }),
      async ensureNotificationSchema() { assert.fail("schema must not be initialized after auth failure"); },
      async dispatchPending() { assert.fail("dispatch must not run after auth failure"); },
      logger,
      setExitCode(code) { exitCodes.push(code); },
    }),
    (error) => error === failure
  );

  assert.deepEqual(calls, ["authenticate", "close"]);
  assert.deepEqual(logger.errors, [["Notification dispatch failed:", "database unavailable"]]);
  assert.deepEqual(exitCodes, [1]);
});

test("loads the configured Sequelize connection and notification service", () => {
  const dependencies = loadDependencies();
  assert.equal(typeof dependencies.sequelize.authenticate, "function");
  assert.equal(typeof dependencies.sequelize.sync, "function");
  assert.equal(typeof dependencies.sequelize.close, "function");
  assert.equal(typeof dependencies.ensureNotificationSchema, "function");
  assert.equal(typeof dependencies.dispatchPending, "function");
});
