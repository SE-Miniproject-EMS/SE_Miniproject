# Implemented functionality baseline

**Snapshot date:** 18 November 2026  
**Source:** code and merged PRs on main through PR #56 (11 November 2026).  
**Purpose:** separate working prototype behavior from requirements that are mocked, partially implemented or not verified. This is not a production release certification.

## Delivered in the current code baseline

| Area | Implemented behavior | Main evidence |
|---|---|---|
| Authentication | Attendee/Organizer self-registration, duplicate-email rejection, bcrypt password hashing, verification gate, JWT access tokens and five-failure/15-minute lockout. Admin self-registration is rejected. | `backend/src/controllers/authController.js`, `backend/test/auth-api.test.js` |
| Session security | Persisted Session rows, configurable idle expiry (`SESSION_IDLE_TIMEOUT_SECONDS`, default 1800 seconds), activity extends idle deadline but never beyond JWT absolute expiry. | PR #51; `backend/src/models/Session.js`, `backend/src/middleware/auth.js`, auth tests |
| Role and ownership | Bearer authentication, route-level role authorization, Organizer ownership restrictions and Admin override on applicable event/check-in/feedback routes. | PR #55; `backend/test/event-api.test.js` route matrix and ownership tests |
| Event management | Draft creation, editing, publishing, cancellation, validation and public event details. | `backend/src/controllers/eventController.js`, event API tests |
| Event discovery | Upcoming published event listing, keyword/category/location/date filters and pagination. | `frontend/src/pages/Events.jsx`, `backend/test/event-api.test.js` |
| Free registration | Authenticated attendee registration, capacity transaction, unique attendee/event registration, FIFO waitlist, cancellation cutoff and promotion. | PR #47; registration API tests |
| Paid prototype | Payment/Refund persistence, 10-minute capacity reservations, mock payment success/failure/pending, retry, FIFO paid offers and simulated full refunds. | PR #48; `Payment.js`, `Refund.js`, `mockPaymentAdapter.js`, payment integration/rule tests |
| Notifications | Notification records/service, deduplication and reminder job; queue/console development adapter. | PR #42; `notificationService.js`, `sendReminders.js` |
| Ticket/check-in | One-use ticket tokens and organizer/Admin check-in API. | PR #42/#47; registration API tests |
| Feedback | Feedback model/API, checked-in attendee eligibility and organizer/Admin event-scoped access. | PR #42; feedback API tests |
| Frontend | React/Vite pages for discovery, event lifecycle, accounts, attendee registration/payment demo and user dashboards. | `frontend/src/pages/`, `frontend/src/components/` |
| CI | GitHub Actions backend syntax validation/tests and frontend production build. Coverage artifact is being added in the assessor-evidence branch. | `.github/workflows/ci.yml` |

## Partial, mock-only and unverified requirements

| SRS area | Status | Current evidence / limitation |
|---|---|---|
| REQ-11–REQ-14 registration | **Partially implemented** | Free registration, capacity and FIFO waitlist are implemented. Paid prototype is mock-only. External notification delivery remains unconfigured. 500-attempt load result is not yet recorded. |
| REQ-15–REQ-17 payment/refund | **Mock prototype only** | PR #48 adds mock checkout/refund states. No live provider, gateway sandbox, signed callback or provider-confirmed money movement is configured. |
| REQ-18–REQ-20 notifications | **Partially implemented** | Notification queue/reminder job exists; external email/SMS provider delivery and end-to-end delivery evidence are absent. |
| REQ-21–REQ-23 ticket/check-in | **Partially implemented** | One-use token and check-in API exist. QR image/ticket rendering and camera/scanner UI remain incomplete. |
| REQ-24–REQ-26 reporting | **Not implemented** | Organizer/admin dashboards and CSV reporting remain backlog issue #29. |
| REQ-27–REQ-28 feedback | **Partially implemented** | Model/API and eligibility rules exist; complete attendee feedback prompt and organizer-facing dashboard UI remain incomplete. |
| NFR-PERF-01 | **Locally measured** | 8 Nov event-search benchmark: 1,000/1,000 requests succeeded using 100 workers; p95 194.802 ms, max 301.311 ms, all below 2 seconds. Local synthetic data only; no production SLA claim. |
| NFR-PERF-02 | **Not verified** | PR #54 adds an isolated 500-registration harness; no registration-specific result JSON/CSV is committed. |
| NFR-SEC-01 | **Regression-tested for covered paths** | bcrypt storage, response redaction and no plaintext test-password log assertion. |
| NFR-SEC-02 | **Blocked / not verified** | Mock adapter is not a provider. No PCI/provider sandbox or signed callbacks; no PCI-compliance claim. |
| NFR-SEC-03 | **Verified for current mounted protected route matrix** | PR #55 exercises anonymous/Attendee/Organizer/Admin roles; object ownership tests are separate. Extend matrix as routes change. |
| NFR-SEC-04 | **Implemented / regression-tested** | Persisted idle deadline, idle extension, rejection of expired sessions and JWT absolute expiry cap; default 30 minutes. |
| NFR-USAB-01 | **Not verified** | PR #56 prepared procedure; no representative timed participant result exists. |
| NFR-REL-01 | **Not verified** | Local-only environment; no production monitoring contract or 99% uptime time series. |
| NFR-MAINT-01 | **Partially satisfied** | Routes/controllers/models separated; business logic and persistence coupling remain in controllers. |
| NFR-SCAL-01 | **Not demonstrated** | Single-process/local SQLite setup does not demonstrate horizontal scaling or shared transactional database behavior. |

## Source-of-truth documents

- [API reference](API_REFERENCE.md)
- [Testing and results](TESTING_AND_RESULTS.md)
- [Testing and coverage](TESTING_AND_COVERAGE.md)
- [Security controls](SECURITY_CONTROLS.md)
- [Operations runbook](OPERATIONS_RUNBOOK.md)
- [Architecture/NFR assessment](ARCHITECTURE_NFR_ASSESSMENT.md)
- [FR traceability](FR_TRACEABILITY_MATRIX.md)
- [NFR traceability](NFR_TRACEABILITY.md)
