# Implemented functionality baseline

**Snapshot updated:** 18 November 2026 (main through merged PRs #58–#60)
**Purpose:** Distinguish delivered behavior from the intended full-product requirements in the SRS. This status reflects the source files in this repository snapshot; it is not a release certification.

## Delivered in the current code baseline

| Area | Implemented behavior | Source / evidence |
| --- | --- | --- |
| Account registration | Attendee and Organizer self-registration; name/email/password validation; duplicate email rejected; passwords stored as bcrypt hashes; safe user response excludes the hash. ADMIN cannot self-register. | `backend/src/controllers/authController.js`, `backend/src/utils/validators.js`, `backend/src/models/User.js`, `backend/test/auth-api.test.js` |
| Email verification | Signed verification token, one-day expiry, verification route, and login gate for unverified accounts. The link is printed to the backend console for development; no email provider is integrated. | `backend/src/controllers/authController.js`, `backend/src/utils/jwt.js` |
| Login protection | JWT access token; role in token; five consecutive failed passwords trigger a 15-minute lockout; login endpoint also has an IP-based rate limiter of 20 requests per 15 minutes. JWT absolute expiry is configurable through `JWT_EXPIRES_IN`; a database-backed idle session expires after a configurable inactivity period (`SESSION_IDLE_TIMEOUT_SECONDS`, default 1800 seconds), capped by the JWT expiry. | `backend/src/controllers/authController.js`, `backend/src/routes/authRoutes.js`, `backend/src/middleware/auth.js`, `backend/src/models/Session.js`, `backend/src/utils/jwt.js`, `backend/test/auth-api.test.js` |
| Role/ownership checks | Protected event management routes require a Bearer JWT and ORGANIZER or ADMIN role. Organizers can change their own events; ADMIN can manage all events. | `backend/src/middleware/auth.js`, `backend/src/routes/eventRoutes.js`, `backend/src/controllers/eventController.js`, API tests |
| Event lifecycle | Create DRAFT or valid PUBLISHED events; edit, publish and cancel; canceled events cannot be re-published or edited. | `backend/src/controllers/eventController.js`, `backend/src/models/Event.js`, `backend/test/event-api.test.js` |
| Event discovery | Public listing of future PUBLISHED events, sorted by start date/time; keyword search in title/description; category, venue/location substring and date filters; pagination (default page 1, default limit 9, max limit 50). Public detail endpoint returns only published events. | `backend/src/controllers/eventController.js`, `frontend/src/pages/Events.jsx`, `backend/test/event-api.test.js` |
| Browser interface | React/Vite pages for home, event discovery/details, account registration/login, event creation/editing and organizer event management. | `frontend/src/App.jsx`, `frontend/src/pages/`, `frontend/src/api/` |
| Persistence | Sequelize models for `User`, `Session`, `Event`, `Registration`, `Payment`, `Refund`, `Notification` and `Feedback`; SQLite file for local development and isolated tests. Organizers own Events; Events have Registration records; notifications link to recipients/events/registrations. | `backend/src/config/db.js`, `backend/src/models/`, `backend/src/server.js` |
| Email notification delivery | Notification outbox has a Resend adapter, a development-only console adapter, atomic worker claims, idempotency keys and bounded retries. Actual external delivery requires Resend credentials and sender configuration. | PR #58; `backend/src/services/notificationService.js`, `backend/src/jobs/dispatchNotifications.js`, `backend/test/notification-provider.test.js` |
| Organizer/admin reporting | Organizer/Admin report API returns scoped event aggregates; the dashboard displays event metrics; registration and attendance CSV endpoints apply the same role/ownership scope and escape spreadsheet-formula values. Revenue from mock payments is reported separately from non-mock revenue. | PR #59; `backend/src/routes/reportRoutes.js`, `frontend/src/components/EventReports.jsx`, `backend/test/event-api.test.js` |
| Automation | GitHub Actions installs dependencies, checks backend JavaScript syntax, runs backend tests with line/branch/function coverage, uploads a coverage artifact, and builds the frontend. | `.github/workflows/ci.yml`, `backend/.c8rc.json` |

## Partially implemented and not implemented requirements

The following are still target requirements/backlog items, not delivered features. They must not be shown as implemented in the SRS, diagrams, demo, or test results.

| SRS area | Status | Current evidence / consequence |
| --- | --- | --- |
| REQ-11–REQ-14: Event registration, waitlist and cancellation | **Partially implemented** | Free-event registration, capacity protection, FIFO waitlist promotion, attendee cancellation and configured cutoff are implemented. Paid checkout uses the mock payment/refund prototype, not a real payment provider. Six simultaneous last-seat requests are covered by integration testing; the SRS 500-attempt load target is not verified. |
| REQ-15–REQ-17: Payments and refunds | **Mock prototype only** | Payment/Refund models, pending reservations, simulated success/failure/refund and idempotent mock outcomes exist. No third-party provider, signed callback, provider-confirmed money movement or PCI evidence exists. |
| REQ-18–REQ-20: Confirmation/reminder/change notifications | **Partially implemented** | The outbox, Resend email adapter, console development adapter, dispatcher, atomic claims and bounded retry flow are present. Production delivery still requires valid provider credentials/sender configuration and end-to-end delivery verification; SMS is not configured. |
| REQ-21–REQ-23: QR tickets and check-in | **Partially implemented** | Confirmed registrations receive unique one-use ticket tokens (stored as hashes) and an organizer/admin check-in API exists. QR image generation and camera/scanner UI are absent. |
| REQ-24–REQ-26: Dashboards and CSV reporting | **Implemented in the current prototype** | PR #59 adds organizer/admin scoped report aggregates, dashboard metrics, registration/attendance CSV exports, event/date filters and CSV formula neutralization. The UI/API still require normal role and data-scope verification when changed. |
| REQ-27–REQ-28: Feedback and ratings | **Partially implemented** | Feedback model/API supports eligible checked-in attendee submissions and restricted organizer/admin views; the complete attendee feedback prompt/UI is absent. |
| NFR-PERF-02: 500 concurrent registrations / no overbooking | **Functional concurrency covered; load target not verified** | Six simultaneous attempts for the last seat are covered by the registration integration suite and preserve capacity; the SRS target of 500 concurrent attempts has not been run. |
| NFR-SEC-02: Payment data / PCI gateway flow | **Not verified / provider blocked** | The payment model and mock simulator do not integrate a PCI-compliant provider or provide signed callback/provider-confirmed payment evidence. This is not evidence of PCI compliance. |
| NFR-SEC-04: Expiration after inactivity | **Implemented in the current backend** | Login creates a persisted Session row; authenticated activity advances the idle deadline, expired/deleted sessions are rejected, and the idle deadline cannot exceed JWT absolute expiry. `SESSION_IDLE_TIMEOUT_SECONDS` defaults to 1800 seconds (30 minutes). |
| NFR-REL-01 / NFR-SCAL-01: 99% uptime / horizontal scale | **Not verified** | No deployed production environment or availability study is included. Local SQLite results are not production reliability evidence. |

## Local performance observation for the event search/listing API

A developer-run benchmark on 8 November 2026 used 1,000 synthetic future published events, 100 concurrent workers and 1,000 measured requests against a local SQLite-backed API. The terminal output recorded 1,000/1,000 successful requests, p95 latency **194.802 ms**, maximum latency **301.311 ms**, and all requests under two seconds. This is evidence for that specific local workload only, not a production service-level guarantee. The historical search benchmark did not exercise registration. The free-event registration API has functional concurrency coverage (six simultaneous requests for the last seat), but the SRS 500-attempt load target and paid-record retention remain **NOT VERIFIED**. The historical search benchmark does not measure registration and must not be used as evidence for that target.

## Source of truth and maintenance

- API routes and payloads: [API Reference](API_REFERENCE.md)
- Test commands and current evidence: [Testing and Results](TESTING_AND_RESULTS.md)
- UML source files / diagrams: [`diagrams/`](diagrams/)
- Original target requirements: `Event_Management_System_SRS.docx`
- Architecture and design: `Event_Management_System_SAD.docx`

When a planned module is implemented, update this baseline, the SRS/SAD diagrams, API reference and test evidence in the same release or PR. Keep planned requirements separate from verified behavior.
