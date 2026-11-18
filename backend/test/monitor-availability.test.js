const assert = require("node:assert/strict");
const { test } = require("node:test");
const http = require("node:http");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { monitor } = require("../scripts/monitor-availability");

test("monitor saves successful, failing and malformed readiness observations", async () => {
  let count = 0;
  const server = http.createServer((req, res) => {
    count++;
    res.setHeader("Content-Type", "application/json");
    if (count === 1) res.end(JSON.stringify({ status: "ready", checks: { database: "ok" } }));
    else if (count === 2) { res.statusCode = 503; res.end("{}"); }
    else res.end("invalid JSON");
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "ems-monitor-"));
  const output = path.join(directory, "observations.jsonl");
  try {
    const result = await monitor({
      url: "http://127.0.0.1:" + server.address().port, intervalMs: 500, durationMs: 1500,
      timeoutMs: 250, output,
    });
    assert.equal(result.expected, 3);
    assert.equal(result.up + result.down + result.unknown, 3);
    assert.ok(result.up >= 1);
    assert.ok(result.down >= 1);
    assert.equal(fs.readFileSync(output, "utf8").trim().split("\n").length, 3);
    assert.equal(JSON.parse(fs.readFileSync(output + ".summary.json")).expected, 3);
    await assert.rejects(monitor({
      url: "http://127.0.0.1:" + server.address().port, intervalMs: 500, durationMs: 500,
      timeoutMs: 250, output,
    }), { code: "EEXIST" });
  } finally {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(directory, { recursive: true });
  }
});
