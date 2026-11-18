# Issue #26 Payment, Checkout, and Refund Implementation Plan

> **For Codex:** Execute this plan task-by-task with tests first. Do not commit, push, merge, or close the issue.

**Goal:** Add a provider-independent mock payment, reservation, FIFO offer, and full refund workflow without changing existing free-registration behavior.

**Architecture:** Extend the existing Sequelize models and Express services/controllers. Store each payment attempt and refund separately, use SQLite IMMEDIATE transactions plus conditional state updates for capacity and idempotency, and process expiries in the backend process with restart reconciliation. The mock adapter is visibly labelled and cannot claim real payment/refund settlement.

**Tech Stack:** Express 4, Sequelize 6.37.8, sqlite3 6.0.1, SQLite, React 18, Vite 5, Node test runner.

---

## Approved decisions

- `Registration.status`: `CONFIRMED`, `WAITLISTED`, `CANCELLED`, plus `PENDING_PAYMENT` and `PAYMENT_REQUIRED`.
- `waitlistPositionAt` plus registration `id` defines FIFO order; existing waitlisted records are backfilled from `createdAt`.
- `Payment` has many rows per registration, one per immutable attempt; every attempt has a distinct idempotency key and explicit `paymentPurpose` (`INITIAL_CHECKOUT` or `WAITLIST_OFFER`). Amount is stored as integer paise copied from the event price.
- `Refund` is at most one row per captured Payment; retries reuse the same refund idempotency key. Status distinguishes `PENDING`, `FAILED`, provider-confirmed `COMPLETED`, and mock-only `SIMULATED`.
- `seatsTaken` includes confirmed registrations and active pending reservations. Confirmation does not increment it. Conditional state transitions gate each release; retries reclaim capacity atomically.
- Paid waitlist offers reserve for the FIFO head for 10 minutes. Failure/expiry releases once, moves the attendee to the queue tail, and creates at most one offer for the next eligible attendee.
- Late payment success never confirms the registration. It creates `refund_pending`; an unresolved late-success refund excludes that attendee from subsequent waitlist offers.
- Organizer cancellation is one transaction, creates eligible full refunds, releases all occupied capacity once, and never promotes the waitlist.
- Preserve free registration/cancellation behavior and existing Issue #25 tests.

## Task 1: Characterize payment API and schema expectations

**Files:** Extend `backend/test/event-api.test.js`; create `backend/test/payment-rules.test.js` and `backend/test/issue26-migration.test.js` for focused rule and migration coverage.

**Steps:** Add failing integration tests for paid checkout reservation, immutable attempts, capacity counters, payment purpose, and existing free registration; run `npm test` and confirm expected failures; keep fixtures on the existing temporary test database harness.

## Task 2: Add models and additive SQLite migration

**Files:** Modify `backend/src/models/Registration.js`, `backend/src/server.js`; create `backend/src/models/Payment.js`, `backend/src/models/Refund.js`, `backend/src/migrations/issue26.js`.

**Steps:** Define associations and indexes; after `sync()`, add nullable `waitlistPositionAt` only if absent, backfill only `WAITLISTED` rows from `createdAt`, then add the FIFO index only if absent. Do not rebuild `registrations` or remove data. Add a migration test using an old-schema SQLite fixture and assert row preservation/backfill/idempotent rerun.

## Task 3: Implement amount conversion and mock adapter boundary

**Files:** Create `backend/src/services/paymentService.js`, `backend/src/services/mockPaymentAdapter.js`, and minimal payment config; update `backend/.env.example`.

**Steps:** Convert decimal ticket prices to paise using decimal-string parsing (reject more than two fractional digits); create immutable attempt rows with distinct idempotency keys; support configured mock success/failure/pending outcomes and delayed completion; label all mock outcomes. No real provider SDK or credentials.

## Task 4: Implement capacity reservation, retry, and FIFO offer service

**Files:** Create focused `backend/src/services/registrationPaymentService.js` or equivalent; modify `backend/src/controllers/registrationController.js` and `backend/src/services/notificationService.js`.

**Steps:** Add tests for atomic checkout, exact-once seatsTaken changes, full-capacity retry rejection without a Payment row, distinct retry attempts (including retry blocking while a late-success refund is unresolved), payment confirmation without another increment, and duplicate callbacks. Add tests for FIFO head offer, offer expiry/failure tail movement, one offer per attempt, late-success refund exclusion from both retries and offers, and next-eligible promotion. Implement in IMMEDIATE transactions with conditional `PENDING` updates. Keep the free path and free FIFO promotion characterized by existing tests.

## Task 5: Implement cancellation and refund lifecycle

**Files:** Modify `backend/src/controllers/registrationController.js`, `backend/src/controllers/eventController.js`; extend payment/refund service and `backend/test/event-api.test.js`.

