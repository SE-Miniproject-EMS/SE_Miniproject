const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildNotificationEmail,
  createResendAdapter,
} = require("../src/services/notificationService");

const event = {
  title: "Campus Tech Fest <2026>",
  startDateTime: "2026-12-01T10:00:00.000Z",
  endDateTime: "2026-12-01T17:00:00.000Z",
  venue: "PES University",
};

for (const type of [
  "REGISTRATION_CONFIRMED",
  "EVENT_REMINDER",
  "EVENT_RESCHEDULED",
  "EVENT_CANCELLED",
  "WAITLIST_PROMOTED",
]) {
  test(`builds an event-specific email for ${type}`, () => {
    const email = buildNotificationEmail({
      type,
      payload: JSON.stringify({ eventTitle: event.title, startDateTime: event.startDateTime, endDateTime: event.endDateTime, venue: event.venue }),
    }, event);
    assert.ok(email.subject.includes("Campus Tech Fest"));
    assert.ok(email.text.includes("PES University"));
    assert.ok(email.html.includes("PES University"));
    assert.match(email.html, /&lt;2026&gt;/, "HTML content is escaped");
  });
}

test("Resend adapter sends to recipient with idempotency key and configured sender", async () => {
  let captured;
  const adapter = createResendAdapter({
    apiKey: "re_test_key",
    from: "EMS <onboarding@resend.dev>",
    fetchImpl: async (url, options) => {
      captured = { url, options };
      return { ok: true, status: 200, json: async () => ({ id: "email_test_123" }) };
    },
  });
  const result = await adapter.send({
    to: "attendee@example.com",
    subject: "Confirmed",
    text: "Your registration is confirmed",
    html: "<p>Confirmed</p>",
    idempotencyKey: "registration-confirmed:123",
  });
  assert.equal(result.providerMessageId, "email_test_123");
  assert.equal(captured.url, "https://api.resend.com/emails");
  assert.equal(captured.options.headers.Authorization, "Bearer re_test_key");
  assert.equal(captured.options.headers["Idempotency-Key"], "registration-confirmed:123");
  const body = JSON.parse(captured.options.body);
  assert.deepEqual(body.to, ["attendee@example.com"]);
  assert.equal(body.from, "EMS <onboarding@resend.dev>");
});

test("Resend adapter surfaces provider failures for retry handling", async () => {
  const adapter = createResendAdapter({
    apiKey: "re_test_key",
    from: "EMS <onboarding@resend.dev>",
    fetchImpl: async () => ({ ok: false, status: 401, json: async () => ({ message: "Invalid API key" }) }),
  });
  await assert.rejects(() => adapter.send({
    to: "attendee@example.com", subject: "x", text: "x", html: "<p>x</p>", idempotencyKey: "key",
  }), /Invalid API key/);
});

test("Resend adapter fails closed when credentials are missing", async () => {
  const adapter = createResendAdapter({ apiKey: "", from: "", fetchImpl: async () => { throw new Error("must not call"); } });
  await assert.rejects(() => adapter.send({
    to: "attendee@example.com", subject: "x", text: "x", html: "<p>x</p>", idempotencyKey: "key",
  }), /RESEND_API_KEY/);
});
