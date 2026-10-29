#!/usr/bin/env node
"use strict";

/*
 * Repeatable local performance benchmark for the public Event Management API.
 *
 * The harness creates a disposable SQLite database, seeds synthetic future
 * events, starts the project's real Express server against that database,
 * then drives the public GET /api/events endpoint with concurrent clients.
 * It never reads or modifies backend/dev.db or any configured application DB.
 *
 * No third-party load-test package is required; fetch is built into Node 18+.
 */

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const net = require("node:net");
const { spawn } = require("node:child_process");
const { performance } = require("node:perf_hooks");

const DAY_MS = 24 * 60 * 60 * 1000;
const TARGET_MS = 2000;
const backendDir = path.resolve(__dirname, "..");

function parseArgs(argv) {
  const options = {
    datasetSize: 1000,
    concurrency: 100,
    requestsPerUser: 10,
    timeoutMs: 10000,
    searchTerm: "Benchmark",
    outputDir: "benchmark-results",
    help: false,
  };

  const allowed = new Set([
    "dataset-size",
    "concurrency",
    "requests-per-user",
    "timeout-ms",
    "search-term",
    "output-dir",
    "help",
  ]);

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith("--")) {
      throw new Error(`Unexpected argument: ${argument}`);
    }

    const key = argument.slice(2);
    if (!allowed.has(key)) throw new Error(`Unknown option: --${key}`);
    if (key === "help") {
      options.help = true;
      continue;
    }

    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }
    index += 1;

    switch (key) {
      case "dataset-size":
        options.datasetSize = Number(value);
        break;
      case "concurrency":
        options.concurrency = Number(value);
        break;
      case "requests-per-user":
        options.requestsPerUser = Number(value);
        break;
      case "timeout-ms":
        options.timeoutMs = Number(value);
        break;
      case "search-term":
        options.searchTerm = value;
        break;
      case "output-dir":
        options.outputDir = value;
        break;
      default:
        throw new Error(`Unsupported option: --${key}`);
    }
  }

  if (options.help) return options;
  const integerRules = [
    ["dataset-size", options.datasetSize, 1, 50000],
    ["concurrency", options.concurrency, 1, 500],
    ["requests-per-user", options.requestsPerUser, 1, 1000],
    ["timeout-ms", options.timeoutMs, 100, 60000],
  ];
  for (const [name, value, minimum, maximum] of integerRules) {
    if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
      throw new Error(`--${name} must be a whole number from ${minimum} to ${maximum}`);
    }
  }
  if (!options.searchTerm.trim()) throw new Error("--search-term cannot be empty");
  if (!options.outputDir.trim()) throw new Error("--output-dir cannot be empty");
  return options;
}

function printHelp() {
  process.stdout.write(`\nEMS event-search performance benchmark\n\n` +
    `Usage (from backend/):\n` +
    `  npm run benchmark:events -- [options]\n\n` +
    `Options:\n` +
    `  --dataset-size N       Synthetic future events to seed (default: 1000; max: 50000)\n` +
    `  --concurrency N        Concurrent workers (default: 100; max: 500)\n` +
    `  --requests-per-user N  Requests per worker (default: 10)\n` +
    `  --timeout-ms N         Per-request timeout (default: 10000)\n` +
    `  --search-term TEXT     Search term used by the text-filter scenario (default: Benchmark)\n` +
    `  --output-dir PATH      Directory for raw JSON/CSV output (default: benchmark-results)\n` +
    `  --help                 Show this help\n\n` +
    `The harness uses a disposable SQLite database and a local child server. It does not test\n` +
    `registration concurrency or capacity integrity because those API modules are not present.\n\n`);
}

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

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitForServer(server, baseUrl, getOutput) {
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`Backend exited before becoming healthy. Output:\n${getOutput()}`);
    }

    try {
      const response = await fetch(`${baseUrl}/api/health`, {
        signal: AbortSignal.timeout(1000),
      });
      if (response.ok) return;
    } catch {
      // The child may still be syncing the throwaway SQLite database.
    }
    await delay(150);
  }
  throw new Error(`Backend did not become healthy within 20 seconds. Output:\n${getOutput()}`);
}

