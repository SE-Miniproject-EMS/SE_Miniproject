# Issue #25 Event Registration Implementation Plan

> **Goal:** Complete attendee registration, capacity, waitlist, cancellation, and event detail UI behavior without changing payment scope.
>
> **Architecture:** Extend the existing Sequelize registration transaction and authenticated registration routes. Reuse the current `/registrations/mine` endpoint to restore attendee state on the event detail page. Preserve the existing SQLite setup and event/auth modules.
>
> **Tech Stack:** Node.js, Express, Sequelize, SQLite, React, Vite, Node test runner.

---

## Current findings

- The existing Registration model, authenticated registration routes, one-use ticket tokens, check-in route, and `GET /registrations/mine` are in place.
- `(eventId, attendeeId)` is unique; capacity is gated by a transactional conditional update to `Event.seatsTaken`.
- Cancellation checks `refundWindowHours` and ownership.
- Waitlist promotion is currently broken: the code changes status to CANCELLED, then tests the changed status for CONFIRMED.
- EventDetails has no registration workflow; API reference and baseline status are stale.
- The SRS defines a waitlist as a queue but does not state an ordering policy. The user approved FIFO by registration time, with registration ID as a stable tie-break.

## Task 1: Characterize and test backend behavior

**Files:** `backend/test/event-api.test.js`

1. Add focused failing integration tests for unauthenticated/invalid registration, last-seat concurrency, cancellation ownership/cutoff, available capacity after cancellation, waitlist promotion, and registration status after refresh (`GET /registrations/mine`).
2. Run the focused test file and confirm failures correspond to the missing or broken behaviors.
3. Preserve existing duplicate, waitlist, check-in, and feedback tests.

## Task 2: Repair registration transaction behavior

**Files:** `backend/src/controllers/registrationController.js` (and route/model only if tests prove necessary)

1. Keep event existence/publication/end-time/payment checks and the unique registration constraint.
2. Keep authoritative capacity enforcement inside the database transaction; verify concurrent requests cannot overbook and report/handle SQLite contention if observed.
3. Capture prior status before cancellation update; update seat count and registration atomically.
4. Promote only according to the approved waitlist rule, and enqueue notification in the same transaction.
5. Run backend tests after each fix.

## Task 3: Add attendee actions to event details

**Files:** `frontend/src/api/registration.js` (new), `frontend/src/pages/EventDetails.jsx`, `frontend/src/styles.css`

1. Add API helpers for current attendee registrations, registration, and cancellation using the existing API client.
2. Load event and authenticated attendee state from the backend; show capacity/availability and correct action for confirmed, waitlisted, full, anonymous, organizer, or admin states.
3. Disable repeat submissions while pending; show API-derived success/errors and refresh state after mutation.
4. Keep the existing visual system, semantic labels, keyboard focus, and mobile layout.

## Task 4: Update API/status documentation

**Files:** `docs/API_REFERENCE.md`, `docs/IMPLEMENTATION_BASELINE.md`, `docs/FR_TRACEABILITY_MATRIX.md`

1. Document the existing registration, status, cancellation, and response contracts accurately.
2. Replace stale “not implemented” statements for REQ-11–REQ-14 with current status and unverified coverage gaps.
3. Keep payments/refunds outside this issue; do not claim the 500-attempt NFR is satisfied without a load test.

## Task 5: Verify

- Run `npm test` in `backend/`.
- Run `npm run build` in `frontend/`.
- Run the app and manually exercise register, waitlist, refresh, cancellation, and error states where the environment permits.
- Inspect `git diff --check`, `git diff`, and `git status`; do not commit or push.

## Approved decision

- The user approved FIFO promotion by waitlist entry time. Use registration ID as a deterministic tie-break when timestamps match.
