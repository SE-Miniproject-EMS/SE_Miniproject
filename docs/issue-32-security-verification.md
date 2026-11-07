# Issue #32 — Security NFR verification

**Verification baseline:** current `main` merged through the registration and idle-session changes (November 2026).  
**Scope:** NFR-SEC-01 through NFR-SEC-04 from SRS §6.3.2. This report distinguishes implemented controls from controls that cannot be certified in the current prototype.

## Security requirement evidence

| Requirement | Verification performed | Current status | Evidence / remaining gap |
|---|---|---|---|
| **NFR-SEC-01 — Password storage** | Register a user, inspect the persisted `passwordHash`, verify the bcrypt hash, confirm the public registration response omits credentials, and assert the plaintext fixture does not appear in captured backend output. | **Implemented for the exercised registration path** | `backend/test/auth-api.test.js`. The development email-verification URL is logged, but it does not contain the account password. |
| **NFR-SEC-02 — Payment data** | Attempt paid-event registration before a provider is configured; verify HTTP 402 `PAYMENT_INTEGRATION_REQUIRED`, no registration record is created, and test card-data sentinels are neither reflected nor logged. | **Not verified / provider blocked** | `backend/test/event-api.test.js`. No production payment provider or PCI-compliant hosted/tokenized flow is configured. The application does not currently persist PAN/CVV fields, but that alone is not evidence of PCI compliance. |
| **NFR-SEC-03 — Server-side RBAC** | Exercise protected event, registration, check-in and feedback endpoints with representative anonymous, Attendee, Organizer and ownership contexts; inspect route-level middleware and controller ownership predicates. | **Partially verified** | Authentication, role checks and key ownership rules have integration coverage. A complete endpoint-by-endpoint allow/deny matrix for every mounted API route has not been executed. |
| **NFR-SEC-04 — Inactivity expiry** | Verify the persisted session idle deadline, extension on authenticated activity, rejection at/after the idle deadline, and that activity cannot extend past the JWT absolute expiry. | **Implemented** | Merged PR [#51](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/51). `SESSION_IDLE_TIMEOUT_SECONDS` defaults to 1800 seconds (30 minutes); `JWT_EXPIRES_IN` still caps absolute token lifetime. See `backend/src/models/Session.js`, `backend/src/middleware/auth.js`, and `backend/test/auth-api.test.js`. Users must sign in again after deployment because tokens issued before session tracking have no persisted session row. |

## Endpoint permission review

| Endpoint group | Observed server-side controls | Remaining verification |
|---|---|---|
| Health, public event listing and public event details | Public; event visibility is constrained by event status/date. | Check public response fields for accidental disclosure as part of the broader API review. |
| Registration, login and email verification | Public entry points; registration role is constrained to Attendee/Organizer; verification requires a signed token. | Provider delivery is still development-console-only. |
| Current-user/profile and protected example routes | Bearer JWT authentication; role middleware where required. | Include all routes in a formal permission matrix. |
| Event management | Organizer/Admin role gates; Organizer event mutations check ownership. | Exercise every mutation route against an unrelated Organizer and Admin. |
| Attendee registrations | Attendee-only creation/cancellation; list is scoped to the signed-in attendee; cancellation checks ownership. | Include the payment retry and future provider callback routes once a provider exists. |
| Ticket check-in | Organizer/Admin route; event ownership is checked for Organizer. | Complete an explicit Admin/Organizer/Attendee allow/deny matrix. |
| Feedback | Submission requires an eligible checked-in attendee; reading is restricted to the event Organizer/Admin. | Continue direct-API authorization testing as routes evolve. |
| Notifications/reminder job | Reminder-job execution is Admin-only. | Validate every notification route and provider configuration before production. |

## Reproducible checks

Run from `backend/`:

```bash
npm ci
npm test
```

The test harness uses temporary SQLite databases and HTTP requests against the Express API. GitHub Actions runs backend syntax validation, the backend API test suite, and the frontend production build. Use the passing Actions run linked from the security PR as the authoritative CI evidence for this commit.

## Explicit limitations

- NFR-SEC-02 cannot be marked satisfied until a payment provider and its sandbox flow are selected and verified. The present API deliberately refuses paid registration rather than collecting card data.
- NFR-SEC-03 remains partial until the team records a route-by-route permission matrix, including negative cases.
- Local SQLite and local CI are not production security certification. Production TLS, deployment secrets, provider configuration, logging/monitoring, and operational controls require deployment-specific review.
