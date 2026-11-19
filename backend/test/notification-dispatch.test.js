const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

// Use a disposable database so this test exercises the real outbox state
// transitions without contacting an external email provider.
const databaseFile = path.join(os.tmpdir(), `ems-notification-dispatch-${process.pid}-${Date.now()}.sqlite`);
process.env.DATABASE_FILE = databaseFile;
process.env.NODE_ENV = "test";

const sequelize = require("../src/config/db");
const User = require("../src/models/User");
const Event = require("../src/models/Event");
const Registration = require("../src/models/Registration");
const Notification = require("../src/models/Notification");
const {
  enqueue,
  queueEventNotice,
  dispatchPending,
  ensureNotificationSchema,
} = require("../src/services/notificationService");

let recipient;
let event;

before(async () => {
  await sequelize.sync({ force: true });
  await ensureNotificationSchema();

  recipient = await User.create({
    name: "Notification Test Attendee",
    email: "notification-test@example.com",
    passwordHash: "test-only-not-a-real-password-hash",
    role: "ATTENDEE",
    isVerified: true,
  });

  const starts = new Date(Date.now() + 24 * 60 * 60 * 1000);
  event = await Event.create({
    title: "Notification Dispatch Test",
    description: "Disposable test event",
    category: "Academic",
    startDateTime: starts,
    endDateTime: new Date(starts.getTime() + 60 * 60 * 1000),
    venue: "Test Auditorium",
    capacity: 10,
    ticketPrice: 0,
    status: "PUBLISHED",
    organizerId: recipient.id,
  });
});

after(async () => {
  await sequelize.close();
  for (const suffix of ["", "-shm", "-wal", "-journal"]) {
    try {
      fs.unlinkSync(databaseFile + suffix);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
});

test("outbox deduplicates notices and records successful provider acceptance", async () => {
  const notice = {
    recipientId: recipient.id,
    eventId: event.id,
    type: "REGISTRATION_CONFIRMED",
    dedupeKey: "registration-confirmed:test-success",
    payload: { eventTitle: event.title, venue: event.venue },
  };

  const queued = await enqueue(notice);
  const duplicate = await enqueue(notice);
  assert.ok(queued);
  assert.equal(duplicate, null, "a duplicate dedupe key must not create another row");

  let delivered;
  const results = await dispatchPending(10, {
    now: new Date(Date.now() + 1000),
    adapter: {
      async send(message) {
        delivered = message;
        return { providerMessageId: "provider-test-accepted-1" };
      },
    },
  });

  assert.equal(results.length, 1);
  assert.equal(results[0].status, "SENT");
  assert.equal(delivered.to, recipient.email);
  assert.equal(delivered.idempotencyKey, notice.dedupeKey);

  const stored = await Notification.findByPk(queued.id);
  assert.equal(stored.status, "SENT");
  assert.equal(stored.attempts, 1);
  assert.equal(stored.lastError, null);
  assert.equal(stored.claimToken, null);
  assert.ok(stored.sentAt);
});

test("failed delivery is retained and retried after the backoff interval", async () => {
  const queued = await enqueue({
    recipientId: recipient.id,
    eventId: event.id,
    type: "WAITLIST_PROMOTED",
    dedupeKey: "waitlist-promoted:test-retry",
    payload: { eventTitle: event.title, venue: event.venue },
  });

  const firstAttemptAt = new Date(Date.now() + 1000);
  const failed = await dispatchPending(10, {
    now: firstAttemptAt,
    adapter: {
      async send() {
        throw new Error("simulated provider outage");
      },
    },
  });

  assert.deepEqual(failed.map((item) => item.status), ["FAILED"]);
  let stored = await Notification.findByPk(queued.id);
  assert.equal(stored.status, "FAILED");
  assert.equal(stored.attempts, 1);
  assert.equal(stored.lastError, "simulated provider outage");
  assert.equal(stored.claimToken, null);

  const tooSoon = await dispatchPending(10, {
    now: new Date(firstAttemptAt.getTime() + 30 * 1000),
    adapter: { async send() { assert.fail("retry must respect the one-minute backoff"); } },
  });
  assert.deepEqual(tooSoon, []);

  const retried = await dispatchPending(10, {
    now: new Date(firstAttemptAt.getTime() + 61 * 1000),
    adapter: { async send() { return { providerMessageId: "provider-test-accepted-2" }; } },
  });
  assert.deepEqual(retried.map((item) => item.status), ["SENT"]);

  stored = await Notification.findByPk(queued.id);
  assert.equal(stored.status, "SENT");
  assert.equal(stored.attempts, 2);
  assert.equal(stored.lastError, null);
  assert.equal(stored.claimToken, null);
});

test("event-change notices target confirmed and waitlisted attendees once", async () => {
  const secondRecipient = await User.create({
    name: "Waitlisted Test Attendee",
    email: "waitlisted-test@example.com",
    passwordHash: "test-only-not-a-real-password-hash",
    role: "ATTENDEE",
    isVerified: true,
  });

  const cancelledRecipient = await User.create({
    name: "Cancelled Test Attendee",
    email: "cancelled-test@example.com",
    passwordHash: "test-only-not-a-real-password-hash",
    role: "ATTENDEE",
    isVerified: true,
  });

  await Registration.bulkCreate([
    { eventId: event.id, attendeeId: recipient.id, status: "CONFIRMED" },
    { eventId: event.id, attendeeId: secondRecipient.id, status: "WAITLISTED" },
    { eventId: event.id, attendeeId: cancelledRecipient.id, status: "CANCELLED" },
  ]);

  const firstQueueCount = await queueEventNotice(event, "EVENT_RESCHEDULED");
  const duplicateQueueCount = await queueEventNotice(event, "EVENT_RESCHEDULED");
  assert.equal(firstQueueCount, 2);
  assert.equal(duplicateQueueCount, 0);

  const notices = await Notification.findAll({
    where: { eventId: event.id, type: "EVENT_RESCHEDULED" },
    order: [["recipientId", "ASC"]],
  });
  assert.deepEqual(notices.map((notice) => notice.recipientId), [recipient.id, secondRecipient.id]);
  assert.ok(notices.every((notice) => notice.status === "PENDING"));
});
