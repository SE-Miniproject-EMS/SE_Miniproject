# Issue 31 registration concurrency verification

Run on 19 November 2026 in Asia/Kolkata using the application baseline 27c92de and the SQLite write scheduling changes in this PR. Artifact filenames and timestamps are UTC.

## Workload and commands

The existing command npm run benchmark:registrations starts one local API process with a disposable SQLite file, creates 500 synthetic authenticated attendees, and launches 500 concurrent HTTP registration requests for a free event with capacity 100. The request timeout remains 120 seconds.

## Results

| Artifact timestamp (UTC) | Change under test | Successful | HTTP 500 | Timed out | Outcome |
|---|---|---|---|---|---|
| 2026-11-18T19-35-25-421Z | Original implementation | 61 | 23 | 416 | Failed |
| 2026-11-18T19-42-09-410Z | Registration transaction queue alone | 56 | 5 | 439 | Failed |
| 2026-11-18T19-42-56-071Z | Shared queue for session updates and registration/cancellation transactions | 500 | 0 | 0 | Passed |

Each run has matching issue-31-registration-<timestamp>.json and .csv files in this directory. The passing run took 17,045.804 ms. It recorded 100 confirmed registrations, 400 waitlisted registrations, exactly 500 stored registrations and seatsTaken=100. No capacity excess was found. The registration latency p95 was 15,943.684 ms and maximum 16,885.574 ms. The two-second search target is a separate workload.

Failed runs contain a database observation taken after client timeouts while server work could still be completing. Their counts are diagnostic observations and cannot establish a settled final database state. In particular, the second failed run observed 57 confirmed rows and seatsTaken=56 across separate queries during ongoing work. The successful run observed the database after every request completed successfully.

## Diagnosis and change

The installed Sequelize SQLite driver opens a dedicated connection for each transaction. Hundreds of IMMEDIATE transactions compete for SQLite's single write lock while authenticated requests also update session idle deadlines. Serializing registration transactions alone did not resolve the failures. Scheduling both session updates and registration/cancellation transactions through a shared process-local promise queue resolved the measured workload.

The queue acquires a database connection only when its turn starts and continues after a failed operation. IMMEDIATE transactions, the conditional capacity update, and the unique attendee/event constraint continue to protect the persisted state. Session deadlines still use SQLite's statement-time clock and retain the JWT expiry upper bound.

This is one API process with SQLite. Other writers and other API processes still rely on SQLite locking and may experience contention. Multi-instance throughput has not been measured. This change does not establish horizontal scalability.

## Regression verification

- npm test --prefix backend completed with 65 passed and 0 failed, covering authentication, idle expiry, registration, cancellation, FIFO promotion, mock payments and reporting.
- After adding the duplicate-registration regression, node --test --test-name-pattern="concurrent duplicate registrations" test/event-api.test.js completed with 1 passed and 0 failed. It verifies one successful registration and eleven 409 responses for the same attendee, then a successful registration for a different attendee.
- The passing benchmark above used the shared queue before the helper was renamed from registrationTransaction.js to sqliteWrites.js. The full regression suite ran with the final names.

## Remaining verification

The local free-event 500-request target now has passing evidence. Real provider-backed paid-registration persistence remains pending under Issue 26. No real payment, production availability, or multi-instance scaling result is claimed.
