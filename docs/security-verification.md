# Security NFR verification

**Reviewed baseline:** integrated code through PR #55 (10 November 2026).  
**Scope:** NFR-SEC-01 through NFR-SEC-04 from SRS §6.3.2. This report is evidence for tested paths, not a production security certification or PCI assessment.

## Summary

| Requirement | Current status | Evidence / gap |
|---|---|---|
| NFR-SEC-01 — password storage | **Implemented / regression-tested** | bcrypt password hashes; public serializers omit credential fields; test asserts known plaintext password fixture is absent from captured backend output. PR #52. |
| NFR-SEC-02 — payment/card data | **Blocked / not verified** | PR #48 implements mock checkout/refund only. No real provider sandbox, signed callback, provider-confirmed refund or PCI flow is configured. Test sentinels are ignored/not reflected/logged in the mock path; no PCI claim is made. |
| NFR-SEC-03 — server-side RBAC | **Verified for currently mounted protected endpoints** | PR #55 adds a direct API route matrix for anonymous, ATTENDEE, ORGANIZER and ADMIN. Separate tests cover event, registration, check-in and feedback ownership. Keep matrix updated as routes evolve. |
| NFR-SEC-04 — inactivity expiry | **Implemented / regression-tested** | Persisted Session idle deadlines; activity extends deadline but never beyond JWT absolute `exp`. Default `SESSION_IDLE_TIMEOUT_SECONDS=1800`. PR #51. |

## 1. Password storage and leakage

Registration hashes passwords with bcrypt before persistence. Public user responses omit password hashes and credential/session fields. The integration tests verify bcrypt storage and assert the plaintext test password does not occur in captured backend output.

Run:
```bash
cd backend
npm test
```

## 2. Payment data handling

PR #48 adds a provider-independent mock payment/refund simulator. It creates payment/refund rows for prototype flows and uses explicit simulated outcomes. It is **not** a payment gateway and no money moves.

The security tests verify the exercised mock/checkout paths ignore supplied card-data sentinels and do not reflect or log them. No hosted/tokenized provider checkout, provider signing secret, signed webhook validation or provider-confirmed refund is configured. Do not describe this as PCI compliance.

Before enabling real paid registration, the team must select a provider, use its sandbox/hosted flow, verify signed callbacks, handle duplicate/out-of-order callbacks idempotently and review the provider data-flow and logging boundary.

## 3. RBAC route verification

The automated test `security NFR route matrix: every mounted protected endpoint enforces role authorization` checks listed protected routes using anonymous, ATTENDEE, ORGANIZER and ADMIN request contexts. Separate tests cover resource ownership:
- Organizer can manage their own event but not another Organizer's event.
- Attendee can cancel only their own registration.
- Organizer/Admin check-in permissions follow event ownership.
- Feedback reads are event-scoped.

Add every new protected route to the matrix and include object-ownership checks wherever a route accesses a user/organizer-owned resource. This is current-route regression coverage, not a security certification.

## 4. Session inactivity expiry

Successful login creates a server-side Session row with an idle deadline. Authenticated activity extends the deadline; expired/deleted sessions are rejected. The deadline is capped by the JWT absolute expiry. The default idle timeout is 1800 seconds (30 minutes).

Evidence: merged PR #51, `backend/src/models/Session.js`, `backend/src/middleware/auth.js`, and the auth API regression suite.

## 5. Verification evidence and limits

- [PR #52 security test run](https://github.com/SE-Miniproject-EMS/SE_Miniproject/actions/runs/42396147609): 30 tests passed, 0 failed, plus backend syntax and frontend build.
- [PR #55 RBAC test run](https://github.com/SE-Miniproject-EMS/SE_Miniproject/actions/runs/42491216438): 30 tests passed, 0 failed, plus frontend build.
- [PR #48 integrated prototype run](https://github.com/SE-Miniproject-EMS/SE_Miniproject/actions/runs/42747239410): 55 tests passed, 0 failed, plus backend syntax and frontend build.

These are historical test results from different commits, not a current production security sign-off. Local SQLite/CI do not evidence production TLS, secrets management, uptime, deployment hardening or PCI compliance. See [Security Controls](SECURITY_CONTROLS.md) for the code-linked controls checklist.
