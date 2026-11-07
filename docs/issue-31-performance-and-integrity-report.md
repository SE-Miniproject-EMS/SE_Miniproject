# Issue #31: Performance, Concurrency, and Data-Integrity NFR Verification

## Status and scope

This report records the repeatable benchmark procedure and the current repository limitations for SRS requirements NFR-PERF-01, NFR-PERF-02, and the data-integrity/safety requirement in SRS §6.2.

- **NFR-PERF-01 (event search/listing):** measured in one local synthetic-data run using the public `GET /api/events` endpoint. The result is specific to that machine and workload, not a production service-level guarantee.
- **NFR-PERF-02 (500 concurrent registration attempts):** **not verified**. The free-event registration route/model and transactional capacity gate now exist, but no 500-attempt registration load test is recorded.
- **Capacity and record integrity:** the API integration suite covers capacity reservation, FIFO waitlist promotion/cancellation, and six simultaneous attempts for the last available seat. This is functional concurrency evidence only; it does not establish the 500-attempt SRS target. Paid-registration record retention cannot be verified because no real payment provider or paid-registration persistence is present on this `main` baseline.

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

One local isolated SQLite benchmark was completed on Darwin 27.0.0 using Node v22.19.0, 100 concurrent workers and 1,000 measured requests against 1,000 synthetic published events. Result: 1,000/1,000 requests succeeded; p95 latency was 178.211 ms, maximum latency was 259.926 ms, and 100.00% completed under two seconds. This result applies only to this local search/listing workload. It does not exercise registration. The current API integration suite covers six simultaneous attempts for the last seat, but the 500-attempt registration load target remains **NOT VERIFIED**. The generated JSON and CSV files are retained in docs/issue-31-results.

| Workload | Dataset | Concurrent workers | Requests | p50 | p95 | p99 | Max | Failures | Under 2 s | Disposition |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Listing + search/filter mix | 1,000 synthetic published events | 100 | 1,000 | 144.518 ms | 178.211 ms | 226.416 ms | 259.926 ms | 0 | 100.00% | MET for this local run; registration integrity not tested |

Use the generated JSON as the raw evidence and replace the pending values with the measured values. If you change the dataset size or request count, update this table accordingly.

## Not-yet-verified data-integrity checks and required follow-up

The current code has a free-event registration model/route, duplicate-registration constraint, SQLite IMMEDIATE transaction, conditional capacity update and FIFO waitlist behavior. The API suite verifies basic functional cases, including six simultaneous requests contending for the last seat. These tests do not replace a controlled 500-attempt stress run.

Before claiming NFR-PERF-02 or the full SRS §6.2 concurrency/data-integrity target:
- Run 500 concurrent attempts from unique attendees against an isolated, capacity-limited event/database.
- Record the environment, application/database versions, workload generation method, success/rejection/error counts, elapsed time and latency distribution.
- Inspect the final confirmed count and ensure it never exceeds capacity; verify no duplicate or lost confirmed registration records.
- Exercise retries, timeouts and concurrent cancellation/waitlist promotion separately.
- Preserve raw results and the exact command/script used; do not send load traffic to shared or production data.

Paid-registration retention remains not assessable until a provider-backed paid-registration flow is implemented and verified. The local search benchmark is not evidence for registration integrity, high availability or horizontal scaling.
 
## Failures and follow-up defects

This report preserves the historical local search/listing benchmark and records the remaining registration-load and data-integrity gap. It does not claim the 500-attempt target was met. Record any observed slow scenario, HTTP error, timeout, or payload failure here and create a separate defect issue if needed.
