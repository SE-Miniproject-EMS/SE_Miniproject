const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");

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
      JWT_SECRET: "ems-test-jwt-secret-change-me",
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

  const login = await request("/api/auth/login", {
    method: "POST",
    body: { email, password: "TestPassword123!" },
  });

  assert.equal(
    login.response.status,
    200,
    `login failed: ${JSON.stringify(login.payload)}`
  );

  return { token: login.payload.token, user: login.payload.user };
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

test("organizer can create, view, publish, and cancel an event", async () => {
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

  const published = await request(`/api/events/${created.payload.event.id}/publish`, {
    method: "POST",
    token: organizer.token,
  });
  assert.equal(published.response.status, 200, JSON.stringify(published.payload));
  assert.equal(published.payload.event.status, "PUBLISHED");

  const publicDetails = await request(`/api/events/${created.payload.event.id}`);
  assert.equal(publicDetails.response.status, 200);
  assert.equal(publicDetails.payload.event.id, created.payload.event.id);

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
