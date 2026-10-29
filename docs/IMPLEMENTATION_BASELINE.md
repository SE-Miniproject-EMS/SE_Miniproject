# Implemented functionality baseline

**Snapshot reviewed:** 29 October 2026  
**Purpose:** Distinguish delivered behavior from the intended full-product requirements in the SRS. This status reflects the source files in this repository snapshot; it is not a release certification.

## Delivered in the current code baseline

| Area | Implemented behavior | Source / evidence |
| --- | --- | --- |
| Account registration | Attendee and Organizer self-registration; name/email/password validation; duplicate email rejected; passwords stored as bcrypt hashes; safe user response excludes the hash. ADMIN cannot self-register. | `backend/src/controllers/authController.js`, `backend/src/utils/validators.js`, `backend/src/models/User.js`, `backend/test/auth-api.test.js` |
| Email verification | Signed verification token, one-day expiry, verification route, and login gate for unverified accounts. The link is printed to the backend console for development; no email provider is integrated. | `backend/src/controllers/authController.js`, `backend/src/utils/jwt.js` |
| Login protection | JWT access token; role in token; five consecutive failed passwords trigger a 15-minute lockout; login endpoint also has an IP-based rate limiter of 20 requests per 15 minutes. JWT expiry defaults to one day and is configurable through `JWT_EXPIRES_IN`. | `backend/src/controllers/authController.js`, `backend/src/routes/authRoutes.js`, `backend/src/utils/jwt.js` |
| Role/ownership checks | Protected event management routes require a Bearer JWT and ORGANIZER or ADMIN role. Organizers can change their own events; ADMIN can manage all events. | `backend/src/middleware/auth.js`, `backend/src/routes/eventRoutes.js`, `backend/src/controllers/eventController.js`, API tests |
| Event lifecycle | Create DRAFT or valid PUBLISHED events; edit, publish and cancel; canceled events cannot be re-published or edited. | `backend/src/controllers/eventController.js`, `backend/src/models/Event.js`, `backend/test/event-api.test.js` |
| Event discovery | Public listing of future PUBLISHED events, sorted by start date/time; keyword search in title/description; category, venue/location substring and date filters; pagination (default page 1, default limit 9, max limit 50). Public detail endpoint returns only published events. | `backend/src/controllers/eventController.js`, `frontend/src/pages/Events.jsx`, `backend/test/event-api.test.js` |
| Browser interface | React/Vite pages for home, event discovery/details, account registration/login, event creation/editing and organizer event management. | `frontend/src/App.jsx`, `frontend/src/pages/`, `frontend/src/api/` |
| Persistence | Sequelize models for `User` and `Event`; SQLite file for local development. An Organizer/User owns zero or more events through `Event.organizerId`. | `backend/src/config/db.js`, `backend/src/models/User.js`, `backend/src/models/Event.js` |
| Automation | GitHub Actions installs dependencies, checks backend JavaScript syntax, runs backend tests, and builds the frontend. | `.github/workflows/ci.yml` |

## Not implemented in this snapshot

The following are still target requirements/backlog items, not delivered features. They must not be shown as implemented in the SRS, diagrams, demo, or test results.

| SRS area | Status | Current evidence / consequence |
| --- | --- | --- |
| REQ-11–REQ-14: Event registrations and waitlist | **Not implemented** | No Registration model or registration route is mounted. Event capacity is validated on event data, but no attendee booking/reservation flow exists. |
| REQ-15–REQ-17: Payments and refunds | **Not implemented** | No Payment model, payment route, gateway integration or refund workflow exists. |
| REQ-18–REQ-20: Confirmation/reminder/change notifications | **Not implemented** | No notification service/provider integration. Event cancellation does not contact registrants. The development verification link is a console log, not an email. |
| REQ-21–REQ-23: QR tickets and check-in | **Not implemented** | No registration ticket, QR-code generator or check-in endpoint exists. |
| REQ-24–REQ-26: Dashboards and CSV reporting | **Not implemented** | No organizer/admin dashboard or export endpoints exist. ADMIN is an access role for event management routes, not a delivered dashboard. |
| REQ-27–REQ-28: Feedback and ratings | **Not implemented** | No feedback model, API or UI exists. |
| NFR-PERF-02: 500 concurrent registrations / no overbooking | **Not tested / not applicable to current flow** | There is no registration flow to load test. Do not claim the registration integrity target is met. |
| NFR-SEC-02: Payment data / PCI gateway flow | **Not implemented** | There is no payment workflow in this snapshot. This is not evidence of PCI compliance. |
| NFR-SEC-04: Expiration after inactivity | **Partially implemented** | JWTs have a configured expiry (default one day); the application does not implement an inactivity timer that refreshes or expires sessions based on idle time. |
| NFR-REL-01 / NFR-SCAL-01: 99% uptime / horizontal scale | **Not verified** | No deployed production environment or availability study is included. Local SQLite results are not production reliability evidence. |

## Local performance observation for the event search/listing API

A developer-run benchmark on 29 October 2026 used 1,000 synthetic future published events, 100 concurrent workers and 1,000 measured requests against a local SQLite-backed API. The terminal output recorded 1,000/1,000 successful requests, p95 latency **178.211 ms**, maximum latency **259.926 ms**, and **100%** under two seconds. This is evidence for that specific local workload only, not a production service-level guarantee. Registration concurrency, capacity integrity and data preservation were explicitly **NOT TESTED** because the current snapshot has no registration workflow. The reproducible benchmark harness and raw artifacts should be merged with the related Issue #31 work before another developer relies on this number.

## Source of truth and maintenance

- API routes and payloads: [API Reference](API_REFERENCE.md)
- Test commands and current evidence: [Testing and Results](TESTING_AND_RESULTS.md)
- UML source files / diagrams: [`diagrams/`](diagrams/)
- Original target requirements: `Event_Management_System_SRS.docx`
- Architecture and design: `Event_Management_System_SAD.docx`

When a planned module is implemented, update this baseline, the SRS/SAD diagrams, API reference and test evidence in the same release or PR. Keep planned requirements separate from verified behavior.
