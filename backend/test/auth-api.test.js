const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const { Sequelize } = require("sequelize");
const bcrypt = require("bcryptjs");

const backendDir = path.resolve(__dirname, "..");
const databaseFile = path.join(
  os.tmpdir(),
  `ems-auth-tests-${process.pid}-${Date.now()}.sqlite`
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

function accountDetails(role = "ATTENDEE") {
  const suffix = `${process.pid}-${accountCounter++}`;
  return {
    name: role === "ORGANIZER" ? "Test Organizer" : "Test Attendee",
    email: `auth-${role.toLowerCase()}-${suffix}@example.com`,
    password: "TestPassword123!",
    role,
  };
}

async function registerAccount(overrides = {}) {
  const account = { ...accountDetails(), ...overrides };
  const result = await request("/api/auth/register", {
    method: "POST",
    body: account,
  });
  return { account, ...result };
}

async function loginAccount(account) {
  return request("/api/auth/login", {
    method: "POST",
    body: { email: account.email, password: account.password },
  });
}

test("registration creates an account and does not expose its password hash", async () => {
  const result = await registerAccount();

  assert.equal(result.response.status, 201, JSON.stringify(result.payload));
  assert.equal(result.payload.user.email, result.account.email);
  assert.equal(result.payload.user.role, "ATTENDEE");
  assert.ok(result.payload.user.id);
  assert.equal(Object.hasOwn(result.payload.user, "passwordHash"), false);
  assert.equal(Object.hasOwn(result.payload.user, "password"), false);
});

test("registration rejects duplicate email addresses", async () => {
  const first = await registerAccount();
  assert.equal(first.response.status, 201, JSON.stringify(first.payload));

  const duplicate = await request("/api/auth/register", {
    method: "POST",
    body: { ...first.account, name: "Another Name" },
  });

  assert.equal(duplicate.response.status, 409, JSON.stringify(duplicate.payload));
  assert.equal(duplicate.payload.error.code, "EMAIL_IN_USE");
});

test("registration stores a bcrypt password hash rather than plaintext", async () => {
  const registered = await registerAccount();
  assert.equal(registered.response.status, 201, JSON.stringify(registered.payload));

  const inspectionDb = new Sequelize({
    dialect: "sqlite",
    storage: databaseFile,
    logging: false,
  });

  try {
    const [rows] = await inspectionDb.query(
      "SELECT passwordHash FROM users WHERE email = :email",
      { replacements: { email: registered.account.email } }
    );

    assert.equal(rows.length, 1, "expected the registered user in the test database");
    assert.notEqual(rows[0].passwordHash, registered.account.password);
    assert.match(rows[0].passwordHash, /^\$2[aby]\$\d\d\$/);
    assert.equal(await bcrypt.compare(registered.account.password, rows[0].passwordHash), true);
  } finally {
    await inspectionDb.close();
  }
});

test("valid login returns an access token and a public user record", async () => {
  const registered = await registerAccount();
  assert.equal(registered.response.status, 201, JSON.stringify(registered.payload));

  const login = await loginAccount(registered.account);
  assert.equal(login.response.status, 200, JSON.stringify(login.payload));
  assert.equal(typeof login.payload.token, "string");
  assert.ok(login.payload.token.length > 20);
  assert.equal(login.payload.user.email, registered.account.email);
  assert.equal(Object.hasOwn(login.payload.user, "passwordHash"), false);
});

test("invalid credentials are rejected without revealing whether the email exists", async () => {
  const registered = await registerAccount();
  assert.equal(registered.response.status, 201, JSON.stringify(registered.payload));

  const wrongPassword = await loginAccount({
    ...registered.account,
    password: "WrongPassword123!",
  });
  const unknownAccount = await loginAccount({
    email: `missing-${process.pid}-${accountCounter++}@example.com`,
    password: "WrongPassword123!",
  });

  assert.equal(wrongPassword.response.status, 401);
  assert.equal(unknownAccount.response.status, 401);
  assert.equal(wrongPassword.payload.error.code, "INVALID_CREDENTIALS");
  assert.equal(unknownAccount.payload.error.code, "INVALID_CREDENTIALS");
  assert.equal(wrongPassword.payload.error.message, unknownAccount.payload.error.message);
});

test("protected account routes reject missing, malformed, and invalid tokens", async () => {
  const noToken = await request("/api/auth/me");
  assert.equal(noToken.response.status, 401);
  assert.equal(noToken.payload.error.code, "UNAUTHENTICATED");

  const malformedHeader = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { authorization: "Basic abc123" },
  });
  const malformedPayload = await malformedHeader.json();
  assert.equal(malformedHeader.status, 401);
  assert.equal(malformedPayload.error.code, "UNAUTHENTICATED");

  const invalidToken = await request("/api/auth/me", { token: "not-a-valid-token" });
  assert.equal(invalidToken.response.status, 401);
  assert.equal(invalidToken.payload.error.code, "UNAUTHENTICATED");
});

test("a valid token can access the current-user route", async () => {
  const registered = await registerAccount();
  assert.equal(registered.response.status, 201, JSON.stringify(registered.payload));

  const login = await loginAccount(registered.account);
  assert.equal(login.response.status, 200, JSON.stringify(login.payload));

  const currentUser = await request("/api/auth/me", { token: login.payload.token });
  assert.equal(currentUser.response.status, 200, JSON.stringify(currentUser.payload));
  assert.equal(currentUser.payload.user.id, login.payload.user.id);
  assert.equal(currentUser.payload.user.email, registered.account.email);
});

test("server-side role checks deny attendees and organizers access to restricted routes", async () => {
  const attendee = await registerAccount();
  assert.equal(attendee.response.status, 201, JSON.stringify(attendee.payload));
  const attendeeLogin = await loginAccount(attendee.account);
  assert.equal(attendeeLogin.response.status, 200, JSON.stringify(attendeeLogin.payload));

  const attendeeOrganizerRoute = await request("/api/example/organizer-only", {
    token: attendeeLogin.payload.token,
  });
  assert.equal(attendeeOrganizerRoute.response.status, 403);
  assert.equal(attendeeOrganizerRoute.payload.error.code, "FORBIDDEN");

  const organizer = await registerAccount({ role: "ORGANIZER", name: "Test Organizer" });
  assert.equal(organizer.response.status, 201, JSON.stringify(organizer.payload));
  const organizerLogin = await loginAccount(organizer.account);
  assert.equal(organizerLogin.response.status, 200, JSON.stringify(organizerLogin.payload));

  const allowedOrganizerRoute = await request("/api/example/organizer-only", {
    token: organizerLogin.payload.token,
  });
  assert.equal(allowedOrganizerRoute.response.status, 200);

  const forbiddenAdminRoute = await request("/api/example/admin-only", {
    token: organizerLogin.payload.token,
  });
  assert.equal(forbiddenAdminRoute.response.status, 403);
  assert.equal(forbiddenAdminRoute.payload.error.code, "FORBIDDEN");
});

test("self-registration cannot grant the ADMIN role", async () => {
  const result = await registerAccount({ role: "ADMIN" });
  assert.equal(result.response.status, 400, JSON.stringify(result.payload));
  assert.equal(result.payload.error.code, "INVALID_ROLE");
});
