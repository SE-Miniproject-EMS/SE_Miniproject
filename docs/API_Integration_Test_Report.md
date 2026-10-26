# API Integration Test Report — Sprint 2

- Repository: `SE-Miniproject-EMS/SE_Miniproject`
- Backlog: [Issue #9 — Perform API integration testing](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/9)
- Test implementation: [PR #15](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/15)
- Scope: Event Management API request/response contract, lifecycle, validation, authentication, authorization, and ownership boundaries.

## Environment and execution status

Automated HTTP integration tests have been added in `backend/test/event-api.test.js`. They start the backend with a dedicated temporary SQLite database and use the application's registration/login endpoints to obtain test tokens.

**Execution status: Pending local or CI execution.** The test suite has been authored, but it has not yet been run in this environment. Do not treat the scenarios below as passed until `npm test` succeeds.

Run from the backend directory:

```bash
npm ci
npm test
```

The test suite uses Node's built-in test runner and requires Node.js 18 or newer (for the built-in `fetch` API).

## Test cases

| ID | Scenario | Expected result | Test coverage |
|---|---|---|---|
| API-01 | Create an event without an access token | `401`, `UNAUTHENTICATED` | Automated |
| API-02 | Attendee attempts to create an event | `403`, `FORBIDDEN` | Automated |
| API-03 | Organizer creates a valid event | `201`; response includes event ID, title, dates, category, venue, capacity, price, status, and organizer ID | Automated |
| API-04 | Organizer lists own events | `200`; newly created event appears in `events` array | Automated |
| API-05 | Draft event is requested from public listing | `200`; draft is not returned | Automated |
| API-06 | Organizer publishes valid event | `200`; status becomes `PUBLISHED` | Automated |
| API-07 | Published upcoming event is listed publicly and retrieved by ID | `200`; listing includes event and detail response includes organizer summary | Automated |
| API-08 | Organizer updates own event | `200`; updated title is returned | Automated |
| API-09 | Organizer cancels own event | `200`; status becomes `CANCELLED`; public detail request returns `404` | Automated |
| API-10 | Required create fields are missing | `400` with structured error payload | Automated |
| API-11 | End time is before start time, capacity is invalid, ticket price is negative, title too long, or date is malformed | `400` with error code | Automated |
| API-12 | A different organizer attempts to update or cancel the event | `403`; event remains owned by the original organizer | Automated |

## Findings from code review

1. The create-event flow did not consistently reject missing start date, end date, and capacity before calling the persistence layer. Those fields are now checked before creation so invalid payloads can receive a client-facing `400` instead of an unexpected database error.
2. Input validation now checks that text inputs have the expected type and stay within the model's title, category, and venue length limits.
3. Ticket price, capacity, and refund-window inputs reject blank or non-numeric strings rather than relying on JavaScript's numeric coercion.
4. The tests validate server-side authentication, role checks, and organizer ownership. Frontend browser-level interactions still require manual verification.

## Manual frontend/backend smoke-check

After starting the backend and frontend using the repository README:

1. Log in as an organizer and create an event.
2. Confirm the API returns a successful creation response and the event appears under Manage Events as a draft.
3. Publish the event and confirm it appears in the public event listing and opens from its details page.
4. Update the event and confirm the new values appear after reload.
5. Cancel the event and confirm it is no longer shown as a public event.
6. Log in as a second organizer and confirm attempts to update or cancel the first organizer's event are rejected.
7. Repeat one invalid form submission and confirm the frontend presents a useful API validation message.

Record actual outcomes, timestamps, and screenshots below after running the checks.

## Results

- Automated test implementation: Added; awaiting execution.
- CI result: Not verified in this report.
- Browser-level frontend/backend smoke-check: Pending.
- Issue #9 should remain open until test execution is successful, failures are resolved or tracked, and evidence is reviewed by the team.