async function seedDisposableDatabase(databaseFile, datasetSize) {
  // The database path is a new temporary file created by this process. Set it
  // before requiring the project Sequelize config so the real models use it.
  process.env.DATABASE_FILE = databaseFile;
  const sequelize = require("../src/config/db");
  const User = require("../src/models/User");
  const Event = require("../src/models/Event");

  try {
    await sequelize.sync({ force: true });
    const organizer = await User.create({
      name: "EMS Synthetic Benchmark Organizer",
      email: "benchmark-organizer@example.invalid",
      passwordHash: "not-a-real-login-hash-used-only-for-benchmarks",
      role: "ORGANIZER",
      isVerified: true,
    });

    const seedTime = Date.now();
    const recordsPerBatch = 250;
    for (let offset = 0; offset < datasetSize; offset += recordsPerBatch) {
      const batchSize = Math.min(recordsPerBatch, datasetSize - offset);
      const rows = Array.from({ length: batchSize }, (_, batchIndex) => {
        const index = offset + batchIndex;
        const startsAt = seedTime + (7 + (index % 180)) * DAY_MS;
        const category = index % 4 === 0
          ? "Technology"
          : index % 4 === 1
            ? "Academic"
            : index % 4 === 2
              ? "Cultural"
              : "Sports";

        return {
          title: `EMS Benchmark Event ${String(index + 1).padStart(6, "0")}`,
          description: `Synthetic performance benchmark record ${index + 1}. Not a real event.`,
          category,
          startDateTime: new Date(startsAt),
          endDateTime: new Date(startsAt + 60 * 60 * 1000),
          venue: `Benchmark Hall ${String(index % 25 + 1).padStart(2, "0")}`,
          capacity: 100,
          ticketPrice: 0,
          refundWindowHours: 24,
          status: "PUBLISHED",
          organizerId: organizer.id,
        };
      });
      await Event.bulkCreate(rows);
    }

    const count = await Event.count({ where: { status: "PUBLISHED" } });
    if (count !== datasetSize) {
      throw new Error(`Seed verification failed: expected ${datasetSize} events, found ${count}`);
    }
    await sequelize.close();
    return count;
  } catch (error) {
    await sequelize.close().catch(() => {});
    throw error;
  }
}

function buildScenarios(searchTerm) {
  const search = encodeURIComponent(searchTerm);
  return [
    { name: "listing", path: "/api/events?page=1&limit=50" },
    { name: "text-search", path: `/api/events?search=${search}&page=1&limit=50` },
    { name: "category-filter", path: "/api/events?category=Technology&page=1&limit=50" },
    { name: "location-filter", path: "/api/events?location=Hall&page=1&limit=50" },
  ];
}

async function measuredRequest(baseUrl, scenario, workerId, requestIndex, timeoutMs) {
  const startedAt = new Date().toISOString();
  const start = performance.now();
  let statusCode = null;
  let responseEventCount = null;
  let matchingTotal = null;
  let error = "";

  try {
    const response = await fetch(`${baseUrl}${scenario.path}`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    statusCode = response.status;
    const rawBody = await response.text();
    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      throw new Error(`Response was not valid JSON (HTTP ${statusCode})`);
    }

    if (!response.ok) {
      throw new Error(`Unexpected HTTP status ${statusCode}: ${JSON.stringify(payload).slice(0, 250)}`);
    }
    if (!Array.isArray(payload.events) || !payload.pagination ||
        !Number.isFinite(payload.pagination.total)) {
      throw new Error("Response did not match the expected event-list response schema");
    }
    responseEventCount = payload.events.length;
    matchingTotal = payload.pagination.total;
  } catch (requestError) {
    error = requestError && requestError.message ? requestError.message : String(requestError);
  }

  const latencyMs = Number((performance.now() - start).toFixed(3));
  return {
    startedAt,
    workerId,
    requestIndex,
    scenario: scenario.name,
    statusCode,
    latencyMs,
    success: error === "",
    responseEventCount,
    matchingTotal,
    error,
  };
}

function percentile(sortedValues, quantile) {
  if (sortedValues.length === 0) return null;
  return sortedValues[Math.max(0, Math.ceil(quantile * sortedValues.length) - 1)];
}

