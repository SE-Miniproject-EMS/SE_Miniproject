
const assert = require("node:assert/strict");
const { test } = require("node:test");
const { Client } = require("pg");
const jwt = require("jsonwebtoken");
const { randomUUID } = require("node:crypto");
const { spawn } = require("node:child_process");
const net = require("node:net");
const path = require("node:path");

test("PostgreSQL supports sessions, capacity, FIFO, reporting and mock payment retries", {
  skip: !process.env.TEST_POSTGRES_ADMIN_URL,
  timeout: 120000,
}, async () => {
  const admin = new Client({ connectionString: process.env.TEST_POSTGRES_ADMIN_URL });
  await admin.connect();
  const database = "ems_test_" + process.pid + "_" + Date.now();
  await admin.query('CREATE DATABASE "' + database + '"');
  const url = new URL(process.env.TEST_POSTGRES_ADMIN_URL);
  url.pathname = "/" + database;
  const db = new Client({ connectionString: url.href });
  let server;
  const secret = randomUUID();
  let output = "";
  try {
    await db.connect();
    const port = await new Promise((resolve, reject) => {
      const probe = net.createServer();
      probe.on("error", reject);
      probe.listen(0, "127.0.0.1", () => { const p = probe.address().port; probe.close(() => resolve(p)); });
    });
    server = spawn(process.execPath, ["src/server.js"], {
      cwd: path.resolve(__dirname, ".."),
      env: { ...process.env, DATABASE_URL: url.href, DATABASE_SSL: "false", PORT: String(port),
        JWT_SECRET: secret, EMAIL_VERIFICATION_SECRET: secret, NODE_ENV: "test", NOTIFICATION_ADAPTER: "console" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    server.stdout.on("data", (chunk) => { output += chunk; });
    server.stderr.on("data", (chunk) => { output += chunk; });
    const base = "http://127.0.0.1:" + port;
    let ready = false;
    for (let i = 0; i < 150 && !ready; i++) {
      if (server.exitCode !== null) throw new Error("PostgreSQL backend failed to start");
      try { ready = (await fetch(base + "/api/health/ready")).ok; } catch {}
      if (!ready) await new Promise((r) => setTimeout(r, 100));
    }
    assert.ok(ready, "PostgreSQL readiness must pass");
    async function request(route, method = "GET", token, body) {
      const response = await fetch(base + "/api" + route, { method,
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) },
        body: body ? JSON.stringify(body) : undefined });
      const data = await response.json();
      return { status: response.status, data };
    }
    const registered = await request("/auth/register", "POST", null, {
      name: "Postgres Organizer", email: "organizer@example.invalid", password: "PostgresTest123!", role: "ORGANIZER",
    });
    assert.equal(registered.status, 201);
    const verification = jwt.sign({ sub: registered.data.user.id, purpose: "email_verification" }, secret);
    assert.equal((await request("/auth/verify/" + verification)).status, 200);
    const login = await request("/auth/login", "POST", null, { email: "organizer@example.invalid", password: "PostgresTest123!" });
    assert.equal(login.status, 200);
    const organizer = login.data.token;
    const expiryBefore = await db.query('SELECT "idleExpiresAt" FROM sessions LIMIT 1');
    assert.equal((await request("/auth/me", "GET", organizer)).status, 200);
    assert.ok(Number((await db.query('SELECT "idleExpiresAt" FROM sessions LIMIT 1')).rows[0].idleExpiresAt) >= Number(expiryBefore.rows[0].idleExpiresAt));

    async function attendee(index) {
      const email = "attendee" + index + "@example.invalid";
      const { rows: [user] } = await db.query('INSERT INTO users (name,email,"passwordHash",role,"isVerified","createdAt","updatedAt") VALUES ($1,$2,$3,$4,true,NOW(),NOW()) RETURNING id', ["Attendee", email, "unused-fixture-hash", "ATTENDEE"]);
      const jti = randomUUID();
      const token = jwt.sign({ sub: user.id, email, role: "ATTENDEE" }, secret, { jwtid: jti, expiresIn: "1h" });
      await db.query('INSERT INTO sessions (id,"idleExpiresAt") VALUES ($1,$2)', [jti, Date.now() + 1800000]);
      return { id: user.id, token, jti };
    }
    const attendees = [];
    for (let i = 0; i < 20; i++) attendees.push(await attendee(i));
    async function event(ticketPrice = 0) {
      const starts = Date.now() + 3 * 86400000;
      const created = await request("/events", "POST", organizer, {
        title: "Postgres event", description: "Postgres integration", category: "Academic", venue: "Test",
        startDateTime: new Date(starts).toISOString(), endDateTime: new Date(starts + 3600000).toISOString(),
        capacity: 1, ticketPrice, refundWindowHours: 24,
      });
      assert.equal(created.status, 201, JSON.stringify(created.data));
      const id = created.data.event.id;
      assert.equal((await request("/events/" + id + "/publish", "POST", organizer)).status, 200);
      return id;
    }
    const id = await event();
    const results = await Promise.all(attendees.map((a) => request("/registrations/events/" + id, "POST", a.token)));
    assert.ok(results.every((r) => r.status === 201), JSON.stringify(results));
    assert.equal(results.filter((r) => r.data.registration.status === "CONFIRMED").length, 1);
    assert.equal(results.filter((r) => r.data.registration.status === "WAITLISTED").length, 19);
    const winner = results.findIndex((r) => r.data.registration.status === "CONFIRMED");
    assert.equal((await request("/registrations/events/" + id, "POST", attendees[winner].token)).status, 409);
    const head = (await db.query('SELECT id FROM registrations WHERE "eventId"=$1 AND status=$2 ORDER BY "waitlistPositionAt",id LIMIT 1', [id, "WAITLISTED"])).rows[0].id;
    assert.equal((await request("/registrations/" + results[winner].data.registration.id + "/cancel", "POST", attendees[winner].token)).status, 200);
    assert.equal((await db.query("SELECT status FROM registrations WHERE id=$1", [head])).rows[0].status, "CONFIRMED");
    assert.equal((await db.query('SELECT "seatsTaken" FROM events WHERE id=$1', [id])).rows[0].seatsTaken, 1);
    const report = await request("/reports?eventId=" + id + "&from=" + new Date().toISOString().slice(0, 10), "GET", organizer);
    assert.equal(report.status, 200, JSON.stringify(report.data));
    assert.equal(report.data.totals.confirmed, 1);
    const csv = await fetch(base + "/api/reports/registrations.csv?eventId=" + id, { headers: { Authorization: "Bearer " + organizer } });
    assert.equal(csv.status, 200);
    assert.match(await csv.text(), /event_id,event_title/);

    const paidEvent = await event(10);
    const buyer = attendees[winner];
    const checkout = await request("/registrations/events/" + paidEvent, "POST", buyer.token);
    assert.equal(checkout.status, 201);
    assert.equal((await request("/payments/" + checkout.data.payment.id + "/mock-outcome", "POST", buyer.token, { outcome: "FAILURE" })).status, 200);
    const retry = await request("/registrations/" + checkout.data.registration.id + "/retry-payment", "POST", buyer.token);
    assert.equal(retry.status, 201, JSON.stringify(retry.data));
    const success = await request("/payments/" + retry.data.payment.id + "/mock-outcome", "POST", buyer.token, { outcome: "SUCCESS" });
    assert.equal(success.status, 200);
    const paidReport = await request("/reports?eventId=" + paidEvent, "GET", organizer);
    assert.equal(paidReport.data.totals.simulatedRevenuePaise, 1000);
    assert.equal(paidReport.data.totals.revenuePaise, 0);
    const cancels = await Promise.all([1, 2].map(() => request("/events/" + paidEvent + "/cancel", "POST", organizer)));
    assert.equal(cancels.filter((r) => r.status === 200).length, 1);
    assert.equal(cancels.filter((r) => r.status === 409 && r.data.error.code === "ALREADY_CANCELLED").length, 1);
    assert.equal(Number((await db.query("SELECT COUNT(*) AS count FROM refunds")).rows[0].count), 1);
    await db.query('UPDATE sessions SET "idleExpiresAt"=0 WHERE id=$1', [buyer.jti]);
    assert.equal((await request("/auth/me", "GET", buyer.token)).status, 401);
    assert.equal((await request("/auth/me", "GET", organizer)).status, 200);
  } finally {
    if (server && server.exitCode === null) {
      const exited = new Promise((resolve) => server.once("exit", resolve));
      server.kill("SIGTERM");
      await exited;
    }
    await db.end();
    await admin.query('DROP DATABASE "' + database + '"');
    await admin.end();
  }
});
