# Security controls and verification evidence

**Reviewed baseline:** main through PR #60 (18 November 2026).  
**Purpose:** provide a code-linked security control register for an assessor. This is not a penetration-test report, production security certification or PCI assessment.

## Implemented controls

| Control | Implementation reference | Test/evidence | Status and limitation |
|---|---|---|---|
| Password hashing | `backend/src/controllers/authController.js`, `backend/src/models/User.js` | `backend/test/auth-api.test.js`; PR #52 | bcrypt hash stored; public user serialization omits password fields; regression assertion checks plaintext test password is absent from backend output |
| Login failure protection | `authController.js`, auth routes | `auth-api.test.js` | Five consecutive failed attempts trigger a 15-minute lock; login route also has an IP rate limiter (see code/config) |
| JWT authentication | `backend/src/utils/jwt.js`, `backend/src/middleware/auth.js` | `jwt.test.js`, `auth-api.test.js` | Signed bearer token with configurable absolute expiry |
| Inactivity expiry | `backend/src/models/Session.js`, `auth.js` | PR #51; `auth-api.test.js` | Persisted idle deadline, extended by authenticated activity, capped by JWT absolute expiry; default `SESSION_IDLE_TIMEOUT_SECONDS=1800` |
| Role-based access | Route middleware and protected route files under `backend/src/routes/` | PR #55; `event-api.test.js` route matrix | Direct requests cover anonymous, ATTENDEE, ORGANIZER and ADMIN against the mounted protected route families |
| Resource ownership | Event, registration, check-in and feedback controllers | `event-api.test.js` | Separate tests cover own-event/own-registration/eligible-feedback boundaries |
| Card-data handling in mock flow | `backend/src/services/mockPaymentAdapter.js`, payment/registration controllers | PR #48; `event-api.test.js` | Submitted card-data sentinels are ignored and not returned/logged; payment outcome is simulated only |
| Error handling | `backend/src/middleware/errorHandler.js` | API tests and log assertions | Generic external errors and explicit secret redaction rules are present; retain regression tests when logging changes |
| Environment configuration | `backend/.env.example`, `.gitignore` | setup/CI review | Example secrets are placeholders; real secrets must remain outside Git |
| Notification provider boundary | `backend/src/services/notificationService.js` | PR #58; provider adapter tests | Resend API key and sender address are read from environment variables; provider calls use HTTPS and a notification dedupe key as an idempotency key. Console adapter is development-only. Do not commit provider credentials. |
| Report authorization / CSV safety | `backend/src/routes/reportRoutes.js`, `frontend/src/components/EventReports.jsx` | PR #59; `backend/test/event-api.test.js` | Report routes require Organizer/Admin; Organizer queries are scoped to owned events, Admin can view platform scope; CSV cells neutralize spreadsheet formulas and quote/escape values. Keep route scope tests current. |

## RBAC evidence

The test named `security NFR route matrix: every mounted protected endpoint enforces role authorization` in `backend/test/event-api.test.js` checks anonymous, Attendee, Organizer and Admin requests for the listed protected endpoints. Object ownership remains a distinct check; a route can pass a role gate and still reject an Organizer who does not own the event.

When a new protected route is added:
1. Add it to the route-matrix test.
2. Add an allow/deny assertion for each relevant role.
3. Add object-ownership assertions where the resource belongs to a user/organizer.
4. Rerun tests/coverage and link the CI run from the PR and issue.

## Payment security boundary — important limitation

PR #48 introduces a mock-only checkout/refund simulator. It is not a third-party gateway. No real card/UPI processor, hosted checkout, signed provider callback, or provider-confirmed refund is configured. The mock tests prove selected code paths ignore card-data sentinels and label refund outcomes as simulated; they do **not** prove PCI compliance. Do not enter real card data or claim that PCI requirements have been satisfied.

### Approved academic payment and security scope

The project owner approved mock payments only for this academic mini-project. For NFR-SEC-02, completion is limited to the simulator's security boundary: authentication and role/ownership checks; ignoring submitted card/CVV data in the tested API, database rows and logs; rejecting unsupported simulation outcomes; and blocking mock checkout/retry/payment/refund operations when `NODE_ENV=production`. It does not verify the original third-party provider/PCI requirement. Real gateway signatures, provider-confirmed refunds and PCI assessment are explicitly deferred, rather than recorded as passed. This decision does not silently replace the historical SRS wording.

`backend/test/event-api.test.js` extends the role matrix to payment simulation, refund simulation, checkout retry, notification dispatch and both CSV report exports. Its ownership scenario checks that an unrelated attendee cannot simulate, retry or resolve another attendee's refund. The card/CVV sentinel check inspects stored registration, payment, refund and notification rows as well as the API response and captured backend output. These are synthetic-data tests of selected paths, not a universal data-leakage guarantee.

`backend/test/mock-security.test.js` checks unsupported outcome rejection and runs a separate production-mode process to verify mock service entry points fail before database access. Password hashing/redaction and idle/absolute session expiry remain covered by the existing authentication/JWT suites. Keep these tests aligned with future route changes.

## Notification delivery boundary

PR #58 adds a Resend adapter using `RESEND_API_KEY` and `NOTIFICATION_FROM_EMAIL`, plus notification worker claims, retries and idempotency. The credentials are deployment secrets and must not be committed. The console adapter remains a non-production test adapter. SMS is not configured. A merged adapter and passing adapter tests do not prove that a production sender/domain has been verified or that real emails were delivered; check provider configuration and delivery logs before making that claim.

## Reporting access boundary

PR #59 adds Organizer/Admin reporting routes. `GET /api/reports` and CSV endpoints require server-side authentication and role authorization; Organizer reports are constrained to the Organizer's own event scope, while Admin receives platform-wide reports. CSV exports escape quoted fields and neutralize spreadsheet-formula prefixes. Keep these checks in the route integration tests as routes evolve.

## Remaining security/operational work

- Real payments are outside the approved academic scope. If introduced later, integrate a provider sandbox and verify signed callbacks/idempotency and provider-confirmed refunds before enabling real paid transactions.
- Configure Resend credentials and sender address in deployment secrets before claiming real event email delivery; no SMS adapter is configured.
- Review production TLS, deployment secrets, database access, logging, monitoring, backup and recovery controls in the target deployment.
- Keep route-level and object-level authorization tests aligned with every new endpoint.
- Do not commit real `.env` files, credentials, test-account passwords, tokens or real attendee data.

## Reproducible checks

```bash
cd backend
npm ci
npm test
npm run test:coverage
```

The historical integrated-code CI run [#42747239410](https://github.com/SE-Miniproject-EMS/SE_Miniproject/actions/runs/42747239410) recorded 55 backend tests passed, 0 failed. PR #58 added notification-provider tests; PR #59 added report authorization/CSV tests. The refreshed evidence branch adds a new coverage-enabled run, which will be linked after CI completes.
