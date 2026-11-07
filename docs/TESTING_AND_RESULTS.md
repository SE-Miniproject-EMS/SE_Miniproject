# Testing approach and results

**Current documentation review:** 7 November 2026. Historical run counts retain their original run dates and must not be added together. Read this alongside `API_Integration_Test_Report.md`, `issue-12-regression-report.md`, and `IMPLEMENTATION_BASELINE.md`.

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
| Authentication / sessions | Registration, duplicate email rejection, bcrypt password hashing, email verification gate, successful/invalid login, JWT validation and absolute expiry, current-user access, role checks, persisted idle sessions, idle-deadline extension and rejection of expired/removed sessions. |
| Event lifecycle | Draft creation, list/manage own events, editing, publishing, cancelling and public visibility. |
| Registration, capacity and check-in | Free-event registration, duplicate prevention, capacity reservation, FIFO waitlist promotion, attendee cancellation/cutoff, one-use ticket-token check-in and eligibility-gated feedback API. The concurrency suite includes six simultaneous attempts for the last seat; it is not a 500-attempt load test. |
| Authorization and ownership | Anonymous/attendee restrictions, server-side role checks, prevention of one organizer modifying another organizer's event, ADMIN-specific event permissions. |
| Validation | Missing/invalid fields, date ordering and formats, capacity, ticket price, title/category/venue limits, invalid update persistence, invalid publish data, cancelled event restrictions. |
| Discovery | Search, category, venue/location, date filters, pagination values, order and response metadata. |
| Frontend | Vite production build to detect compile/build errors. |

GitHub Actions (`.github/workflows/ci.yml`) installs Node.js 24 dependencies, syntax-checks backend source, runs `npm test`, and runs `npm run build` for the frontend. The workflow does not run browser automation or a deployed-system test.

## Results recorded in this repository

| Evidence | Recorded result | Interpretation / limitation |
| --- | --- | --- |
| `docs/issue-12-regression-report.md` | 20 backend integration tests passed, 0 failures; `npm run build` completed successfully. | This is the regression report recorded in the repository snapshot. It covers API/backend flows, not a complete browser journey. |
| `docs/API_Integration_Test_Report.md` | Historical GitHub Actions run `40363629586` reported 18 tests passed and both backend validation and frontend build jobs successful. | This report is from an earlier commit. Keep it as historical evidence, not a conflicting current count. |
| Current `main` CI (7 Nov 2026) | Run [#41889529354](https://github.com/SE-Miniproject-EMS/SE_Miniproject/actions/runs/41889529354): **28 backend tests passed, 0 failed**; backend syntax validation and frontend build passed. | This run validates the current merged main baseline through registration and idle-session changes. It does not run browser automation or production load tests. |
| Manual browser smoke test | Pending in the existing regression/test report. | A teammate still needs to rehearse registration/login, event creation/edit/publish/cancel, search/filtering, role/ownership behavior and record observed results/screenshots. Do not mark browser E2E tests as automated or passed. |
| Local event search/listing benchmark reported on 29 Oct 2026 | 1,000/1,000 successful requests; 100 concurrent workers; p95 178.211 ms; maximum 259.926 ms; 100% completed under two seconds. | This is a local synthetic-data benchmark, not a production guarantee. It measures only event search/listing, not registration. The current registration suite functionally tests capacity and six simultaneous last-seat attempts; the SRS 500-attempt concurrency target and paid-record retention remain **NOT VERIFIED**. |

## Known coverage gaps / blocked tests

- No automated browser E2E suite is present in this repository snapshot.
- The existing demo record notes that login-lockout behavior, rejection of unverified login, and some pagination cases had coverage gaps at the time it was written; the current auth test file includes an unverified-login test, so review the individual test files before treating that older note as current for every gap.
- No 500-concurrent registration load test is present. Basic transactional free-event capacity, FIFO promotion and cancellation cutoff have API integration coverage; paid-registration retention remains untestable until a real payment provider flow exists.
- A real payment gateway/refund flow and external email/SMS notification delivery are not implemented. QR token issuance/check-in and feedback APIs have functional test coverage, but QR image/camera scanning UI, full attendee feedback prompt UI, and organizer/admin dashboards with CSV reporting remain incomplete.
- The benchmark does not establish production capacity, availability, horizontal scalability or 99% uptime.

## Suggested manual smoke test before demonstration

1. Register an Organizer, open the development verification link printed in the backend console, and log in.
2. Create a future event as a draft; confirm that it is not public before publishing.
3. Publish it; verify it appears in public discovery and the details page.
4. Exercise search, category, venue/location and date filters; record the observed results.
5. Edit and cancel the event; verify the canceled event is no longer in public discovery.
6. Use a second Organizer and an Attendee account to confirm that UI/API restrictions agree with server-side permissions.
7. Record pass/fail, environment, date and evidence in the issue or regression report. Do not describe six-request functional concurrency testing as proof of the 500-attempt SRS target, or treat console notification output as external email/SMS delivery.
