# Issue #31: Performance, Concurrency, and Data-Integrity NFR Verification

**SRS traceability:** NFR-PERF-01, NFR-PERF-02 and data-integrity/safety requirement in SRS §6.2  
**Reviewed baseline:** uploaded repository snapshot dated 8 November 2026  
**Important:** results from a local SQLite benchmark are not evidence of production or multi-instance scalability.

## 1. Verification summary

| Requirement | Verification status | Evidence / limitation |
|---|---|---|
| NFR-PERF-01 — event search/listing under 2 seconds at 100 concurrent users | **Met for the two recorded local runs** | Both the 29 Oct and 8 Nov local runs recorded 1,000/1,000 successful requests at 100 workers, with every request under 2 seconds. The latest 8 Nov run had p95 194.802 ms and max 301.311 ms. Raw JSON/CSV for each run are retained in `docs/issue-31-results/`. |
| NFR-PERF-02 — at least 500 concurrent registration attempts | **Harness added; run required on the latest snapshot** | Registration now exists. `backend/scripts/benchmark-registration-concurrency.js` submits 500 simultaneous authenticated requests to one isolated event and records all responses. Do not mark this target met until the script passes on the current branch and its raw artifacts are committed. |
| Capacity/data integrity — no overbooking or lost confirmed registrations | **Covered by 6-way API regression test; 500-attempt evidence pending** | `event-api.test.js` already checks simultaneous requests for the last seat. The new 500-attempt harness checks exact registration count, confirmed count, waitlist count and `seatsTaken` consistency after load. |
| Paid confirmed-registration integrity | **Not verified / blocked by provider dependency** | The API deliberately rejects paid-event registration with `PAYMENT_INTEGRATION_REQUIRED` until a payment provider and verified callback flow exist. The free-registration load test does not verify paid payment persistence. |

## 2. Event search/listing benchmark

### Repeatable command

From the repository root:

```bash
cd backend
npm ci
npm run benchmark:events -- --dataset-size 1000 --concurrency 100 --requests-per-user 10 --output-dir ../docs/issue-31-results
```

The harness seeds a disposable SQLite database with 1,000 synthetic future published events, starts the real Express API, and drives `GET /api/events` using 100 concurrent workers and 1,000 measured requests. It mixes listing, text search, category filtering and location filtering. It records per-request latency, status, failures and summary percentiles in JSON and CSV. It does not touch `backend/dev.db`.

### Recorded result (29 October 2026)

Environment: Darwin 27.0.0, Node v22.19.0, local SQLite, 100 concurrent workers, 1,000 synthetic published events.

| Workload | Dataset | Workers | Requests | p50 | p95 | p99 | Max | Failures | Under 2 s |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Listing + search/filter mix | 1,000 | 100 | 1,000 | 144.518 ms | 178.211 ms | 226.416 ms | 259.926 ms | 0 | 100.00% |

**Interpretation:** NFR-PERF-01 was met for this recorded local workload. This is not a production SLA and does not demonstrate multi-instance scaling.

Raw evidence:
- `docs/issue-31-results/issue-31-benchmark-2026-10-29T15-08-41-265Z.json`
- `docs/issue-31-results/issue-31-benchmark-2026-10-29T15-08-41-265Z.csv`

### Subsequent event-search run (8 November 2026)

A second local run is also committed. It used Darwin 27.0.0, Apple M4 (10 logical CPUs), Node v22.19.0 and a disposable SQLite database with 1,000 synthetic events, 100 concurrent workers and 1,000 requests across listing, text search, category and location filters.

| Workload | Dataset | Workers | Requests | p50 | p95 | p99 | Max | Failures | Under 2 s |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Listing + search/filter mix | 1,000 | 100 | 1,000 | 151.466 ms | 194.802 ms | 251.892 ms | 301.311 ms | 0 | 100.00% |

**Interpretation:** this second local run also met the under-two-second target for its measured workload. It is independent of the 29 October run; do not combine percentiles or describe either run as a production guarantee.

Raw evidence:
- `docs/issue-31-results/issue-31-benchmark-2026-11-08T14-40-29-541Z.json`
- `docs/issue-31-results/issue-31-benchmark-2026-11-08T14-40-29-541Z.csv`

## 3. Registration concurrency and capacity benchmark

The latest repository snapshot now includes registration, waitlisting and transactional capacity reservation. The earlier report's statement that registration did not exist is stale and has been superseded by this section.

### Run the 500-attempt benchmark

```bash
cd backend
npm ci
npm run benchmark:registrations
```

The script:
1. Creates a unique temporary SQLite database and never reads or modifies the configured development database.
2. Seeds one published free event, one organizer and 500 synthetic attendee identities.
3. Creates 500 valid short-lived JWT sessions without measuring account creation or password hashing.
4. Sends 500 registration POST requests concurrently to the real `/api/registrations/events/:eventId` endpoint.
5. Verifies every request response, the final number of registration records, confirmed count, waitlisted count and event `seatsTaken`.
6. Writes timestamped raw JSON and CSV artifacts under `docs/issue-31-results/`.

Default event capacity is 100. A correct run should produce exactly 100 `CONFIRMED`, 400 `WAITLISTED`, 500 total registration records and `seatsTaken=100`, with 500 successful HTTP 201 responses. The script exits non-zero if any request fails or the final integrity invariants do not match. Capacity can be changed for additional experiments using `REGISTRATION_BENCHMARK_CAPACITY`, but the attempt count is intentionally fixed at 500 for this issue.

The test is repeatable, but its outcome must be captured from the user's actual machine. Do not write expected values into the results table as if they were measured.

### Results to fill after execution

| Run date / environment | Attempts | Capacity | Confirmed | Waitlisted | HTTP failures | p95 latency | Integrity result | Raw artifact |
|---|---:|---:|---:|---:|---:|---:|---|---|
| Pending run on latest snapshot | 500 | 100 | — | — | — | — | NOT YET VERIFIED | Add generated JSON/CSV here |

## 4. Existing API regression coverage

The backend API suite includes a simultaneous six-attendee attempt against a one-seat event. It asserts:
- all six requests are accepted into either confirmed or waitlisted state;
- exactly one registration is confirmed and five are waitlisted;
- `seatsTaken` remains one;
- persisted confirmed and waitlisted counts match the response states.

This is a useful concurrency regression test, but it is not a substitute for the 500-attempt benchmark.

## 5. Environment, interpretation and limitations

- Both benchmark harnesses use disposable SQLite files and a single local API process.
- The search benchmark's result is tied to the machine, Node version, SQLite dataset and workload recorded in its JSON artifact.
- The registration benchmark uses pre-seeded identities and valid sessions. It measures registration contention, not sign-up/login throughput.
- A successful 500-request local run demonstrates the tested local implementation's capacity behavior under that workload. It does not prove a horizontally scaled production deployment can sustain the same rate.
- Payment-provider callbacks, paid registration, refunds and preservation of verified paid records remain outside the scope of the free-registration benchmark.
- For a production-grade scale claim, repeat the test against the intended shared database and multiple API instances, while collecting throughput, p50/p95/p99 latency, error rate, database lock/connection metrics and queue depth.

## 6. Follow-up defects

If the benchmark fails, preserve its JSON/CSV and report:
- exact failure response/status and attempt number;
- database error or timeout, if present;
- final confirmed/waitlisted/total counts and `seatsTaken`;
- Node version, OS, CPU and memory;
- whether the failure is reproducible on a second isolated run.

Create a defect issue for any overbooking, duplicate, missing record or unhandled request failure. Do not suppress failures or describe an interrupted run as passing.
