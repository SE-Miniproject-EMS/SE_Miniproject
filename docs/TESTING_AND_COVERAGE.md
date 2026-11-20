# Test, unit-test and coverage reporting

**Current evidence:** main commit `74c1912`, run [#44665800768](https://github.com/SE-Miniproject-EMS/SE_Miniproject/actions/runs/44665800768), 20 November 2026.
**Result:** **83 backend tests total: 82 passed, 0 failed, 1 PostgreSQL test skipped in this job**; backend syntax validation and frontend production build passed.
**Coverage artifact:** [backend-test-coverage-155](https://github.com/SE-Miniproject-EMS/SE_Miniproject/actions/runs/44665800768/artifacts/14597303129).

[Versioned coverage snapshot and per-file branch report](testing/coverage/2026-11-20/README.md). The HTML ZIP, CSV, JSON and LCOV copies remain available after CI artifact expiry.

## What is tested

| Test file | Test type | Main coverage |
|---|---|---|
| `backend/test/auth-api.test.js` | HTTP integration | Registration, duplicate emails, bcrypt, verification gate, login, sessions, authentication and role restrictions |
| `backend/test/event-api.test.js` | HTTP integration/regression | Event lifecycle, validation, search, ownership, registration, capacity, waitlist, check-in, feedback, mock payment/refunds and RBAC |
| `backend/test/jwt.test.js` | Unit | JWT configuration, issuance and absolute expiry |
| `backend/test/payment-rules.test.js` | Unit/rule | Paise conversion, validation and refund-cutoff rules |
| `backend/test/issue26-migration.test.js` | Migration integration | Existing registration preservation and idempotent FIFO-position backfill |
| `backend/test/send-reminders.test.js` | Unit with injected dependencies | 23–25 hour reminder selection, confirmed registrations, deduplication outcome, empty event set, failure cleanup and notification-schema setup |
| `backend/test/dispatch-notifications.test.js` | Unit with injected dependencies | Notification schema setup, bounded batch dispatch, failed-delivery exit status, startup failure and database cleanup |
| `backend/test/notification-provider.test.js` | Unit/provider-adapter | Notification email templates, HTML escaping, Resend request headers/idempotency, provider failures and missing credentials |

Most API scenarios are HTTP integration/regression tests. Worker and adapter tests use injected dependencies/fetch stubs; no live provider credentials are used in CI.

## Reproducible commands

Backend tests:

```bash
cd backend
npm ci
npm test
```

Coverage:

```bash
cd backend
npm ci
npm run test:coverage
```

Notification dispatch CLI:

```bash
cd backend
npm run dispatch:notifications
```

Frontend production build:

```bash
cd frontend
npm ci
npm run build
```

The backend integration tests use disposable temporary SQLite files rather than the normal `backend/dev.db`. Do not point tests at production or shared user data.

## Line, branch and function coverage

The coverage command uses pinned `c8@12.0.0` and includes all backend `src/**/*.js` files, including untested source files as zero-coverage entries. It generates:
- `backend/coverage/index.html` — per-file HTML report.
- `backend/coverage/lcov.info` — LCOV line/branch records.
- `backend/coverage/coverage-summary.json` — machine-readable summary.
- Text line/branch/function/statement summary in the Actions log.

CI uploads `backend/coverage/` as `backend-test-coverage-<run number>` with 90-day retention.

### Latest measured current-main result

[Actions run #44665800768](https://github.com/SE-Miniproject-EMS/SE_Miniproject/actions/runs/44665800768) reports:
- Backend coverage job: **82 passed, 0 failed, 1 skipped**. The dedicated PostgreSQL integration job passed separately.
- Line/statement coverage: **94.00%**.
- Branch coverage: **78.84%**.
- Function coverage: **96.73%**.
- [Download the HTML/LCOV/JSON artifact](https://github.com/SE-Miniproject-EMS/SE_Miniproject/actions/runs/44665800768/artifacts/14597303129).

Selected worker coverage:
- `sendReminders.js`: **95.83% lines, 81.81% branches, 100% functions**.
- `dispatchNotifications.js`: **92.30% lines, 81.81% branches, 66.66% functions**.

Use the saved HTML report to inspect exact uncovered lines and decision branches for this commit. Remaining gaps do not mean every case in a file is untested, and passing route tests do not imply all error branches executed. No arbitrary coverage threshold is enforced.

Coverage is a repository-wide backend metric, not an individual contributor score. The previous PR #57 run had a different source tree before the recent notification and reporting merges, so its percentages are historical and not directly comparable.

## Frontend testing status

The frontend has a Vite production build check but no dedicated automated React component/unit-test runner. The existing browser recordings in `docs/issue-14/` cover the recorded event lifecycle, verification/login, attendee authorization and 390px viewport checks. They are not a complete browser automation suite for every newer notification/reporting/payment flow.

## Separate performance, security and deployment evidence

- The event-search benchmark results live in `docs/issue-31-results/`; they do not measure registration concurrency.
- PR #54 supplies the 500-registration harness; PR #66 saves a passing local free-event run: 500 requests, 100 confirmed, 400 waitlisted and no overbooking. See [the saved registration result](issue-31-results/registration-run-2026-11-19.md).
- PR #48 is a mock payment/refund prototype; no provider-backed payment, signed callback, real refund or PCI certification is evidenced.
- PR #58 adds a Resend notification adapter; external delivery depends on private deployment configuration and provider-side delivery evidence. SMS is not configured.
- PR #59 adds Organizer/Admin report aggregates, a dashboard component and registration/attendance CSV exports with role scoping.
- Passing tests and build do not prove production deployment, 99% uptime, production TLS configuration or horizontal scalability.
