# Testing approach and results

**Current documentation review:** 12 November 2026. Historical run counts retain their original run dates and must not be added together. This document distinguishes merged CI evidence from unrun load, browser and deployment verification. Read this alongside `API_Integration_Test_Report.md`, `issue-12-regression-report.md`, and `IMPLEMENTATION_BASELINE.md`.

## Repeatable local commands

Run from the repository root:

```bash
# Backend integration tests (starts an Express child process and uses a temporary SQLite database)
cd backend
npm ci
npm test
cd ..

# Frontend production build
cd frontend
npm ci
npm run build
cd ..
```

The backend test scripts use isolated temporary SQLite files, test real HTTP routes and persistence, and remove their temporary database after the run. Do not use production or shared databases as test targets.

## Automated test strategy

The backend suite in `backend/test/auth-api.test.js` and `backend/test/event-api.test.js` verifies the API through HTTP requests rather than importing controllers directly.

| Area | Current scenarios covered |
| --- | --- |
| Authentication / sessions | Registration, duplicate email rejection, bcrypt password hashing, email verification gate, successful/invalid login, JWT validation and absolute expiry, current-user access, role checks, persisted idle sessions, idle-deadline extension and rejection of expired/removed sessions. `TC-SEC-04` verifies the inactivity timeout (`SESSION_IDLE_TIMEOUT_SECONDS`, default 1800 seconds) and its upper bound at JWT expiry. |
| Event lifecycle | Draft creation, list/manage own events, editing, publishing, cancelling and public visibility. |
| Registration, capacity and check-in | Free-event registration, mock paid checkout/refund outcomes, duplicate prevention, capacity reservation, FIFO waitlist promotion, attendee cancellation/cutoff, event cancellation/waitlist cleanup, one-use ticket-token check-in and eligibility-gated feedback API. Six simultaneous last-seat attempts are functional coverage, not a 500-attempt load test. |
| Authorization and ownership | PR #55 adds a route-family permission matrix for anonymous, ATTENDEE, ORGANIZER and ADMIN requests across mounted protected routes. Separate tests cover event/registration/check-in/feedback ownership. Extend the matrix whenever routes are added. |
| Validation | Missing/invalid fields, date ordering and formats, capacity, ticket price, title/category/venue limits, invalid update persistence, invalid publish data, cancelled event restrictions. |
| Discovery | Search, category, venue/location, date filters, pagination values, order and response metadata. |
| Frontend | Vite production build to detect compile/build errors. |

GitHub Actions (`.github/workflows/ci.yml`) installs Node.js 24 dependencies, syntax-checks backend source, runs `npm test`, and runs `npm run build` for the frontend. The workflow does not run browser automation or a deployed-system test.

## Results recorded in this repository

| Evidence | Recorded result | Interpretation / limitation |
| --- | --- | --- |
| `docs/issue-12-regression-report.md` | 20 backend integration tests passed, 0 failures; `npm run build` completed successfully. | This is the regression report recorded in the repository snapshot. It covers API/backend flows, not a complete browser journey. |
| `docs/API_Integration_Test_Report.md` | Historical GitHub Actions run `40363629586` reported 18 tests passed and both backend validation and frontend build jobs successful. | This report is from an earlier commit. Keep it as historical evidence, not a conflicting current count. |
| Merged PR #48 (10 Nov 2026) | [GitHub Actions run #42747239410](https://github.com/SE-Miniproject-EMS/SE_Miniproject/actions/runs/42747239410) passed backend validation/tests and frontend build; its PR report records **55 backend tests passed, 0 failed**. | This includes the mock payment/refund flow and the Session/waitlist integration fixes. It does not validate a real payment gateway or PCI compliance. |
| Additional merged CI checks | PR #54 CI run #42491097163 and PR #55 CI run #42491216438 completed successfully. PR #56 is documentation-only and records `git diff --check` passing; its body states backend/frontend suites were not run. | These CI runs validate tests/builds on their respective PR heads. CI does not run the 500-registration benchmark, browser E2E or deployed uptime observation. |
| Local event search/listing benchmark (8 Nov 2026) | 1,000/1,000 successful requests; 100 concurrent workers; p95 194.802 ms; p99 251.892 ms; maximum 301.311 ms; all requests completed under two seconds. | Local synthetic SQLite benchmark on Darwin/Apple M4, not a production guarantee. It measures event search/listing only. It is not evidence for registration concurrency. |

## Known coverage gaps / blocked tests

- No automated browser E2E suite is present in this repository snapshot.
- The existing demo record notes that login-lockout behavior, rejection of unverified login, and some pagination cases had coverage gaps at the time it was written; the current auth test file includes an unverified-login test, so review the individual test files before treating that older note as current for every gap.
- PR #54 adds `npm run benchmark:registrations`, which seeds a disposable SQLite database and sends 500 simultaneous authenticated free-event registration attempts. **No registration-specific run result JSON/CSV is committed yet**, so NFR-PERF-02 remains NOT VERIFIED. Run from `backend/` with `npm run benchmark:registrations`, review the report's 500 responses, unique persisted record count, confirmed/waitlisted counts and `seatsTaken`, then commit the generated files under `docs/issue-31-results/`.
- PR #48 supplies a mock payment/refund simulator only; no real gateway, signed callback, provider-confirmed refund or PCI verification exists. External email/SMS notification delivery remains unconfigured. Token check-in and feedback APIs have test coverage, but QR image/camera scanning UI, complete feedback prompt/display UI, and organizer/admin dashboards with CSV reporting remain incomplete.
- The registration harness is still unrun, and the event-search benchmark does not establish production capacity, multi-instance scalability, availability or 99% uptime. PR #56's usability and availability assessments both record their measurements as not run/not verified.

## Suggested manual smoke test before demonstration

1. Register an Organizer, open the development verification link printed in the backend console, and log in.
2. Create a future event as a draft; confirm that it is not public before publishing.
3. Publish it; verify it appears in public discovery and the details page.
4. Exercise search, category, venue/location and date filters; record the observed results.
5. Edit and cancel the event; verify the canceled event is no longer in public discovery.
6. Use anonymous, Attendee, Organizer and Admin test accounts to verify role gates and object ownership using the PR #55 route matrix. Also complete a manual browser journey and record screenshots/results; automated API tests are not browser E2E evidence.
7. Record pass/fail, environment, date and evidence in the issue or regression report. Do not describe six-request functional concurrency testing as proof of the 500-attempt SRS target, or treat console notification output as external email/SMS delivery.
