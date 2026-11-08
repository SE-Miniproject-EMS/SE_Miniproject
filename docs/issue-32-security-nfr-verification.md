# Issue #32: Security NFR Verification — Passwords, Payments, RBAC and Session Expiry

**SRS traceability:** NFR-SEC-01 through NFR-SEC-04  
**Reviewed baseline:** uploaded repository snapshot dated 8 November 2026  
**Verification rule:** Distinguish implemented controls from blocked or partial controls. This report does not claim PCI compliance or complete security certification.

## 1. Summary

| NFR | Control | Status | Evidence / limitation |
|---|---|---|---|
| NFR-SEC-01 | Salted password hashing and no password leakage | **Implemented / regression-tested** | Registration uses bcrypt; public user serialization excludes password fields; the integration suite checks bcrypt hash format and verifies the plaintext test password is absent from backend output. |
| NFR-SEC-02 | Payment/card-data security and PCI-compliant provider flow | **Blocked / not verified** | No payment provider is selected or configured. Paid-event registration is deliberately rejected with `PAYMENT_INTEGRATION_REQUIRED`; no payment or registration is confirmed from client-supplied card data. A real provider-backed PCI flow is not implemented and no PCI-compliance claim is made. |
| NFR-SEC-03 | Server-side role-based access control | **Partially verified; route matrix added** | Authentication and role middleware protect every mounted protected route. The new route-matrix integration test exercises anonymous, Attendee, Organizer and Admin access for all mounted protected endpoint families. Object ownership remains a separate authorization dimension and is covered by event/registration/feedback ownership tests. |
| NFR-SEC-04 | Configurable inactivity expiry | **Implemented / regression-tested** | Session records store idle deadlines; authenticated activity extends the idle deadline; extension is capped at the JWT absolute `exp`. Default `SESSION_IDLE_TIMEOUT_SECONDS=1800` (30 minutes). |

## 2. NFR-SEC-01 — password storage and leakage

### Implementation evidence

- Registration validates the password and hashes it using `bcryptjs` before persistence.
- User responses are constructed through a public serializer that returns only `id`, `name`, `email`, `role`, `isVerified` and `createdAt`; it does not expose `passwordHash`, raw password, lock counters or session data.
- The generic error handler returns a generic message for internal errors and has an explicit rule not to log passwords or tokens.
- The integration test inspects the SQLite record, verifies the stored value is a bcrypt hash and checks it with `bcrypt.compare`.
- The regression assertion checks that the known plaintext password fixture does not occur in captured backend output.

### Verification

Run:

```bash
cd backend
npm test
```

Test names include:
- `registration creates an account and does not expose its password hash`
- `registration stores a bcrypt password hash rather than plaintext`
- `security NFR route matrix: every mounted protected endpoint enforces role authorization`

The explicit no-plaintext-log assertion is in the security integration tests. These tests verify the observed code paths; they are not a guarantee against every possible future logging regression.

## 3. NFR-SEC-02 — payment and card-data handling

### Current safe behavior

There is no payment gateway SDK, provider account, webhook signing secret or verified payment callback in the reviewed baseline. The registration controller checks the event's `ticketPrice` before creating a registration. For a paid event it returns:

```json
{
  "error": {
    "code": "PAYMENT_INTEGRATION_REQUIRED",
    "message": "Paid-event registration is disabled until a payment gateway is configured and verified"
  }
}
```

The API does not accept a client assertion of payment success and does not create a registration for a paid event. The new regression test submits recognizable card-number/CVV sentinel strings and verifies:
- the API returns HTTP 402 with `PAYMENT_INTEGRATION_REQUIRED`;
- the response does not reflect the card-data sentinels;
- captured backend output does not contain the sentinels;
- no registration row is created for the paid event.

### Explicit limitation

This is a **fail-closed boundary**, not a PCI-compliant payment integration. The project must not claim that it processes card payments securely or is PCI compliant. Before paid registration can be enabled, select a provider and use its hosted/tokenized checkout, verify signed server-to-server callbacks, handle duplicate/out-of-order callbacks idempotently, and never store/log PAN or CVV. Test against the provider sandbox and document the provider's compliance responsibility.

## 4. NFR-SEC-03 — server-side RBAC verification

### Role policy

| Role | Intended permission |
|---|---|
| Anonymous | Public health and published-event discovery only; no protected API |
| ATTENDEE | Own registration list, register/cancel own registration, submit eligible feedback |
| ORGANIZER | Create/manage own events, check in tickets for own events, view feedback for own events |
| ADMIN | Administrative event management, cross-event operational access, reminder-job execution |

The UI is not the security boundary. Protected routes use `authenticate` to validate a bearer JWT and an active server-side session. `authorize(...)` rejects roles not explicitly allowed. Ownership checks in controllers ensure an Organizer cannot manage another Organizer's event or view another Organizer's feedback.

### Complete mounted-route family matrix

The automated test `security NFR route matrix: every mounted protected endpoint enforces role authorization` runs requests with no token and with each of the three roles. For authorized role requests, the test uses valid endpoint shapes and expects either a successful response or a downstream 404/validation result; the important check is that the role middleware does not incorrectly deny an allowed role.

