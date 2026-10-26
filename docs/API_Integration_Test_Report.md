# API Integration Test Report — Sprint 2

- Repository: `SE-Miniproject-EMS/SE_Miniproject`
- Backlog: [Issue #9 — Perform API integration testing](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/9)
- Automated test suite: `backend/test/event-api.test.js`
- CI workflow: `.github/workflows/ci.yml`
- Scope: Event API request/response integration, event lifecycle, list filters, validation, authentication, role authorization, and ownership boundaries.

## Environment and execution status

The backend integration suite is executed through the repository's GitHub Actions CI workflow. It starts the Express backend against a temporary SQLite database and sends HTTP requests to the API. Test accounts are created through the application registration and login endpoints, and the suite reads the development-only verification URL from the test server output to complete registration.

The test suite was added to the backend package through the `npm test` command. The GitHub Actions run for this branch is the source of truth for pass/fail results; do not mark Issue #9 complete until that run passes and the team completes the manual browser smoke-check.

To run locally from the repository root:

```bash
cd backend
npm ci
npm test
```

Use Node.js 24 (the version configured in CI). The automated tests use a temporary test database and do not intentionally use the project's normal local database.

## Automated integration coverage

| ID | Scenario | Expected result |
|---|---|---|
| API-01 | Create an event without an access token | `401`, `UNAUTHENTICATED` |
| API-02 | Attendee attempts to create an event | `403`, `FORBIDDEN` |
| API-03 | Organizer creates event and lists their own events | `201` creation; event appears in `events` response |
| API-04 | Draft event appears in the public list | It does not appear before publishing |
| API-05 | Organizer publishes a valid event | `200`; event status becomes `PUBLISHED` |
| API-06 | Public details request for a published event | `200`; event and organizer summary returned |
| API-07 | Organizer cancels own event | `200`; status becomes `CANCELLED`; public detail request returns `404` |
| API-08 | Required creation fields are omitted | `400` with structured error response |
| API-09 | Event date range, capacity, ticket price, title length, or date format is invalid | `400` with error code |
| API-10 | Organizer attempts to edit or cancel another organizer's event | `403`; owner can still update their own event |
| API-11 | Public event listing filters by category, location, search term, and date range | Only matching events appear |
| API-12 | Public event listing date filters are malformed | `400`, `INVALID_START_DATE` or `INVALID_END_DATE` |
| API-13 | Updating an event with invalid values | `400`; the previously stored values remain unchanged |
| API-14 | A cancelled event is edited or published again | `409`, `EVENT_CANCELLED` |
| API-15 | Requests reference an unknown event ID | `404`, `NOT_FOUND` |
| API-16 | An event is created as published with invalid publishing data | `400` with a structured validation error |

## Findings addressed by API validation changes

1. Missing required event fields are rejected before persistence.
2. Event title, category, description, and venue types are checked, and title/category/venue lengths are aligned with the model.
3. Capacity, ticket price, and refund-window inputs reject blank or invalid numeric values.
4. Date values and end-after-start ordering are checked.
5. Integration tests exercise the authentication and role guards and confirm that one organizer cannot update or cancel another organizer's event.

## Manual frontend/backend smoke-check

Automated HTTP API tests do not replace checking the browser UI. After the CI run passes, use the local setup in the README and:

1. Log in as an organizer and create an event.
2. Confirm it appears as a draft under Manage Events.
3. Publish it, then confirm it appears on the public Events page and opens in Event Details.
4. Edit the event and confirm changes persist after reloading.
5. Cancel the event and confirm it is no longer shown in the public listing.
6. Sign in as a second organizer and verify the UI/API does not permit editing or cancelling the first organizer's event.
7. Submit invalid dates or numeric values and confirm a useful error message appears.

Record the manual results and screenshots in this report or in Issue #9 after execution.

## Results

- Automated API integration tests: **Passed** in GitHub Actions run [#40363476463](https://github.com/SE-Miniproject-EMS/SE_Miniproject/actions/runs/40363476463).
- Backend Validation job: **Success** — dependencies installed, backend JavaScript syntax checked, and `npm test` passed.
- Frontend Build job: **Success** — frontend dependencies installed and `npm run build` passed.
- Manual browser smoke-check: Pending team execution.
- Issue #9 should remain open until the browser-level smoke-check is recorded and the team reviews the evidence.

The workflow run above tested the event integration test suite and frontend build successfully. This report update changes documentation only; CI should be checked again on the latest pull-request commit before merging.
