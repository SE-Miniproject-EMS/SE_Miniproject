# Testing approach and results

**Baseline date:** 29 October 2026. Read this alongside `API_Integration_Test_Report.md`, `issue-12-regression-report.md`, and `IMPLEMENTATION_BASELINE.md`. Historical run counts refer to different commits; they should not be added together.

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
| Authentication | Registration, duplicate email rejection, bcrypt password hashing, email verification gate, successful login, invalid credentials, JWT validation, current-user access, lock/role behavior as represented in the test suite. |
| Event lifecycle | Draft creation, list/manage own events, editing, publishing, cancelling and public visibility. |
| Authorization and ownership | Anonymous/attendee restrictions, server-side role checks, prevention of one organizer modifying another organizer's event, ADMIN-specific event permissions. |
| Validation | Missing/invalid fields, date ordering and formats, capacity, ticket price, title/category/venue limits, invalid update persistence, invalid publish data, cancelled event restrictions. |
| Discovery | Search, category, venue/location, date filters, pagination values, order and response metadata. |
| Frontend | Vite production build to detect compile/build errors. |

GitHub Actions (`.github/workflows/ci.yml`) installs Node.js 24 dependencies, syntax-checks backend source, runs `npm test`, and runs `npm run build` for the frontend. The workflow does not run browser automation or a deployed-system test.

## Results recorded in this repository

| Evidence | Recorded result | Interpretation / limitation |
| --- | --- | --- |
| `docs/issue-12-regression-report.md` | 20 backend integration tests passed, 0 failures; `npm run build` completed successfully. | This is the regression report recorded in the repository snapshot. It covers API/backend flows, not a complete browser journey. |
| `docs/API_Integration_Test_Report.md` | Historical GitHub Actions run `40363629586` reported 18 tests passed and both backend validation and frontend build jobs successful. | This report is from an earlier commit and has a lower test count than the later regression report. Keep it as historical evidence, not a conflicting current count. |
| Manual browser smoke test | Pending in the existing regression/test report. | A teammate still needs to rehearse registration/login, event creation/edit/publish/cancel, search/filtering, role/ownership behavior and record observed results/screenshots. Do not mark browser E2E tests as automated or passed. |
| Local event search/listing benchmark reported on 29 Oct 2026 | 1,000/1,000 successful requests; 100 concurrent workers; p95 178.211 ms; maximum 259.926 ms; 100% completed under two seconds. | This is a local synthetic-data benchmark, not a production guarantee. The benchmark harness and raw results are part of the separate Issue #31 work and should be merged with that PR for reproducibility. Registration concurrency, capacity enforcement and confirmed-registration data integrity were **NOT TESTED** because the registration flow is absent. |

## Known coverage gaps / blocked tests

- No automated browser E2E suite is present in this repository snapshot.
- The existing demo record notes that login-lockout behavior, rejection of unverified login, and some pagination cases had coverage gaps at the time it was written; the current auth test file includes an unverified-login test, so review the individual test files before treating that older note as current for every gap.
- Event-registration concurrency, overbooking, waitlist integrity and preservation of confirmed/paid registrations cannot be tested until registration/payment models and routes exist.
- Payment, refund, notification delivery, QR ticket/check-in, feedback and dashboard/CSV tests are target test cases in the Word Test Plan, not tests that have passed in this implementation.
- The benchmark does not establish production capacity, availability, horizontal scalability or 99% uptime.

## Suggested manual smoke test before demonstration

1. Register an Organizer, open the development verification link printed in the backend console, and log in.
2. Create a future event as a draft; confirm that it is not public before publishing.
3. Publish it; verify it appears in public discovery and the details page.
4. Exercise search, category, venue/location and date filters; record the observed results.
5. Edit and cancel the event; verify the canceled event is no longer in public discovery.
6. Use a second Organizer and an Attendee account to confirm that UI/API restrictions agree with server-side permissions.
7. Record pass/fail, environment, date and evidence in the issue or regression report. Do not report unimplemented registration/payment/notification/QR workflows as passed.