**Steps:** Test refund cutoff before/at/after, NULL 24-hour default, zero cutoff, negative validation, full captured amount, pending/failed/retry and mock-simulated versus provider-confirmed refund status distinction, attendee authorization, organizer cancellation idempotency, no waitlist promotion after event cancellation, free registrations without refunds, and concurrent cancellation. Implement refund creation with a stable idempotency key; only real provider confirmation may yield `COMPLETED`.

## Task 6: Add safe expiry and restart reconciliation

**Files:** Modify `backend/src/server.js`; extend payment service and tests.

**Steps:** Test repeated expiry scans, success-versus-expiry race, failed/expired release exactly once, waitlist offer rotation, and startup reconciliation after an expired timestamp. Run scans at startup and periodically inside the existing backend process; no external worker/queue. Each transaction only expires still-`PENDING` attempts. Keep the 10-minute reservation duration configurable.

## Task 7: Expose and integrate attendee UI

**Files:** Modify `backend/src/routes/registrationRoutes.js`; create `backend/src/routes/paymentRoutes.js` and `backend/src/controllers/paymentController.js`; modify `frontend/src/api/registration.js`, `frontend/src/pages/EventDetails.jsx`, `frontend/src/pages/Dashboard.jsx`, `frontend/src/components/MyRegistrations.jsx`, and `frontend/src/styles.css`.

**Steps:** Add authenticated checkout/retry/status actions and development-only mock completion controls if required. Show paid checkout, pending payment, retryable failure, waitlist offer, refund pending, and mock-simulated messages. Preserve validation and accessible loading/error/status feedback. Do not show simulated results as actual settlement.

## Task 8: Document and run full verification

**Files:** Update `docs/API_REFERENCE.md` and `README.md` only as needed to explain mock limitations and local configuration. No SRS/SAD requirement changes unless an implementation mismatch is found and approved.

**Steps:** Run the complete backend suite (`cd backend; npm test`), frontend production build (`cd frontend; npm run build`), migration preservation test, and browser smoke checks for free registration plus paid mock success/failure/pending/retry/refund. Inspect `git diff --check`, full diff, status, and verify original Issue #25 worktree remains unchanged. Report exact commands/results; do not commit/push/merge/close.

## Decision log

| Decision | Alternatives | Reason |
|---|---|---|
| Separate Payment attempts and Refund rows | Put payment flags on Registration; one Payment per registration | Preserves attempt/refund history without duplicating financial state on registrations. |
| Reuse `seatsTaken` | Derive capacity on every request or add a second counter | Keeps existing capacity gate; pending reservations count while confirmation does not double increment. |
| Add `waitlistPositionAt` | Mutate `createdAt` or rely on `updatedAt` | Retains creation timestamp meaning while supporting FIFO requeue. |
| Process expiry in-process | Separate queue/worker | Simple for the academic project; startup reconciliation handles downtime. |
| Mock provider only | Select a live gateway now | Provider has not been selected; UI/docs must label simulation. |
| Use IMMEDIATE SQLite transactions | Assume ORM locking or row-level `FOR UPDATE` | Verified on installed versions: Sequelize emits `BEGIN IMMEDIATE`; two-connection capacity probe serialized claims. |

## Verification checklist

- No real provider, external service, queue, or credentials added.
- No card data stored.
- Existing free flow and Issue #25 regressions pass.
- Every seat reservation/release path is exact-once and transactionally tested.
- Duplicate callbacks and expiry scans are idempotent.
- Late success stays unconfirmed and refund-pending.
- Mock `SIMULATED` is distinct from real `COMPLETED`.
- Final report includes files, test/build commands, results, and mock-provider limitations.

### Independent design review refinements

A read-only independent review confirmed the single-process SQLite locking approach and emphasized these enforcement details: retry and reservation belong in the same transaction; a failed/expired offer requeues only after a conditional registration state change; late success must also block checkout retries while its refund remains unresolved; organizer cancellation expires pending attempts and cancels registrations in the same transaction without calling promotion; mock `SIMULATED` resolves demo gating but is never real settlement.

## Execution record — 2026-11-01

- Backend: `npm test` — **51 passed, 0 failed**. The suite included Issue #25 registration regressions, Issue #26 payment/refund rules, FIFO/expiry races, concurrency, and migration preservation.
- Frontend: `npm run build` — **passed** (`vite build`, 106 modules transformed).
- `git diff --check` — passed.
- Browser smoke test used a temporary SQLite database and test-only users. Checkout, failure, retry, success, one-minute offer expiry/FIFO advancement, and refund UI were verified. The event page does not auto-refresh when an offer expires; revisiting the page showed the updated status and next offer.
- The original `codex/issue-25-registration` checkout remained unchanged. The Issue #26 changes are isolated in this worktree on `codex/issue-26-payments`.