| Mounted route family | Endpoint(s) | Anonymous | ATTENDEE | ORGANIZER | ADMIN |
|---|---|---:|---:|---:|---:|
| Health | `GET /api/health` | Allow | Allow | Allow | Allow |
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/verify/:token` | Allow | Allow | Allow | Allow |
| Authenticated profile | `GET /api/auth/me` | 401 | Allow | Allow | Allow |
| Public events | `GET /api/events`, `GET /api/events/:id` | Allow | Allow | Allow | Allow |
| Event management | `GET /api/events/manage/mine`, `POST /api/events`, `PUT /api/events/:id`, `POST /api/events/:id/publish`, `POST /api/events/:id/cancel` | 401 | 403 | Allow (ownership enforced) | Allow |
| Registration | `GET /api/registrations/mine` | 401 | Allow | 403 | Allow |
| Registration | `POST /api/registrations/events/:eventId`, `POST /api/registrations/:id/cancel` | 401 | Allow (own attendee registration) | 403 | 403 |
| Ticket check-in | `POST /api/registrations/check-in` | 401 | 403 | Allow (own event only) | Allow |
| Feedback submission | `POST /api/feedback/events/:eventId` | 401 | Allow (eligible attendee only) | 403 | 403 |
| Feedback viewing | `GET /api/feedback/events/:eventId` | 401 | 403 | Allow (own event only) | Allow |
| Reminder job | `POST /api/notifications/jobs/reminders` | 401 | 403 | 403 | Allow |
| Protected example | `GET /api/example/ping` | 401 | Allow | Allow | Allow |
| Organizer example | `GET /api/example/organizer-only` | 401 | 403 | Allow | Allow |
| Admin example | `GET /api/example/admin-only` | 401 | 403 | 403 | Allow |

`Allow` means the route's role middleware allows the request; business validation and ownership checks can still reject it. Public registration/login/verification endpoints do not grant privileged roles: self-registration is restricted to ATTENDEE/ORGANIZER and explicitly rejects ADMIN.

### Ownership checks

The route matrix covers role gates. Separate integration tests must continue to cover object-level authorization:
- an Organizer can modify their own event but not another Organizer's event;
- an attendee can cancel only their own registration;
- only the event Organizer (or Admin) can check in a ticket;
- only the event Organizer (or Admin) can view event feedback.

Any new route added later must be added to the route matrix and have both role-level and object-level authorization tests where applicable.

## 5. NFR-SEC-04 — inactivity and absolute session expiry

### Implementation

- Successful login issues a JWT with an absolute `exp` and unique `jti`.
- A server-side `sessions` row is created for that `jti`, storing `idleExpiresAt`.
- The authentication middleware verifies the JWT and then atomically touches the session.
- Requests are rejected when the session row is missing, its idle deadline has elapsed, or the JWT absolute expiration has been reached.
- A valid request extends the idle deadline, but never beyond the token's absolute expiry.
- `SESSION_IDLE_TIMEOUT_SECONDS` configures the inactivity window. Default: `1800` seconds (30 minutes). Invalid non-positive/non-integer values fail at startup.

### Existing regression test

`authenticated activity extends a session and expired or removed sessions stay invalid` verifies:
1. the session deadline is advanced by an authenticated request;
2. the new deadline is capped at JWT `exp`;
3. a session forced to an expired deadline is rejected;
4. a deleted server-side session is rejected even if the JWT itself has not expired.

The default 30-minute configuration is used in the test harness. To verify another deployment value, start the backend with a different positive `SESSION_IDLE_TIMEOUT_SECONDS` value and inspect the generated idle deadline; do not change the production setting solely for a test.

## 6. Verification commands

From the repository root:

```bash
cd backend
npm ci
npm test
```

The tests use disposable temporary SQLite databases. They do not need payment-provider credentials because the paid-registration test verifies the fail-closed behavior, not a provider transaction.

## 7. Outstanding security work

1. **Payment provider:** select and configure a gateway sandbox; implement hosted/tokenized payment and signed webhook verification before enabling paid registration.
2. **PCI review:** document the provider integration boundary, data-flow, retention, logging redaction and responsibility split. Do not state “PCI compliant” without an appropriate assessment.
3. **RBAC maintenance:** keep the route matrix synchronized with every newly mounted route and add ownership checks for all resource-scoped operations.
4. **Session deployment:** use a stable, securely managed JWT secret across API instances. If deployed horizontally, session storage must move from local SQLite to a shared transactional database so all instances enforce the same idle deadline.
5. **Security regression:** retain the password-log and card-data-sentinel assertions in CI.

## 8. Conclusion

NFR-SEC-01 and NFR-SEC-04 have implementation and regression-test evidence in the reviewed snapshot. NFR-SEC-03 now has a broader route-level matrix, but object-level authorization must remain covered and the matrix must evolve with new endpoints. NFR-SEC-02 remains blocked: the application safely refuses paid registration, but no provider-backed payment flow or PCI verification exists. Keep Issue #32 open until the payment dependency is resolved or formally accepted as outside project scope and the RBAC evidence is reviewed.
