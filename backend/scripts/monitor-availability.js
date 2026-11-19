#!/usr/bin/env node
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { setTimeout: delay } = require("node:timers/promises");

async function monitor({ url, intervalMs, durationMs, timeoutMs, output }) {
  const endpoint = new URL(url);
  if (!["http:", "https:"].includes(endpoint.protocol) || endpoint.username || endpoint.password) {
    throw new Error("Supply an HTTP(S) readiness URL without credentials.");
  }
  for (const value of [intervalMs, durationMs, timeoutMs]) {
    if (!Number.isSafeInteger(value) || value < 1) throw new Error("Intervals and duration must be positive integer milliseconds.");
  }
  if (timeoutMs > intervalMs) throw new Error("Timeout must not exceed the interval.");
  fs.mkdirSync(path.dirname(output), { recursive: true });
  // Exclusive creation prevents accidental overwriting of an earlier observation.
  const file = fs.openSync(output, "wx");
  const startedAt = new Date().toISOString();
  const start = performance.now();
  const expected = Math.ceil(durationMs / intervalMs);
  let up = 0;
  let down = 0;
  let missed = 0;
  try {
    for (let slot = 0; slot < expected; slot++) {
      const target = start + slot * intervalMs;
      await delay(Math.max(0, target - performance.now()));
      const began = performance.now();
      if (began >= target + intervalMs) {
        missed++;
        fs.writeSync(file, JSON.stringify({ slot, at: new Date().toISOString(), result: "UNKNOWN", reason: "Monitor missed scheduled interval" }) + "\n");
        continue;
      }
      let status = null;
      let ready = false;
      let error = null;
      try {
        const response = await fetch(endpoint, { signal: AbortSignal.timeout(timeoutMs), redirect: "error" });
        status = response.status;
        const body = await response.json();
        ready = response.status === 200 && body.status === "ready" && body.checks?.database === "ok";
      } catch (failure) {
        error = failure.name;
      }
      if (ready) up++;
      else down++;
      fs.writeSync(file, JSON.stringify({ slot, at: new Date().toISOString(), result: ready ? "UP" : "DOWN", status, latencyMs: Math.round(performance.now() - began), error }) + "\n");
      fs.fsyncSync(file);
    }
    await delay(Math.max(0, start + durationMs - performance.now()));
  } finally {
    fs.closeSync(file);
  }
  const summary = {
    url: endpoint.href, startedAt, completedAt: new Date().toISOString(),
    intervalMs, durationMs, timeoutMs, expected, up, down, unknown: missed,
    observedSampleAvailabilityPercent: up + down ? 100 * up / (up + down) : null,
    conservativeSampleAvailabilityPercent: 100 * up / expected,
    note: "Sample-based readiness observation. Missing intervals are unknown. A complete approved window and probe definition are required for an NFR conclusion.",
  };
  fs.writeFileSync(output + ".summary.json", JSON.stringify(summary, null, 2) + "\n", { flag: "wx" });
  return summary;
}

if (require.main === module) {
  const [url, intervalSeconds, durationMinutes, timeoutSeconds, output] = process.argv.slice(2);
  if (!output) {
    console.error("Usage: node scripts/monitor-availability.js URL INTERVAL_SECONDS DURATION_MINUTES TIMEOUT_SECONDS OUTPUT.jsonl");
    process.exitCode = 1;
  } else {
    monitor({ url, intervalMs: Number(intervalSeconds) * 1000, durationMs: Number(durationMinutes) * 60000, timeoutMs: Number(timeoutSeconds) * 1000, output })
      .then((summary) => console.log(JSON.stringify(summary, null, 2)))
      .catch((error) => { console.error(error.message); process.exitCode = 1; });
  }
}
module.exports = { monitor };
