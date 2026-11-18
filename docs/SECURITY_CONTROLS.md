# Security controls and verification evidence

**Reviewed baseline:** main through PR #56 (11 November 2026).  
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

## RBAC evidence

The test named `security NFR route matrix: every mounted protected endpoint enforces role authorization` in `backend/test/event-api.test.js` checks anonymous, Attendee, Organizer and Admin requests for the listed protected endpoints. Object ownership remains a distinct check; a route can pass a role gate and still reject an Organizer who does not own the event.

When a new protected route is added:
1. Add it to the route-matrix test.
2. Add an allow/deny assertion for each relevant role.
3. Add object-ownership assertions where the resource belongs to a user/organizer.
4. Rerun tests/coverage and link the CI run from the PR and issue.

## Payment security boundary — important limitation

PR #48 introduces a mock-only checkout/refund simulator. It is not a third-party gateway. No real card/UPI processor, hosted checkout, signed provider callback, or provider-confirmed refund is configured. The mock tests prove selected code paths ignore card-data sentinels and label refund outcomes as simulated; they do **not** prove PCI compliance. Do not enter real card data or claim that PCI requirements have been satisfied.

## Remaining security/operational work

- Choose and integrate a payment provider sandbox, verify signed callbacks/idempotency and provider-confirmed refunds before enabling real paid transactions.
- Configure external notification provider credentials before claiming delivery.
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

The latest recorded integrated-code CI run is [#42747239410](https://github.com/SE-Miniproject-EMS/SE_Miniproject/actions/runs/42747239410): 55 backend tests passed, 0 failed; backend syntax validation and frontend build succeeded.
