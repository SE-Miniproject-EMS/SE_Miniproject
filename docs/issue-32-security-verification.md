# Issue 32 security verification

Chirag Basanth · 4 November 2026
Baseline: `d3d8bd7a1be80c0fe00ce0bd1704f14e7a350802` plus the accompanying tests.

## Updated security test cases and system validation

| Test case | Code and configuration | Result |
|---|---|---|
| TC-SEC-01 · Password storage and disclosure | `backend/src/controllers/authController.js` hashes registration passwords with bcrypt at cost 10 and compares hashes at login. `models/User.js` persists `passwordHash`. SQL logging is disabled in `config/db.js`. | Passed for the exercised account path. `auth-api.test.js` checks the stored bcrypt hash, confirms it matches the fixture, checks the registration response omits credential fields, and checks captured output for the plaintext fixture. The development verification link itself is logged. |
| TC-SEC-02 · RBAC and ownership | `backend/src/middleware/auth.js`, mounted route modules and controller ownership predicates. Access tokens are verified with `JWT_SECRET`. | Automated checks cover invalid/missing tokens, role denial, admin self-registration denial, organizer event ownership, and check-in ownership. Other permissions below were reviewed in source. |
| TC-SEC-03 · Payment and card data | `backend/src/controllers/registrationController.js` rejects paid-event requests before registration writes. The mounted API and Sequelize models have no payment flow or card fields. | Paid-event API returns 402 with `PAYMENT_INTEGRATION_REQUIRED` and leaves the attendee with no registration. Provider integration and PCI verification remain open under #26. Once integrated, inspect gateway payloads, persistence and logs for PAN/CVV exposure. |
| TC-SEC-04 · Session expiry after inactivity | `backend/src/models/Session.js` persists an idle deadline for each JWT `jti`; `authController.login` creates the session; `middleware/auth.js` checks and extends it on authenticated activity. `SESSION_IDLE_TIMEOUT_SECONDS` defaults to 1800 seconds (30 minutes); the idle deadline is capped by the JWT absolute expiry controlled by `JWT_EXPIRES_IN`. | Implemented and tested in [PR #51](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/51), merged 5 November 2026. Its automated test covers idle-deadline extension, the absolute-expiry cap, and concurrent requests against an expired/removed session. GitHub Actions run [#41783835273](https://github.com/SE-Miniproject-EMS/SE_Miniproject/actions/runs/41783835273) passed backend validation/tests and frontend build. Tokens issued before deployment require sign-in again. |

## Endpoint permission review

| Endpoint group | Server-side permission |
|---|---|
| Health, event listing and public details | Public. Event read handlers limit public visibility by event status and date as applicable. |
| Register, login, email verification | Public entry points. Self-registration permits attendee or organizer. Email verification requires a signed verification token. |
| Account profile and example ping | Signed access token. Profile lookup uses the authenticated user ID. |
| Example organizer and admin endpoints | Organizer/admin and admin respectively. |
| Event management list, create, update, publish, cancel | Organizer/admin. Organizer listing is scoped to their own events. Mutations check ownership or admin role. |
| Registration list, create, cancel, check-in | List is attendee/admin and scoped to the requesting account. Creation and cancellation are attendee-only. Cancellation checks registration ownership. Check-in requires an admin or the event organizer. |
| Submit and view event feedback | Submission requires a checked-in attendee. Viewing requires the event organizer or an admin. |
| Reminder job | Admin only. Permission reviewed in source. |

## Unit and integration test results

Node.js 24.19.0 on Windows with SQLite. Run `npm ci` and `npm test` from `backend`. The test harness launches the Express backend against temporary databases.

| Suite | Passed | Failed |
|---|---:|---:|
| JWT unit tests | 1 | 0 |
| Auth API integration tests | 10 | 0 |
| Event API integration tests | 12 | 0 |
| Total | 23 | 0 |

## Code and branch coverage

V8 coverage via c8 for `backend/src/**/*.js`, including unexecuted source files. The Windows test harness force-terminates the API child processes, so the coverage run used a temporary V8 snapshot timer in the server to retain child-process measurements. The timer was removed after measurement.

| Scope | Lines | Branches |
|---|---:|---:|
| Backend source | 85.50% | 79.42% |
| Auth controller | 90.60% | 66.66% |
| Event controller | 86.42% | 83.76% |
| Registration controller | 66.31% | 73.33% |
| Authentication and authorization middleware | 95.23% | 91.66% |
| JWT utilities | 100% | 100% |

These results cover the local backend test run. End-to-end browser flows, provider compliance, production logging and a runtime allow/deny matrix for every route remain outside this evidence.
