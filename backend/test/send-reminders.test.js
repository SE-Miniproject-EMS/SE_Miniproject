const assert = require("node:assert/strict");
const { test } = require("node:test");
const { Op } = require("sequelize");
const { loadDependencies, runReminderJob } = require("../src/jobs/sendReminders");

function createLogger() {
  return { messages: [], errors: [], log(message) { this.messages.push(message); }, error(...args) { this.errors.push(args); } };
}

function createDatabaseLifecycle(calls) {
  return {
    async authenticate() { calls.push("authenticate"); },
    async sync() { calls.push("sync"); },
    async close() { calls.push("close"); },
  };
}

test("queues reminders for confirmed registrations in the 23–25 hour window", async () => {
  const calls = [];
  const logger = createLogger();
  const now = Date.UTC(2026, 10, 18, 6, 0, 0);
  const event = {
    id: 42,
    title: "Software Engineering Workshop",
    startDateTime: new Date(now + 24 * 3600000),
    venue: "PES Auditorium",
  };
  const registrations = [
    { id: 101, attendeeId: 1001 },
    { id: 102, attendeeId: 1002 },
  ];
  const enqueueArguments = [];
  let eventQuery;

  const result = await runReminderJob({
    sequelize: createDatabaseLifecycle(calls),
    Event: {
      async findAll(query) {
        eventQuery = query;
        calls.push("find-events");
        return [event];
      },
    },
    Registration: {
      async findAll(query) {
        calls.push("find-registrations");
        assert.deepEqual(query, { where: { eventId: 42, status: "CONFIRMED" } });
        return registrations;
      },
    },
    async enqueue(notification) {
      enqueueArguments.push(notification);
      return enqueueArguments.length === 1 ? { id: 501 } : null;
    },
    async dispatchPending() {
      calls.push("dispatch");
      return [{ id: 501, status: "SENT" }];
    },
    logger,
    now,
  });

  assert.deepEqual(result, {
    queued: 1,
    delivery: [{ id: 501, status: "SENT" }],
  });
  assert.deepEqual(calls, [
    "authenticate",
    "sync",
    "find-events",
    "find-registrations",
    "dispatch",
    "close",
  ]);

  const [from, to] = eventQuery.where.startDateTime[Op.between];
  assert.equal(from.getTime(), now + 23 * 3600000);
  assert.equal(to.getTime(), now + 25 * 3600000);
  assert.equal(eventQuery.where.status, "PUBLISHED");

  assert.deepEqual(enqueueArguments, [
    {
      recipientId: 1001,
      eventId: 42,
      registrationId: 101,
      type: "EVENT_REMINDER",
      dedupeKey: "event-reminder-24h:42:101",
      payload: {
        title: event.title,
        startDateTime: event.startDateTime,
        venue: event.venue,
      },
    },
    {
      recipientId: 1002,
      eventId: 42,
      registrationId: 102,
      type: "EVENT_REMINDER",
      dedupeKey: "event-reminder-24h:42:102",
      payload: {
        title: event.title,
        startDateTime: event.startDateTime,
        venue: event.venue,
      },
    },
  ]);
  assert.equal(logger.messages.length, 1);
  assert.match(logger.messages[0], /"queued": 1/);
  assert.equal(logger.errors.length, 0);
});

test("dispatches pending notifications when no events fall in the reminder window", async () => {
  const calls = [];
  const logger = createLogger();

  const result = await runReminderJob({
    sequelize: createDatabaseLifecycle(calls),
    Event: {
      async findAll() {
        calls.push("find-events");
        return [];
      },
    },
    Registration: {
      async findAll() {
        assert.fail("registrations must not be queried when no events match");
      },
    },
    async enqueue() {
      assert.fail("no reminder should be queued without a matching event");
    },
    async dispatchPending() {
      calls.push("dispatch");
      return [];
    },
    logger,
    now: Date.UTC(2026, 10, 18, 6, 0, 0),
  });

  assert.deepEqual(result, { queued: 0, delivery: [] });
  assert.deepEqual(calls, ["authenticate", "sync", "find-events", "dispatch", "close"]);
  assert.equal(logger.messages.length, 1);
  assert.equal(logger.errors.length, 0);
});

test("closes the database and reports an error when startup authentication fails", async () => {
  const calls = [];
  const logger = createLogger();
  const failure = new Error("database unavailable");

  const sequelize = {
    async authenticate() {
      calls.push("authenticate");
      throw failure;
    },
    async sync() {
      assert.fail("sync must not run after authentication fails");
    },
    async close() {
      calls.push("close");
    },
  };

  await assert.rejects(
    runReminderJob({
      sequelize,
      Event: { findAll: async () => assert.fail("events must not be queried") },
      Registration: { findAll: async () => assert.fail("registrations must not be queried") },
      enqueue: async () => assert.fail("notifications must not be queued"),
      dispatchPending: async () => assert.fail("dispatch must not run"),
      logger,
    }),
    (error) => error === failure
  );

  assert.deepEqual(calls, ["authenticate", "close"]);
  assert.deepEqual(logger.errors, [["Reminder job failed:", "database unavailable"]]);
});


test("loads configured Sequelize models and notification operations for the CLI", () => {
  const dependencies = loadDependencies();

  assert.equal(typeof dependencies.sequelize.authenticate, "function");
  assert.equal(typeof dependencies.sequelize.sync, "function");
  assert.equal(typeof dependencies.sequelize.close, "function");
  assert.equal(typeof dependencies.Event.findAll, "function");
  assert.equal(typeof dependencies.Registration.findAll, "function");
  assert.equal(typeof dependencies.enqueue, "function");
  assert.equal(typeof dependencies.dispatchPending, "function");
});