function summarize(rows) {
  const latencies = rows.map((row) => row.latencyMs).sort((a, b) => a - b);
  const successes = rows.filter((row) => row.success).length;
  const underTarget = rows.filter((row) => row.success && row.latencyMs < TARGET_MS).length;
  const avg = latencies.length
    ? latencies.reduce((sum, value) => sum + value, 0) / latencies.length
    : null;
  const totals = rows
    .map((row) => row.matchingTotal)
    .filter((value) => Number.isFinite(value));

  return {
    requestCount: rows.length,
    successes,
    failures: rows.length - successes,
    requestsUnder2Seconds: underTarget,
    requestsUnder2SecondsPercent: rows.length
      ? Number((underTarget * 100 / rows.length).toFixed(2))
      : null,
    latencyMs: {
      min: latencies.length ? latencies[0] : null,
      mean: avg === null ? null : Number(avg.toFixed(3)),
      p50: percentile(latencies, 0.50),
      p95: percentile(latencies, 0.95),
      p99: percentile(latencies, 0.99),
      max: latencies.length ? latencies[latencies.length - 1] : null,
    },
    matchingTotalMin: totals.length ? Math.min(...totals) : null,
    matchingTotalMax: totals.length ? Math.max(...totals) : null,
    meetsStrict2SecondTarget: rows.length > 0 && successes === rows.length && underTarget === rows.length,
  };
}

