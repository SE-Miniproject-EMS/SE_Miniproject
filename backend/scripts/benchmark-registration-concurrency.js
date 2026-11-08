#!/usr/bin/env node
"use strict";

/*
 * Controlled 500-attempt registration integrity benchmark.
 *
 * Uses a disposable SQLite database, synthetic users and the real Express
 * registration endpoint. It does not touch backend/dev.db or configured data.
 * The script measures a local development configuration only; it is not a
 * production scalability or PCI-compliance test.
 */

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const net = require("node:net");
const { spawn } = require("node:child_process");
const { performance } = require("node:perf_hooks");

const backendDir = path.resolve(__dirname, "..");
const attempts = Number(process.env.REGISTRATION_BENCHMARK_ATTEMPTS || 500);
const capacity = Number(process.env.REGISTRATION_BENCHMARK_CAPACITY || 100);
const timeoutMs = Number(process.env.REGISTRATION_BENCHMARK_TIMEOUT_MS || 120000);
const outputDirArg = process.env.REGISTRATION_BENCHMARK_OUTPUT_DIR || "../docs/issue-31-results";

function validateOptions() {
  if (!Number.isSafeInteger(attempts) || attempts !== 500) {
    throw new Error("REGISTRATION_BENCHMARK_ATTEMPTS must be exactly 500 for issue #31 verification");
  }
  if (!Number.isSafeInteger(capacity) || capacity < 1 || capacity >= attempts) {
    throw new Error("REGISTRATION_BENCHMARK_CAPACITY must be between 1 and 499");
  }
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1000) {
    throw new Error("REGISTRATION_BENCHMARK_TIMEOUT_MS must be at least 1000");
  }
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const port = probe.address().port;
      probe.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(child, baseUrl, getOutput) {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Backend exited before becoming healthy:\n${getOutput()}`);
    }
    try {
      const response = await fetch(`${baseUrl}/api/health`, {
        signal: AbortSignal.timeout(1000),
      });
      if (response.ok) return;
    } catch {
      // Wait for Sequelize sync and Express startup.
    }
    await delay(150);
  }
  throw new Error(`Backend did not become healthy within 30 seconds:\n${getOutput()}`);
}

function percentile(sorted, quantile) {
  if (!sorted.length) return null;
  return sorted[Math.max(0, Math.ceil(quantile * sorted.length) - 1)];
}

function csvCell(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(rows) {
  const columns = [
    "attempt", "statusCode", "latencyMs", "registrationStatus",
    "success", "error",
  ];
  return `${columns.join(",")}\n${rows.map((row) =>
    columns.map((column) => csvCell(row[column])).join(",")
  ).join("\n")}\n`;
}

async function stopServer(child) {
  if (!child || child.exitCode !== null) return;
  const exited = new Promise((resolve) => child.once("exit", resolve));
  child.kill("SIGTERM");
  await Promise.race([exited, delay(3000)]);
  if (child.exitCode === null) child.kill("SIGKILL");
}

async function main() {
  validateOptions();

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "ems-registration-benchmark-"));
  const databaseFile = path.join(tempDir, "benchmark.sqlite");
  const secret = `issue31-benchmark-${process.pid}-${Date.now()}-secret`;
  const emailSecret = `issue31-email-${process.pid}-${Date.now()}-secret`;
  let sequelize;
  let child;
  let childOutput = "";
  let report;

  try {
    // The database path and secrets must be set before importing project modules.
    process.env.DATABASE_FILE = databaseFile;
    process.env.JWT_SECRET = secret;
    process.env.JWT_EXPIRES_IN = "2h";
    process.env.EMAIL_VERIFICATION_SECRET = emailSecret;
    process.env.SESSION_IDLE_TIMEOUT_SECONDS = "1800";

    sequelize = require("../src/config/db");
    const User = require("../src/models/User");
    require("../src/models/Session");
    const Event = require("../src/models/Event");
    const Registration = require("../src/models/Registration");
    require("../src/models/Notification");
    require("../src/models/Feedback");
    const { signAccessToken, verifyAccessToken } = require("../src/utils/jwt");

    await sequelize.sync({ force: true });

    const now = Date.now();
    const organizer = await User.create({
      name: "Issue 31 Benchmark Organizer",
      email: `issue31-organizer-${process.pid}@example.invalid`,
      passwordHash: "benchmark-only-not-a-real-password-hash",
      role: "ORGANIZER",
      isVerified: true,
    });

    const users = await User.bulkCreate(Array.from({ length: attempts }, (_, index) => ({
      name: `Issue 31 Synthetic Attendee ${index + 1}`,
      email: `issue31-attendee-${process.pid}-${index + 1}@example.invalid`,
      passwordHash: "benchmark-only-not-a-real-password-hash",
      role: "ATTENDEE",
      isVerified: true,
    })));

    const startsAt = new Date(now + 24 * 60 * 60 * 1000);
    const event = await Event.create({
      title: "Issue 31 500-attempt integrity benchmark",
      description: "Synthetic disposable benchmark event; not a real event.",
      category: "Benchmark",
      startDateTime: startsAt,
      endDateTime: new Date(startsAt.getTime() + 60 * 60 * 1000),
      venue: "Disposable Benchmark Hall",
      capacity,
      seatsTaken: 0,
      ticketPrice: 0,
      refundWindowHours: 0,
      status: "PUBLISHED",
      organizerId: organizer.id,
    });

    const tokens = users.map((user) => signAccessToken(user));
    const sessionRows = tokens.map((token) => {
      const claims = verifyAccessToken(token);
      return {
        id: claims.jti,
        idleExpiresAt: Math.min(claims.exp * 1000, Date.now() + 30 * 60 * 1000),
      };
    });
    // Insert in small batches to stay below SQLite's bind-parameter limit.
    for (let offset = 0; offset < sessionRows.length; offset += 100) {
      const batch = sessionRows.slice(offset, offset + 100);
      const values = batch.map(() => "(?, ?)").join(", ");
      await sequelize.query(
        `INSERT INTO sessions (id, idleExpiresAt) VALUES ${values}`,
        { replacements: batch.flatMap((row) => [row.id, row.idleExpiresAt]) }
      );
    }

    const port = await getFreePort();
    const baseUrl = `http://127.0.0.1:${port}`;
    child = spawn(process.execPath, ["src/server.js"], {
      cwd: backendDir,
      env: {
        ...process.env,
        PORT: String(port),
        DATABASE_FILE: databaseFile,
        JWT_SECRET: secret,
        JWT_EXPIRES_IN: "2h",
        EMAIL_VERIFICATION_SECRET: emailSecret,
        SESSION_IDLE_TIMEOUT_SECONDS: "1800",
        NODE_ENV: "test",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout.on("data", (chunk) => { childOutput += chunk.toString(); });
    child.stderr.on("data", (chunk) => { childOutput += chunk.toString(); });
    await waitForServer(child, baseUrl, () => childOutput);

    const startedAt = new Date().toISOString();
    const started = performance.now();
    const rows = await Promise.all(tokens.map(async (token, index) => {
      const requestStarted = performance.now();
      let statusCode = null;
      let registrationStatus = null;
      let error = "";
      try {
        const response = await fetch(`${baseUrl}/api/registrations/events/${event.id}`, {
          method: "POST",
          headers: {
            authorization: `Bearer ${token}`,
            accept: "application/json",
          },
          signal: AbortSignal.timeout(timeoutMs),
        });
        statusCode = response.status;
        const payload = await response.json();
        if (!response.ok) {
          error = payload?.error?.code || `HTTP_${response.status}`;
        } else {
          registrationStatus = payload?.registration?.status || null;
          if (!["CONFIRMED", "WAITLISTED"].includes(registrationStatus)) {
            error = "Unexpected registration response status";
          }
        }
      } catch (requestError) {
        error = requestError?.message || String(requestError);
      }
      return {
        attempt: index + 1,
        statusCode,
        latencyMs: Number((performance.now() - requestStarted).toFixed(3)),
        registrationStatus,
        success: error === "",
        error,
      };
    }));
    const durationMs = Number((performance.now() - started).toFixed(3));

    const finalEvent = await Event.findByPk(event.id);
    const grouped = await Registration.findAll({
      attributes: ["status", [require("sequelize").fn("COUNT", require("sequelize").col("id")), "count"]],
      where: { eventId: event.id },
      group: ["status"],
      raw: true,
    });
    const counts = { CONFIRMED: 0, WAITLISTED: 0, CANCELLED: 0 };
    for (const row of grouped) counts[row.status] = Number(row.count);

    const latencies = rows.map((row) => row.latencyMs).sort((a, b) => a - b);
    const failures = rows.filter((row) => !row.success);
    const actualTotal = counts.CONFIRMED + counts.WAITLISTED + counts.CANCELLED;
    const integrity = {
      attempts: rows.length,
      uniqueRegistrationRecords: actualTotal,
      expectedRegistrationRecords: attempts,
      confirmedCount: counts.CONFIRMED,
      waitlistedCount: counts.WAITLISTED,
      cancelledCount: counts.CANCELLED,
      configuredCapacity: capacity,
      eventSeatsTaken: Number(finalEvent.seatsTaken),
      confirmedDoesNotExceedCapacity: counts.CONFIRMED <= capacity,
      confirmedCountMatchesSeatsTaken: counts.CONFIRMED === Number(finalEvent.seatsTaken),
      allAttemptsPersistedExactlyOnce: actualTotal === attempts,
      expectedConfirmedCount: capacity,
      expectedWaitlistedCount: attempts - capacity,
    };
    const passed = failures.length === 0 &&
      integrity.confirmedCount === capacity &&
      integrity.waitlistedCount === attempts - capacity &&
      integrity.confirmedDoesNotExceedCapacity &&
      integrity.confirmedCountMatchesSeatsTaken &&
      integrity.allAttemptsPersistedExactlyOnce;

    report = {
      issue: 31,
      benchmark: "500 concurrent registration attempts",
      startedAt,
      completedAt: new Date().toISOString(),
      environment: {
        platform: process.platform,
        architecture: process.arch,
        nodeVersion: process.version,
        cpuModel: os.cpus()[0]?.model || "unknown",
        cpuCount: os.cpus().length,
        totalMemoryBytes: os.totalmem(),
        database: "disposable SQLite file",
        applicationInstances: 1,
      },
      workload: {
        concurrentAttempts: attempts,
        eventCapacity: capacity,
        syntheticAttendees: users.length,
        eventId: event.id,
        timeoutMs,
        durationMs,
      },
      latencyMs: {
        min: latencies[0] ?? null,
        mean: latencies.length ? Number((latencies.reduce((sum, value) => sum + value, 0) / latencies.length).toFixed(3)) : null,
        p50: percentile(latencies, 0.50),
        p95: percentile(latencies, 0.95),
        p99: percentile(latencies, 0.99),
        max: latencies.at(-1) ?? null,
      },
      responseSummary: {
        successes: rows.length - failures.length,
        failures: failures.length,
        httpStatuses: rows.reduce((result, row) => {
          const key = String(row.statusCode ?? "NO_RESPONSE");
          result[key] = (result[key] || 0) + 1;
          return result;
        }, {}),
        registrationStatuses: rows.reduce((result, row) => {
          const key = row.registrationStatus || "NO_REGISTRATION";
          result[key] = (result[key] || 0) + 1;
          return result;
        }, {}),
      },
      integrity,
      passed,
      limitations: [
        "One local API process and a disposable SQLite database; this does not prove multi-instance production scalability.",
        "Only free-event registration is exercised. Payment-provider and paid-registration integrity are not tested.",
        "Synthetic users are pre-seeded and authenticated; account creation/login throughput is intentionally outside this workload.",
      ],
      failures,
      rawRequests: rows,
    };

    const outputDir = path.resolve(backendDir, outputDirArg);
    fs.mkdirSync(outputDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const jsonPath = path.join(outputDir, `issue-31-registration-${stamp}.json`);
    const csvPath = path.join(outputDir, `issue-31-registration-${stamp}.csv`);
    fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
    fs.writeFileSync(csvPath, toCsv(rows));

    process.stdout.write(`${JSON.stringify({
      passed,
      attempts,
      durationMs,
      latencyMs: report.latencyMs,
      responseSummary: report.responseSummary,
      integrity,
      jsonPath,
      csvPath,
    }, null, 2)}\n`);

    if (!passed) process.exitCode = 1;
  } finally {
    await stopServer(child);
    if (sequelize) await sequelize.close().catch(() => {});
    for (const suffix of ["", "-shm", "-wal", "-journal"]) {
      try { fs.unlinkSync(databaseFile + suffix); } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
    }
    try { fs.rmdirSync(tempDir); } catch { /* Preserve directory if a process still holds a file. */ }
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message || String(error)}\n`);
  process.exitCode = 1;
});
