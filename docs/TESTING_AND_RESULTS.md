# Testing approach and results

**Documentation update:** 18 November 2026  
**Latest assessor-branch validation:** PR #57 CI run [#44241427529](https://github.com/SE-Miniproject-EMS/SE_Miniproject/actions/runs/44241427529), 18 November 2026. Backend **56 passed, 0 failed**; backend syntax validation and frontend build passed. The coverage artifact reports **92.79% lines, 77.81% branches and 95.71% functions**. Historical integrated application result: PR #48 run #42747239410, 55 passed, 0 failed.

## Automated test inventory

| File | Type | Verified areas |
|---|---|---|
| `backend/test/auth-api.test.js` | HTTP integration | Registration, duplicate email, bcrypt, verification, login, sessions, role checks |
| `backend/test/event-api.test.js` | HTTP integration/regression | Event lifecycle/validation/search, ownership/RBAC, free and mock-paid registration, capacity, waitlist, cancellations, check-in, feedback, payment/refund simulation |
| `backend/test/jwt.test.js` | Unit | JWT configuration, issuance and absolute expiry |
| `backend/test/payment-rules.test.js` | Unit/rule | Paise conversion, input and refund-cutoff rules |
| `backend/test/issue26-migration.test.js` | Migration integration | Existing registration preservation and idempotent FIFO backfill |

The event/auth tests issue HTTP requests to a local Express child process using a temporary SQLite database. They exercise controllers through the actual routes and persistence layer rather than testing controller functions in isolation.

## Reproducible commands

Backend tests:

```bash
cd backend
npm ci
npm test
```

Backend coverage (configured in the assessor evidence branch; coverage percentages are pending the first successful Actions run):

```bash
cd backend
npm ci
npm run test:coverage
```

Frontend production build:

```bash
cd frontend
npm ci
npm run build
```

The coverage command uses pinned `c8@12.0.0` and reports line, branch, function and statement coverage. It is configured to include all backend `src/**/*.js` files so untested source files are not silently omitted. It produces:
- `backend/coverage/index.html` — per-file HTML report.
- `backend/coverage/lcov.info` — LCOV including branch records.
- `backend/coverage/coverage-summary.json` — machine-readable totals.
- Text coverage output in the GitHub Actions log.

CI uploads the folder as the artifact `backend-test-coverage-<run number>`. Use the artifact from the exact PR head commit being reviewed. Do not quote percentages until the first report is uploaded and inspected. No arbitrary coverage threshold is enforced yet.

## Historical CI results (different commits; do not add the counts together)

| PR / run | Backend tests | Frontend build | What it demonstrates |
|---|---:|---|---|
| #21 / [#40363629586](https://github.com/SE-Miniproject-EMS/SE_Miniproject/actions/runs/40363629586) | 18 passed, 0 failed | Passed | Sprint 2 API integration baseline |
| #47 / [#41889324919](https://github.com/SE-Miniproject-EMS/SE_Miniproject/actions/runs/41889324919) | 28 passed, 0 failed | Passed | Free registration/waitlist changes |
| #52 / [#42396147609](https://github.com/SE-Miniproject-EMS/SE_Miniproject/actions/runs/42396147609) | 30 passed, 0 failed | Passed | Security regression tests |
| #55 / [#42491216438](https://github.com/SE-Miniproject-EMS/SE_Miniproject/actions/runs/42491216438) | 30 passed, 0 failed | Passed | RBAC route-matrix tests |
| #48 / [#42747239410](https://github.com/SE-Miniproject-EMS/SE_Miniproject/actions/runs/42747239410) | **55 passed, 0 failed** | **Passed** | Later integrated mock payment/refund code with security/RBAC tests |

CI output verifies backend tests and frontend compilation/build. It does not automatically establish browser E2E behavior, a 500-registration load result, production uptime or horizontal scaling.

## Latest coverage result

PR #57 run [#44241427529](https://github.com/SE-Miniproject-EMS/SE_Miniproject/actions/runs/44241427529) uploaded [backend-test-coverage-75](https://github.com/SE-Miniproject-EMS/SE_Miniproject/actions/runs/44241427529/artifacts/14400110583). Measured backend totals:
- Lines/statements: 2,075 / 2,236 = **92.79%**
- Branches: 414 / 532 = **77.81%**
- Functions: 67 / 70 = **95.71%**

The report includes all backend `src/**/*.js` files. `src/jobs/sendReminders.js` is 0% covered and should receive direct tests. Full per-file breakdown is in [coverage baseline report](test-reports/2026-11-18-coverage-baseline.md). These are backend percentages only; no frontend component-test coverage percentage exists.

## Manual/browser verification

The recorded browser results are in `docs/issue-14/e2e-results.json`; demo videos are:
- `docs/issue-14/application-demo.webm`
- `docs/issue-14/technical-verification.webm`

Those recordings evidence organizer event lifecycle, verification/login, attendee permission restrictions and a 390px mobile layout check. They do not claim that all later payment, waitlist, notification and feedback flows have browser automation.

## Performance evidence

The 8 November event-search benchmark used 1,000 synthetic published events, 100 concurrent workers and 1,000 requests on a local Apple M4/SQLite setup. It recorded 1,000/1,000 successful requests, p95 194.802 ms, max 301.311 ms, all under two seconds. Raw JSON/CSV are in `docs/issue-31-results/`. This benchmark measures event search, **not registration**.

PR #54 adds the isolated 500-registration harness (`npm run benchmark:registrations`). No registration-specific 500-attempt result JSON/CSV is committed. Issue #31 remains open and NFR-PERF-02 remains **not verified** until that harness is actually run and its raw result is reviewed and committed.

## Remaining verification gaps

- No automated frontend component/unit-test suite is defined in `frontend/package.json`; current frontend CI is a Vite production build.
- The manual E2E record covers a limited set of browser flows; broader payment/waitlist/notification UI smoke tests should be recorded separately.
- Real gateway/provider-backed payment and refund tests are not available; mock outcomes are simulated.
- External notification delivery is not configured.
- The 500-concurrent registration benchmark result is missing.
- Usability target and 99% availability target are not measured.
- Production deployment, shared database operations, recovery, and multi-instance scaling are not verified.

For the full issue-to-PR activity history, use [GitHub Issue/PR Log](project-management/GITHUB_ISSUE_PR_LOG.md). For line/branch coverage details, use [Testing and Coverage](TESTING_AND_COVERAGE.md).