function csvCell(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(rows) {
  const columns = [
    "startedAt", "workerId", "requestIndex", "scenario", "statusCode",
    "latencyMs", "success", "responseEventCount", "matchingTotal", "error",
  ];
  return `${columns.join(",")}\n${rows.map((row) => columns.map((key) => csvCell(row[key])).join(",")).join("\n")}\n`;
}

async function stopServer(server) {
  if (!server || server.exitCode !== null) return;
  const exited = new Promise((resolve) => server.once("exit", resolve));
  server.kill("SIGTERM");
  await Promise.race([exited, delay(2000)]);
  if (server.exitCode === null) server.kill("SIGKILL");
}

async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${error.message}\nRun with --help for usage.\n`);
    process.exitCode = 2;
    return;
  }
  if (options.help) {
    printHelp();
    return;
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "ems-issue31-benchmark-"));
  const databaseFile = path.join(tempDir, "benchmark.sqlite");
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const serverEnvironment = {
    ...process.env,
    NODE_ENV: "test",
    DATABASE_FILE: databaseFile,
    PORT: String(port),
    JWT_SECRET: "local-performance-benchmark-only-secret-not-for-production",
    EMAIL_VERIFICATION_SECRET: "local-performance-benchmark-verification-only",
  };

  let server;
  let serverOutput = "";
  const getOutput = () => serverOutput;
  try {
    const seedStarted = performance.now();
    const seededEventCount = await seedDisposableDatabase(databaseFile, options.datasetSize);
    const seedDurationMs = Number((performance.now() - seedStarted).toFixed(3));

    server = spawn(process.execPath, ["src/server.js"], {
      cwd: backendDir,
      env: serverEnvironment,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const appendOutput = (chunk) => {
      serverOutput = (serverOutput + chunk.toString()).slice(-12000);
    };
    server.stdout.on("data", appendOutput);
    server.stderr.on("data", appendOutput);

    const startupStarted = performance.now();
    await waitForServer(server, baseUrl, getOutput);
    const startupDurationMs = Number((performance.now() - startupStarted).toFixed(3));

    const scenarios = buildScenarios(options.searchTerm);
    // A single request per scenario warms the server/SQLite before measurement.
    for (const scenario of scenarios) {
      const warmup = await measuredRequest(baseUrl, scenario, -1, -1, options.timeoutMs);
      if (!warmup.success) {
        throw new Error(`Warm-up failed for ${scenario.name}: ${warmup.error}`);
      }
    }

    process.stdout.write(
      `Running ${options.concurrency} concurrent workers, ` +
      `${options.requestsPerUser} requests each, dataset=${seededEventCount} synthetic events...\n`
    );
    const runStarted = performance.now();
    const rowsByWorker = await Promise.all(Array.from({ length: options.concurrency }, async (_, workerId) => {
      const workerRows = [];
      for (let requestIndex = 0; requestIndex < options.requestsPerUser; requestIndex += 1) {
        const scenario = scenarios[(workerId + requestIndex) % scenarios.length];
        workerRows.push(await measuredRequest(
          baseUrl,
          scenario,
          workerId,
          requestIndex,
          options.timeoutMs
        ));
      }
      return workerRows;
    }));
    const runDurationMs = Number((performance.now() - runStarted).toFixed(3));
    const rawRows = rowsByWorker.flat();
    const overall = summarize(rawRows);
    overall.requestsPerSecond = runDurationMs > 0
      ? Number((rawRows.length * 1000 / runDurationMs).toFixed(3))
      : null;

    const perScenario = {};
    for (const scenario of scenarios) {
      perScenario[scenario.name] = summarize(rawRows.filter((row) => row.scenario === scenario.name));
    }

    const databaseBytes = fs.statSync(databaseFile).size;
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const outputDir = path.resolve(process.cwd(), options.outputDir);
    fs.mkdirSync(outputDir, { recursive: true });
    const jsonPath = path.join(outputDir, `issue-31-benchmark-${timestamp}.json`);
    const csvPath = path.join(outputDir, `issue-31-benchmark-${timestamp}.csv`);

    const result = {
      issue: 31,
      title: "Verify performance, concurrency, and data-integrity NFRs",
      generatedAt: new Date().toISOString(),
      environment: {
        scope: "local isolated SQLite benchmark",
        baseUrl,
        operatingSystem: `${os.type()} ${os.release()}`,
        platform: os.platform(),
        architecture: os.arch(),
        nodeVersion: process.version,
        cpuModel: os.cpus()[0] ? os.cpus()[0].model : "unknown",
        logicalCpuCount: os.cpus().length,
        totalSystemMemoryBytes: os.totalmem(),
        databaseDialect: "SQLite",
        seededDatabaseBytes: databaseBytes,
        databasePath: "temporary database; removed after the run",
        backendStartupMs: startupDurationMs,
      },
      workload: {
        syntheticFuturePublishedEvents: seededEventCount,
        seedDurationMs,
        concurrency: options.concurrency,
        requestsPerWorker: options.requestsPerUser,
        plannedMeasuredRequests: options.concurrency * options.requestsPerUser,
        timeoutMs: options.timeoutMs,
        warmupRequests: scenarios.length,
        searchTerm: options.searchTerm,
        scenarios: scenarios.map(({ name, path: route }) => ({ name, route })),
        measurementDurationMs: runDurationMs,
        targetLatencyMs: TARGET_MS,
        strictTargetDefinition: "Every measured request succeeds and completes in less than 2000 ms.",
      },
      summary: overall,
      byScenario: perScenario,
      requirementDisposition: {
        eventSearchListingNfrPerf01: overall.meetsStrict2SecondTarget ? "PASS_FOR_THIS_LOCAL_RUN" : "NOT_MET_OR_NOT_PROVEN_BY_THIS_RUN",
        registrationConcurrencyNfrPerf02: "BLOCKED_NOT_TESTED",
        registrationCapacityAndConfirmedRecordIntegrity: "BLOCKED_NOT_TESTED",
        limitation: "This repository snapshot has no registration route/model or confirmed-paid registration records. The harness does not claim to test registration concurrency or transactional capacity integrity.",
      },
      rawResults: rawRows,
    };

    fs.writeFileSync(jsonPath, `${JSON.stringify(result, null, 2)}\n`);
    fs.writeFileSync(csvPath, toCsv(rawRows));

    process.stdout.write(`\nOverall: ${overall.successes}/${overall.requestCount} successful; ` +
      `p95=${overall.latencyMs.p95} ms; max=${overall.latencyMs.max} ms; ` +
      `under 2s=${overall.requestsUnder2SecondsPercent}%\n`);
    process.stdout.write(`Search/listing target for this run: ${overall.meetsStrict2SecondTarget ? "MET" : "NOT MET / NOT PROVEN"}\n`);
    process.stdout.write(`JSON results: ${jsonPath}\nCSV raw results: ${csvPath}\n`);
    process.stdout.write("Registration concurrency and capacity integrity: NOT TESTED (no registration flow in this snapshot).\n");
    if (overall.failures > 0 || !overall.meetsStrict2SecondTarget) process.exitCode = 1;
  } catch (error) {
    process.stderr.write(`Benchmark failed: ${error.stack || error.message}\n`);
    if (serverOutput) process.stderr.write(`Backend output:\n${serverOutput}\n`);
    process.exitCode = 1;
  } finally {
    await stopServer(server);
    // Remove only the temporary directory created by this run.
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

main();
