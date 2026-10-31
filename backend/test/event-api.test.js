const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const sqlite3 = require("sqlite3");
const TEST_JWT_SECRET = "ems-test-jwt-secret-change-me";
process.env.JWT_SECRET = TEST_JWT_SECRET;
const { signAccessToken } = require("../src/utils/jwt");

const backendDir = path.resolve(__dirname, "..");
const databaseFile = path.join(
  os.tmpdir(),
  `ems-backend-tests-${process.pid}-${Date.now()}.sqlite`
);

let server;
let baseUrl;
let serverOutput = "";
let accountCounter = 0;

function getFreePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      probe.close((error) => {
        if (error) reject(error);
        else resolve(address.port);
      });
    });
  });
}

async function waitForServer() {
  const deadline = Date.now() + 15000;

  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`Backend exited before becoming healthy. Output:\n${serverOutput}`);
    }

    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {
      // The child process may need a moment to connect to SQLite and start listening.
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  server.kill("SIGTERM");
  throw new Error(`Backend did not become healthy in 15 seconds. Output:\n${serverOutput}`);
}

before(async () => {
  const port = await getFreePort();
  baseUrl = `http://127.0.0.1:${port}`;

  server = spawn(process.execPath, ["src/server.js"], {
    cwd: backendDir,
    env: {
      ...process.env,
      PORT: String(port),
      DATABASE_FILE: databaseFile,
      JWT_SECRET: TEST_JWT_SECRET,
      EMAIL_VERIFICATION_SECRET: "ems-test-email-secret-change-me",
      NODE_ENV: "test",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  server.stdout.on("data", (chunk) => {
    serverOutput += chunk.toString();
  });
  server.stderr.on("data", (chunk) => {
    serverOutput += chunk.toString();
  });

  await waitForServer();
});

after(async () => {
  if (server && server.exitCode === null) {
    const exited = new Promise((resolve) => server.once("exit", resolve));
    server.kill("SIGTERM");
    await Promise.race([
      exited,
      new Promise((resolve) => setTimeout(resolve, 2000)),
    ]);
    if (server.exitCode === null) server.kill("SIGKILL");
  }

  for (const suffix of ["", "-shm", "-wal", "-journal"]) {
    try {
      fs.unlinkSync(databaseFile + suffix);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
});

async function queryTestDatabase(sql, parameters) {
  return new Promise((resolve, reject) => {
    const database = new sqlite3.Database(databaseFile, sqlite3.OPEN_READONLY, (openError) => {
      if (openError) return reject(openError);
      database.get(sql, parameters, (queryError, row) => {
        database.close((closeError) => {
          if (queryError) reject(queryError);
          else if (closeError) reject(closeError);
          else resolve(row);
        });
      });
    });
  });
}

async function request(route, { method = "GET", token, body } = {}) {
  const headers = {};
  if (body !== undefined) headers["content-type"] = "application/json";
  if (token) headers.authorization = `Bearer ${token}`;

  const response = await fetch(`${baseUrl}${route}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const payload = await response.json();
  return { response, payload };
}

async function createAccount(role = "ORGANIZER") {
  const email = `${role.toLowerCase()}-${process.pid}-${accountCounter++}@example.com`;
  const registration = await request("/api/auth/register", {
    method: "POST",
    body: {
      name: role === "ATTENDEE" ? "Test Attendee" : "Test Organizer",
      email,
      password: "TestPassword123!",
      role,
    },
  });

  assert.equal(
    registration.response.status,
    201,
    `registration failed: ${JSON.stringify(registration.payload)}`
  );

  const marker = `[DEV ONLY] Verification link for ${email}: `;
  const deadline = Date.now() + 3000;
  let verificationPath;

  while (Date.now() < deadline && !verificationPath) {
    const line = serverOutput.split(/\\r?\\n/).reverse().find((entry) => entry.includes(marker));
    if (line) verificationPath = new URL(line.slice(line.indexOf(marker) + marker.length).trim()).pathname;
    else await new Promise((resolve) => setTimeout(resolve, 10));
  }

  assert.ok(verificationPath, `verification link was not logged for ${email}`);
  const verification = await request(verificationPath);
  assert.equal(verification.response.status, 200, JSON.stringify(verification.payload));

  const user = verification.payload.user;
  return { token: signAccessToken(user), user };
}

function validEvent(overrides = {}) {
  const starts = Date.now() + 48 * 60 * 60 * 1000;
  return {
    title: `Automated EMS event ${accountCounter}`,
    description: "Created by backend integration tests.",
    category: "Academic",
    startDateTime: new Date(starts).toISOString(),
    endDateTime: new Date(starts + 60 * 60 * 1000).toISOString(),
    venue: "Test Auditorium",
    capacity: 100,
    ticketPrice: 0,
    refundWindowHours: 24,
    ...overrides,
  };
}

test("event API requires authentication and organizer/admin authorization", async () => {
  const unauthenticated = await request("/api/events", {
    method: "POST",
    body: validEvent(),
  });
  assert.equal(unauthenticated.response.status, 401);
  assert.equal(unauthenticated.payload.error.code, "UNAUTHENTICATED");

  const attendee = await createAccount("ATTENDEE");
  const forbidden = await request("/api/events", {
    method: "POST",
    token: attendee.token,
    body: validEvent(),
  });
  assert.equal(forbidden.response.status, 403);
  assert.equal(forbidden.payload.error.code, "FORBIDDEN");
});

test("organizer can create, view, edit, publish, and cancel an event", async () => {
  const organizer = await createAccount();
  const title = `Lifecycle event ${Date.now()}`;

  const created = await request("/api/events", {
    method: "POST",
    token: organizer.token,
    body: validEvent({ title }),
  });
  assert.equal(created.response.status, 201, JSON.stringify(created.payload));
  assert.equal(created.payload.event.title, title);
  assert.equal(created.payload.event.status, "DRAFT");
  assert.equal(created.payload.event.organizerId, organizer.user.id);

  const ownEvents = await request("/api/events/manage/mine", {
    token: organizer.token,
  });
  assert.equal(ownEvents.response.status, 200);
  assert.ok(ownEvents.payload.events.some((event) => event.id === created.payload.event.id));

  const publicBeforePublish = await request("/api/events");
  assert.equal(publicBeforePublish.response.status, 200);
  assert.ok(!publicBeforePublish.payload.events.some((event) => event.id === created.payload.event.id));

  const updatedTitle = `${title} updated`;
  const updated = await request(`/api/events/${created.payload.event.id}`, {
    method: "PUT",
    token: organizer.token,
    body: { title: updatedTitle, venue: "Updated Test Auditorium" },
  });
  assert.equal(updated.response.status, 200, JSON.stringify(updated.payload));
  assert.equal(updated.payload.event.title, updatedTitle);
  assert.equal(updated.payload.event.venue, "Updated Test Auditorium");

  const published = await request(`/api/events/${created.payload.event.id}/publish`, {
    method: "POST",
    token: organizer.token,
  });
  assert.equal(published.response.status, 200, JSON.stringify(published.payload));
  assert.equal(published.payload.event.status, "PUBLISHED");

  const publicDetails = await request(`/api/events/${created.payload.event.id}`);
  assert.equal(publicDetails.response.status, 200);
  assert.equal(publicDetails.payload.event.id, created.payload.event.id);
  assert.equal(publicDetails.payload.event.title, updatedTitle);
  assert.equal(publicDetails.payload.event.venue, "Updated Test Auditorium");

  const cancelled = await request(`/api/events/${created.payload.event.id}/cancel`, {
    method: "POST",
    token: organizer.token,
  });
  assert.equal(cancelled.response.status, 200, JSON.stringify(cancelled.payload));
  assert.equal(cancelled.payload.event.status, "CANCELLED");

  const unavailableDetails = await request(`/api/events/${created.payload.event.id}`);
  assert.equal(unavailableDetails.response.status, 404);
});

test("event creation returns 400 for missing required data or invalid values", async () => {
  const organizer = await createAccount();

  for (const field of ["title", "category", "startDateTime", "endDateTime", "venue", "capacity"]) {
    const body = validEvent();
    delete body[field];

    const result = await request("/api/events", {
      method: "POST",
      token: organizer.token,
      body,
    });

    assert.equal(
      result.response.status,
      400,
      `missing ${field} should return 400; received ${result.response.status}: ${JSON.stringify(result.payload)}`
    );
  }

  const starts = Date.now() + 48 * 60 * 60 * 1000;
  const badCases = [
    validEvent({
      startDateTime: new Date(starts).toISOString(),
      endDateTime: new Date(starts - 1000).toISOString(),
    }),
    validEvent({ capacity: -1 }),
    validEvent({ ticketPrice: -0.01 }),
    validEvent({ title: "T".repeat(101) }),
    validEvent({ startDateTime: "not-a-date" }),
  ];

  for (const body of badCases) {
    const result = await request("/api/events", {
      method: "POST",
      token: organizer.token,
      body,
    });
    assert.equal(
      result.response.status,
      400,
      `invalid input should return 400; received ${result.response.status}: ${JSON.stringify(result.payload)}`
    );
    assert.ok(result.payload.error?.code);
  }
});

test("organizers can modify their own events but not another organizer's event", async () => {
  const owner = await createAccount("ORGANIZER");
  const otherOrganizer = await createAccount("ORGANIZER");

  const created = await request("/api/events", {
    method: "POST",
    token: owner.token,
    body: validEvent({ title: `Owner-only event ${Date.now()}` }),
  });
  assert.equal(created.response.status, 201);

  const eventId = created.payload.event.id;
  const forbiddenUpdate = await request(`/api/events/${eventId}`, {
    method: "PUT",
    token: otherOrganizer.token,
    body: { title: "Unauthorized change" },
  });
  assert.equal(forbiddenUpdate.response.status, 403);
  assert.equal(forbiddenUpdate.payload.error.code, "FORBIDDEN");

  const forbiddenCancel = await request(`/api/events/${eventId}/cancel`, {
    method: "POST",
    token: otherOrganizer.token,
  });
  assert.equal(forbiddenCancel.response.status, 403);

  const ownerUpdate = await request(`/api/events/${eventId}`, {
    method: "PUT",
    token: owner.token,
    body: { title: "Owner update succeeds" },
  });
  assert.equal(ownerUpdate.response.status, 200, JSON.stringify(ownerUpdate.payload));
  assert.equal(ownerUpdate.payload.event.title, "Owner update succeeds");
});

test("public event listing supports category, location, search, and date filters", async () => {
  const organizer = await createAccount("ORGANIZER");
  const unique = `Filter-${process.pid}-${Date.now()}`;
  const firstStart = Date.now() + 48 * 60 * 60 * 1000;
  const secondStart = Date.now() + 72 * 60 * 60 * 1000;

  const first = await request("/api/events", {
    method: "POST",
    token: organizer.token,
    body: validEvent({
      title: `${unique} Alpha Event`,
      description: `Needle-${unique} searchable description`,
      category: "TestCategory",
      venue: `${unique} Test Venue`,
      startDateTime: new Date(firstStart).toISOString(),
      endDateTime: new Date(firstStart + 60 * 60 * 1000).toISOString(),
      status: "PUBLISHED",
    }),
  });
  assert.equal(first.response.status, 201, JSON.stringify(first.payload));

  const second = await request("/api/events", {
    method: "POST",
    token: organizer.token,
    body: validEvent({
      title: `${unique} Beta Event`,
      description: "A separate event for filtering tests",
      category: "Workshop",
      venue: "Different Test Venue",
      startDateTime: new Date(secondStart).toISOString(),
      endDateTime: new Date(secondStart + 60 * 60 * 1000).toISOString(),
      status: "PUBLISHED",
    }),
  });
  assert.equal(second.response.status, 201, JSON.stringify(second.payload));

  const firstId = first.payload.event.id;
  const secondId = second.payload.event.id;

  const byCategory = await request("/api/events?category=TestCategory");
  assert.equal(byCategory.response.status, 200);
  assert.ok(byCategory.payload.events.some((event) => event.id === firstId));
  assert.ok(!byCategory.payload.events.some((event) => event.id === secondId));

  const byLocation = await request(
    `/api/events?location=${encodeURIComponent(`${unique} Test Venue`)}`
  );
  assert.equal(byLocation.response.status, 200);
  assert.ok(byLocation.payload.events.some((event) => event.id === firstId));
  assert.ok(!byLocation.payload.events.some((event) => event.id === secondId));

  const bySearch = await request(
    `/api/events?search=${encodeURIComponent(`Needle-${unique}`)}`
  );
  assert.equal(bySearch.response.status, 200);
  assert.ok(bySearch.payload.events.some((event) => event.id === firstId));
  assert.ok(!bySearch.payload.events.some((event) => event.id === secondId));

  const startDate = new Date(firstStart - 60 * 60 * 1000).toISOString();
  const endDate = new Date(firstStart + 60 * 60 * 1000).toISOString();
  const byDate = await request(
    `/api/events?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`
  );
  assert.equal(byDate.response.status, 200);
  assert.ok(byDate.payload.events.some((event) => event.id === firstId));
  assert.ok(!byDate.payload.events.some((event) => event.id === secondId));

  const invalidStartFilter = await request("/api/events?startDate=not-a-date");
  assert.equal(invalidStartFilter.response.status, 400);
  assert.equal(invalidStartFilter.payload.error.code, "INVALID_START_DATE");

  const invalidEndFilter = await request("/api/events?endDate=not-a-date");
  assert.equal(invalidEndFilter.response.status, 400);
  assert.equal(invalidEndFilter.payload.error.code, "INVALID_END_DATE");
});

test("public event listing paginates future published events and validates page bounds", async () => {
  const organizer = await createAccount("ORGANIZER");
  const unique = `Pagination-${process.pid}-${Date.now()}`;
  const start = Date.now() + 96 * 60 * 60 * 1000;
  const eventIds = [];

  for (let index = 0; index < 3; index += 1) {
    const eventStart = start + index * 60 * 60 * 1000;
    const created = await request("/api/events", {
      method: "POST",
      token: organizer.token,
      body: validEvent({
        title: `${unique} Event ${index + 1}`,
        startDateTime: new Date(eventStart).toISOString(),
        endDateTime: new Date(eventStart + 30 * 60 * 1000).toISOString(),
        status: "PUBLISHED",
      }),
    });
    assert.equal(created.response.status, 201, JSON.stringify(created.payload));
    eventIds.push(created.payload.event.id);
  }

  const firstPage = await request(`/api/events?search=${encodeURIComponent(unique)}&page=1&limit=2`);
  const secondPage = await request(`/api/events?search=${encodeURIComponent(unique)}&page=2&limit=2`);
  assert.equal(firstPage.response.status, 200, JSON.stringify(firstPage.payload));
  assert.equal(secondPage.response.status, 200, JSON.stringify(secondPage.payload));
  assert.deepEqual(firstPage.payload.events.map((event) => event.id), eventIds.slice(0, 2));
  assert.deepEqual(secondPage.payload.events.map((event) => event.id), eventIds.slice(2));
  assert.deepEqual(firstPage.payload.pagination, { page: 1, limit: 2, total: 3, pages: 2 });
  assert.deepEqual(secondPage.payload.pagination, { page: 2, limit: 2, total: 3, pages: 2 });

  const invalidPage = await request("/api/events?page=0");
  assert.equal(invalidPage.response.status, 400);
  assert.equal(invalidPage.payload.error.code, "INVALID_PAGE");

  const invalidLimit = await request("/api/events?limit=51");
  assert.equal(invalidLimit.response.status, 400);
  assert.equal(invalidLimit.payload.error.code, "INVALID_LIMIT");
});

test("event updates reject invalid values without changing the stored event", async () => {
  const organizer = await createAccount("ORGANIZER");
  const originalTitle = `Validation event ${Date.now()}`;
  const created = await request("/api/events", {
    method: "POST",
    token: organizer.token,
    body: validEvent({ title: originalTitle }),
  });
  assert.equal(created.response.status, 201, JSON.stringify(created.payload));

  const eventId = created.payload.event.id;
  const badUpdates = [
    { body: { title: "   " }, code: "INVALID_TITLE" },
    { body: { category: "C".repeat(31) }, code: "INVALID_CATEGORY" },
    { body: { venue: "   " }, code: "INVALID_VENUE" },
    { body: { capacity: 0 }, code: "INVALID_CAPACITY" },
    { body: { ticketPrice: -1 }, code: "INVALID_TICKET_PRICE" },
    { body: { startDateTime: "not-a-date" }, code: "INVALID_START_DATE" },
    {
      body: { endDateTime: new Date(Date.now() + 60 * 60 * 1000).toISOString() },
      code: "INVALID_DATE_RANGE",
    },
  ];

  for (const { body, code } of badUpdates) {
    const result = await request(`/api/events/${eventId}`, {
      method: "PUT",
      token: organizer.token,
      body,
    });

    assert.equal(
      result.response.status,
      400,
      `update ${JSON.stringify(body)} should return 400: ${JSON.stringify(result.payload)}`
    );
    assert.equal(result.payload.error.code, code);
  }

  const mine = await request("/api/events/manage/mine", {
    token: organizer.token,
  });
  assert.equal(mine.response.status, 200);
  const storedEvent = mine.payload.events.find((event) => event.id === eventId);
  assert.ok(storedEvent, "the event should still exist after rejected updates");
  assert.equal(storedEvent.title, originalTitle);
  assert.equal(storedEvent.capacity, 100);
});

test("cancelled events cannot be edited or published again", async () => {
  const organizer = await createAccount("ORGANIZER");
  const created = await request("/api/events", {
    method: "POST",
    token: organizer.token,
    body: validEvent({ title: `Cancelled event ${Date.now()}` }),
  });
  assert.equal(created.response.status, 201, JSON.stringify(created.payload));

  const eventId = created.payload.event.id;
  const cancelled = await request(`/api/events/${eventId}/cancel`, {
    method: "POST",
    token: organizer.token,
  });
  assert.equal(cancelled.response.status, 200, JSON.stringify(cancelled.payload));
  assert.equal(cancelled.payload.event.status, "CANCELLED");

  const update = await request(`/api/events/${eventId}`, {
    method: "PUT",
    token: organizer.token,
    body: { title: "This change must be rejected" },
  });
  assert.equal(update.response.status, 409);
  assert.equal(update.payload.error.code, "EVENT_CANCELLED");

  const publish = await request(`/api/events/${eventId}/publish`, {
    method: "POST",
    token: organizer.token,
  });
  assert.equal(publish.response.status, 409);
  assert.equal(publish.payload.error.code, "EVENT_CANCELLED");
});

test("event endpoints return 404 for unknown event IDs", async () => {
  const organizer = await createAccount("ORGANIZER");
  const unknownId = "987654321";

  const publicDetails = await request(`/api/events/${unknownId}`);
  assert.equal(publicDetails.response.status, 404);
  assert.equal(publicDetails.payload.error.code, "NOT_FOUND");

  const update = await request(`/api/events/${unknownId}`, {
    method: "PUT",
    token: organizer.token,
    body: { title: "Nonexistent event" },
  });
  assert.equal(update.response.status, 404);
  assert.equal(update.payload.error.code, "NOT_FOUND");

  const publish = await request(`/api/events/${unknownId}/publish`, {
    method: "POST",
    token: organizer.token,
  });
  assert.equal(publish.response.status, 404);
  assert.equal(publish.payload.error.code, "NOT_FOUND");

  const cancel = await request(`/api/events/${unknownId}/cancel`, {
    method: "POST",
    token: organizer.token,
  });
  assert.equal(cancel.response.status, 404);
  assert.equal(cancel.payload.error.code, "NOT_FOUND");
});

test("creating an event as PUBLISHED rejects invalid publishing data", async () => {
  const organizer = await createAccount("ORGANIZER");
  const result = await request("/api/events", {
    method: "POST",
    token: organizer.token,
    body: validEvent({ status: "PUBLISHED", venue: "   " }),
  });

  assert.equal(result.response.status, 400);
  assert.equal(result.payload.error.code, "INVALID_VENUE");
});


test("registrations enforce capacity, issue one-use tickets, and gate feedback to checked-in attendees", async () => {
  const organizer = await createAccount("ORGANIZER");
  const attendee = await createAccount("ATTENDEE");
  const secondAttendee = await createAccount("ATTENDEE");
  const otherOrganizer = await createAccount("ORGANIZER");
  const registrationEvent = await request("/api/events", {
    method: "POST", token: organizer.token,
    body: validEvent({ capacity: 1 }),
  });
  const secondEventId = registrationEvent.payload.event.id;
  await request(`/api/events/${secondEventId}/publish`, { method: "POST", token: organizer.token });

  const first = await request(`/api/registrations/events/${secondEventId}`, { method: "POST", token: attendee.token });
  assert.equal(first.response.status, 201, JSON.stringify(first.payload));
  assert.equal(first.payload.registration.status, "CONFIRMED");
  assert.ok(first.payload.ticketToken);
  const duplicate = await request(`/api/registrations/events/${secondEventId}`, { method: "POST", token: attendee.token });
  assert.equal(duplicate.response.status, 409);
  const waitlisted = await request(`/api/registrations/events/${secondEventId}`, { method: "POST", token: secondAttendee.token });
  assert.equal(waitlisted.response.status, 201);
  assert.equal(waitlisted.payload.registration.status, "WAITLISTED");
  assert.equal(waitlisted.payload.ticketToken, null);

  const wrongOrganizer = await request("/api/registrations/check-in", { method: "POST", token: otherOrganizer.token, body: { eventId: secondEventId, ticketToken: first.payload.ticketToken } });
  assert.equal(wrongOrganizer.response.status, 403);
  const checkedIn = await request("/api/registrations/check-in", { method: "POST", token: organizer.token, body: { eventId: secondEventId, ticketToken: first.payload.ticketToken } });
  assert.equal(checkedIn.response.status, 200, JSON.stringify(checkedIn.payload));
  const reused = await request("/api/registrations/check-in", { method: "POST", token: organizer.token, body: { eventId: secondEventId, ticketToken: first.payload.ticketToken } });
  assert.equal(reused.response.status, 409);
  const wrongEvent = await request("/api/registrations/check-in", { method: "POST", token: organizer.token, body: { eventId: secondEventId + 999, ticketToken: first.payload.ticketToken } });
  assert.equal(wrongEvent.response.status, 404);
  const prematureFeedback = await request(`/api/feedback/events/${secondEventId}`, { method: "POST", token: attendee.token, body: { rating: 5, comment: "Great" } });
  assert.equal(prematureFeedback.response.status, 400);

  const pastStart = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const pastEnd = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const concludeEvent = await request(`/api/events/${secondEventId}`, { method: "PUT", token: organizer.token, body: { startDateTime: pastStart, endDateTime: pastEnd } });
  assert.equal(concludeEvent.response.status, 200, JSON.stringify(concludeEvent.payload));
  const feedback = await request(`/api/feedback/events/${secondEventId}`, { method: "POST", token: attendee.token, body: { rating: 5, comment: "Great event" } });
  assert.equal(feedback.response.status, 201, JSON.stringify(feedback.payload));
  const duplicateFeedback = await request(`/api/feedback/events/${secondEventId}`, { method: "POST", token: attendee.token, body: { rating: 4 } });
  assert.equal(duplicateFeedback.response.status, 409);
  const organizerView = await request(`/api/feedback/events/${secondEventId}`, { token: organizer.token });
  assert.equal(organizerView.response.status, 200);
  assert.equal(organizerView.payload.aggregate.count, 1);
  const unauthorizedView = await request(`/api/feedback/events/${secondEventId}`, { token: otherOrganizer.token });
  assert.equal(unauthorizedView.response.status, 403);
});

test("cancelling a confirmed registration promotes a waitlisted attendee", async () => {
  const organizer = await createAccount("ORGANIZER");
  const confirmedAttendee = await createAccount("ATTENDEE");
  const waitingAttendee = await createAccount("ATTENDEE");
  const laterWaitingAttendee = await createAccount("ATTENDEE");
  const created = await request("/api/events", {
    method: "POST", token: organizer.token,
    body: validEvent({ capacity: 1 }),
  });
  assert.equal(created.response.status, 201, JSON.stringify(created.payload));
  const eventId = created.payload.event.id;
  const published = await request(`/api/events/${eventId}/publish`, {
    method: "POST", token: organizer.token,
  });
  assert.equal(published.response.status, 200, JSON.stringify(published.payload));

  const first = await request(`/api/registrations/events/${eventId}`, {
    method: "POST", token: confirmedAttendee.token,
  });
  const waiting = await request(`/api/registrations/events/${eventId}`, {
    method: "POST", token: waitingAttendee.token,
  });
  assert.equal(first.payload.registration.status, "CONFIRMED");
  assert.equal(waiting.payload.registration.status, "WAITLISTED");
  let details = await request(`/api/events/${eventId}`);
  assert.equal(details.payload.event.seatsTaken, 1);
  assert.equal(await queryTestDatabase(
    'SELECT COUNT(*) AS count FROM "registrations" WHERE "eventId" = ? AND "status" = ?',
    [eventId, "CONFIRMED"]
  ).then((row) => row.count), 1);
  const ownStatus = await request("/api/registrations/mine", { token: confirmedAttendee.token });
  assert.equal(ownStatus.payload.registrations[0].status, "CONFIRMED");
  assert.equal(Object.hasOwn(ownStatus.payload.registrations[0], "ticketTokenHash"), false);
  const duplicateWaitlist = await request(`/api/registrations/events/${eventId}`, {
    method: "POST", token: waitingAttendee.token,
  });
  assert.equal(duplicateWaitlist.response.status, 409);
  const laterWaiting = await request(`/api/registrations/events/${eventId}`, {
    method: "POST", token: laterWaitingAttendee.token,
  });
  assert.equal(laterWaiting.payload.registration.status, "WAITLISTED");

  const cancelled = await request(`/api/registrations/${first.payload.registration.id}/cancel`, {
    method: "POST", token: confirmedAttendee.token,
  });
  assert.equal(cancelled.response.status, 200, JSON.stringify(cancelled.payload));
  const mine = await request("/api/registrations/mine", { token: waitingAttendee.token });
  const promoted = mine.payload.registrations.find((item) => item.id === waiting.payload.registration.id);
  assert.equal(promoted.status, "CONFIRMED");
  const promotionNotice = await queryTestDatabase(
    'SELECT "type", "status" FROM "notifications" WHERE "registrationId" = ? AND "type" = ?',
    [waiting.payload.registration.id, "WAITLIST_PROMOTED"]
  );
  assert.deepEqual(promotionNotice, { type: "WAITLIST_PROMOTED", status: "PENDING" });
  const laterMine = await request("/api/registrations/mine", { token: laterWaitingAttendee.token });
  assert.equal(laterMine.payload.registrations[0].status, "WAITLISTED");

  details = await request(`/api/events/${eventId}`);
  assert.equal(details.payload.event.seatsTaken, 1);
  assert.equal(await queryTestDatabase(
    'SELECT COUNT(*) AS count FROM "registrations" WHERE "eventId" = ? AND "status" = ?',
    [eventId, "CONFIRMED"]
  ).then((row) => row.count), 1);
  assert.equal(await queryTestDatabase(
    'SELECT COUNT(*) AS count FROM "registrations" WHERE "eventId" = ? AND "status" = ?',
    [eventId, "CANCELLED"]
  ).then((row) => row.count), 1);
  assert.equal(await queryTestDatabase(
    'SELECT COUNT(*) AS count FROM "registrations" WHERE "eventId" = ? AND "status" = ?',
    [eventId, "WAITLISTED"]
  ).then((row) => row.count), 1);
});

test("cancelling a registration for a cancelled event does not promote its waitlist", async () => {
  const organizer = await createAccount("ORGANIZER");
  const confirmedAttendee = await createAccount("ATTENDEE");
  const waitingAttendee = await createAccount("ATTENDEE");
  const created = await request("/api/events", {
    method: "POST", token: organizer.token, body: validEvent({ capacity: 1 }),
  });
  const eventId = created.payload.event.id;
  await request(`/api/events/${eventId}/publish`, { method: "POST", token: organizer.token });
  const confirmed = await request(`/api/registrations/events/${eventId}`, {
    method: "POST", token: confirmedAttendee.token,
  });
  const waiting = await request(`/api/registrations/events/${eventId}`, {
    method: "POST", token: waitingAttendee.token,
  });
  await request(`/api/events/${eventId}/cancel`, { method: "POST", token: organizer.token });

  const cancelled = await request(`/api/registrations/${confirmed.payload.registration.id}/cancel`, {
    method: "POST", token: confirmedAttendee.token,
  });
  assert.equal(cancelled.response.status, 200, JSON.stringify(cancelled.payload));
  const mine = await request("/api/registrations/mine", { token: waitingAttendee.token });
  assert.equal(mine.payload.registrations[0].status, "WAITLISTED");
  const details = await queryTestDatabase('SELECT "status", "seatsTaken" FROM "events" WHERE "id" = ?', [eventId]);
  assert.deepEqual(details, { status: "CANCELLED", seatsTaken: 0 });
  assert.equal(await queryTestDatabase(
    'SELECT COUNT(*) AS count FROM "registrations" WHERE "eventId" = ? AND "status" = ?',
    [eventId, "CONFIRMED"]
  ).then((row) => row.count), 0);
  assert.equal(await queryTestDatabase(
    'SELECT COUNT(*) AS count FROM "registrations" WHERE "id" = ? AND "status" = ?',
    [waiting.payload.registration.id, "WAITLISTED"]
  ).then((row) => row.count), 1);
});

test("simultaneous registrations for the last seat never overbook the event", async () => {
  const organizer = await createAccount("ORGANIZER");
  const attendees = [];
  for (let index = 0; index < 6; index += 1) attendees.push(await createAccount("ATTENDEE"));
  const created = await request("/api/events", {
    method: "POST", token: organizer.token,
    body: validEvent({ capacity: 1 }),
  });
  assert.equal(created.response.status, 201, JSON.stringify(created.payload));
  const eventId = created.payload.event.id;
  await request(`/api/events/${eventId}/publish`, { method: "POST", token: organizer.token });

  const results = await Promise.all(attendees.map((attendee) => request(
    `/api/registrations/events/${eventId}`, { method: "POST", token: attendee.token }
  )));
  assert.ok(results.every((result) => result.response.status === 201), JSON.stringify(results.map((item) => item.payload)));
  assert.equal(results.filter((result) => result.payload.registration.status === "CONFIRMED").length, 1);
  assert.equal(results.filter((result) => result.payload.registration.status === "WAITLISTED").length, 5);

  const details = await request(`/api/events/${eventId}`);
  assert.equal(details.payload.event.seatsTaken, 1);
  assert.equal(await queryTestDatabase(
    'SELECT COUNT(*) AS count FROM "registrations" WHERE "eventId" = ? AND "status" = ?',
    [eventId, "CONFIRMED"]
  ).then((row) => row.count), 1);
  assert.equal(await queryTestDatabase(
    'SELECT COUNT(*) AS count FROM "registrations" WHERE "eventId" = ? AND "status" = ?',
    [eventId, "WAITLISTED"]
  ).then((row) => row.count), 5);
});

test("attendees can only cancel their own registration", async () => {
  const organizer = await createAccount("ORGANIZER");
  const attendee = await createAccount("ATTENDEE");
  const otherAttendee = await createAccount("ATTENDEE");
  const created = await request("/api/events", {
    method: "POST", token: organizer.token, body: validEvent({ capacity: 2 }),
  });
  const eventId = created.payload.event.id;
  await request(`/api/events/${eventId}/publish`, { method: "POST", token: organizer.token });
  const registered = await request(`/api/registrations/events/${eventId}`, {
    method: "POST", token: attendee.token,
  });

  const forbidden = await request(`/api/registrations/${registered.payload.registration.id}/cancel`, {
    method: "POST", token: otherAttendee.token,
  });
  assert.equal(forbidden.response.status, 403);
  let details = await request(`/api/events/${eventId}`);
  assert.equal(details.payload.event.seatsTaken, 1);
  const stillMine = await request("/api/registrations/mine", { token: attendee.token });
  assert.equal(stillMine.payload.registrations[0].status, "CONFIRMED");
  const cancelled = await request(`/api/registrations/${registered.payload.registration.id}/cancel`, {
    method: "POST", token: attendee.token,
  });
  assert.equal(cancelled.response.status, 200, JSON.stringify(cancelled.payload));
  details = await request(`/api/events/${eventId}`);
  assert.equal(details.payload.event.seatsTaken, 0);
  assert.equal(await queryTestDatabase(
    'SELECT COUNT(*) AS count FROM "registrations" WHERE "eventId" = ? AND "status" = ?',
    [eventId, "CONFIRMED"]
  ).then((row) => row.count), 0);
  assert.equal(await queryTestDatabase(
    'SELECT COUNT(*) AS count FROM "registrations" WHERE "eventId" = ? AND "status" = ?',
    [eventId, "CANCELLED"]
  ).then((row) => row.count), 1);
});

test("cancellation is rejected after the event's configured cutoff", async () => {
  const organizer = await createAccount("ORGANIZER");
  const attendee = await createAccount("ATTENDEE");
  const starts = Date.now() + 6 * 60 * 60 * 1000;
  const created = await request("/api/events", {
    method: "POST", token: organizer.token,
    body: validEvent({
      capacity: 1,
      startDateTime: new Date(starts).toISOString(),
      endDateTime: new Date(starts + 60 * 60 * 1000).toISOString(),
      refundWindowHours: 24,
    }),
  });
  const eventId = created.payload.event.id;
  await request(`/api/events/${eventId}/publish`, { method: "POST", token: organizer.token });
  const registered = await request(`/api/registrations/events/${eventId}`, {
    method: "POST", token: attendee.token,
  });
  const cancelled = await request(`/api/registrations/${registered.payload.registration.id}/cancel`, {
    method: "POST", token: attendee.token,
  });
  assert.equal(cancelled.response.status, 400);
  assert.equal(cancelled.payload.error.code, "CANCELLATION_CUTOFF_PASSED");
  const mine = await request("/api/registrations/mine", { token: attendee.token });
  assert.equal(mine.payload.registrations[0].status, "CONFIRMED");
});

test("registration rejects unauthenticated, malformed, organizer, and unavailable-event requests", async () => {
  const organizer = await createAccount("ORGANIZER");
  const attendee = await createAccount("ATTENDEE");
  const unauthenticated = await request("/api/registrations/events/1", { method: "POST" });
  assert.equal(unauthenticated.response.status, 401);

  const malformed = await request("/api/registrations/events/not-an-id", {
    method: "POST", token: attendee.token,
  });
  assert.equal(malformed.response.status, 400);
  assert.equal(malformed.payload.error.code, "INVALID_EVENT_ID");

  const organizerAttempt = await request("/api/registrations/events/1", {
    method: "POST", token: organizer.token,
  });
  assert.equal(organizerAttempt.response.status, 403);

  const missingEvent = await request("/api/registrations/events/987654321", {
    method: "POST", token: attendee.token,
  });
  assert.equal(missingEvent.response.status, 404);
  assert.equal(missingEvent.payload.error.code, "EVENT_UNAVAILABLE");
});
