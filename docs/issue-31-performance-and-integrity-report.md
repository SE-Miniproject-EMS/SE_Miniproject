# Issue #31: Performance, Concurrency, and Data-Integrity NFR Verification

## Status and scope

**Baseline note (31 October 2026):** The search benchmark was recorded before the current registration implementation. The current checkout includes a Registration model/API and conditional transactional capacity update; the integration suite covers basic one-seat capacity and waitlisting, but no 500-concurrent load run is recorded.

This report records the repeatable benchmark procedure and the current repository limitations for SRS requirements NFR-PERF-01, NFR-PERF-02, and the data-integrity/safety requirement in SRS §6.2.

- **NFR-PERF-01 (event search/listing):** can be measured now using the public `GET /api/events` endpoint.
- **NFR-PERF-02 (500 concurrent registration attempts):** not tested. Registration and transactional capacity gating exist, but no 500-concurrent load test is recorded. Paid-registration integrity cannot be exercised because payment is absent.
- **Capacity and record integrity:** basic free-event capacity/waitlist behavior has functional test coverage. Concurrency integrity is not verified under load, and paid-record retention cannot be assessed because payments are absent. A `GET /api/events` benchmark does not establish either guarantee.

Do not mark the full issue as passed based on the event search benchmark alone.

## Repeatable local procedure

The harness is `backend/scripts/benchmark-event-search.js`. It uses the project's actual Express server and Sequelize event model, creates a disposable SQLite database in the OS temporary directory, seeds future published synthetic events, and removes the temporary database at the end. It does not touch `backend/dev.db` or an explicitly configured application database. It uses Node's built-in `fetch`; no new load-testing dependency is needed.

From the repository root:

```bash
cd backend
npm ci
npm run benchmark:events -- --dataset-size 1000 --concurrency 100 --requests-per-user 10 --output-dir ../docs/issue-31-results
```

The command creates 1,000 synthetic future published events and makes 1,000 measured requests using 100 concurrent workers (10 requests per worker). Requests are distributed in round-robin order across:

1. Unfiltered event listing (`page=1&limit=50`)
2. Text search (`search=Benchmark` by default)
3. Category filtering (`category=Technology`)
4. Location filtering (`location=Hall`)

Four unmeasured warm-up requests are sent first, one per scenario. A request's latency includes waiting for the HTTP response and reading/parsing its JSON body. Each measured response must have HTTP 200 and the expected `{ events, pagination }` response shape. The per-request timeout defaults to 10 seconds.

The dataset size, concurrency, requests per worker, timeout, search term, and output directory are configurable. Use `npm run benchmark:events -- --help` to see the options. Change only one workload dimension per comparative run and record each run's output separately.

## Measurement environment and interpretation

The generated JSON records the run timestamp, OS, architecture, Node version, CPU model/count, total system memory, SQLite database file size, synthetic event count, warm-up count, measured request count, scenario paths, duration, raw request latencies, HTTP statuses, errors, and summary percentiles (min/mean/p50/p95/p99/max). The CSV contains one row per measured request for further analysis. The script exits with a non-zero status if a request fails or the strict 2-second target is not met; it still writes the JSON and CSV first so that a failed run remains diagnosable.

The strict 2-second pass flag is conservative: every measured request must succeed and finish in **less than 2,000 ms**. The report also provides p50/p95/p99 and the proportion under 2 seconds, so outliers are visible rather than hidden by an average. A local run measures the development stack on the recorded machine; it is not evidence of production or multi-instance performance. SQLite is a single-file development database and should not be treated as a substitute for the intended shared production database.

The default output directory (`backend/benchmark-results`) is ignored by Git. The command above explicitly saves artifacts to `docs/issue-31-results`; inspect them before including them in the PR. Do not commit results from a failed or interrupted run without marking them accordingly.

## Results

One local isolated SQLite benchmark was completed on Darwin 27.0.0 using Node v22.19.0, 100 concurrent workers and 1,000 measured requests against 1,000 synthetic published events. Result: 1000/1000 requests succeeded; p95 latency was 178.211 ms, maximum latency was 259.926 ms, and 100.00% completed under two seconds. This result applies only to this local search/listing workload. Registration concurrency and paid-record integrity remain NOT_TESTED; the registration flow exists, but this search benchmark did not exercise it. The generated JSON and CSV files are retained in docs/issue-31-results.

| Workload | Dataset | Concurrent workers | Requests | p50 | p95 | p99 | Max | Failures | Under 2 s | Disposition |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Listing + search/filter mix | 1,000 synthetic published events | 100 | 1,000 | 144.518 ms | 178.211 ms | 226.416 ms | 259.926 ms | 0 | 100.00% | MET for this local run; registration integrity not tested |

Use the generated JSON as the raw evidence and replace the pending values with the measured values. If you change the dataset size or request count, update this table accordingly.

## Not-yet-verified data-integrity checks and required follow-up

The historical search benchmark artifacts do not include registration-load results. The current checkout has registration routes/models, duplicate constraints and a conditional transactional capacity update. Remaining verification is a controlled 500-attempt test against an isolated event/database, including final capacity and record-retention assertions; separately test waitlist promotion and cancellation cutoff. Paid-registration integrity remains pending payment support.

Run a separate controlled registration-load test (including 500 simultaneous attempts) against an isolated database and record successes, rejections, duplicate behavior, final confirmed count, capacity, and any lost/duplicated records. Avoid sending such load to shared or production data.

## Failures and follow-up defects

The historical search/listing benchmark does not verify current registration concurrency or paid-record integrity. It does not claim a target was met before an actual run. Record any observed slow scenario, HTTP error, timeout, or payload failure here and create a separate defect issue if needed.
