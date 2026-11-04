# Non-Functional Requirements Traceability

**Repository:** SE-Miniproject-EMS/SE_Miniproject  
**Review baseline:** 31 October 2026.  
**Source:** SRS v1.5 targets carried into v1.6. Code review is against checkout `4e2ee73` (31 October 2026). This document adds verification mapping and records ambiguities; it does not claim production guarantees.

## Traceability

| SRS ID/source | Category | Existing requirement and target | Verification and test reference | Current evidence/status | Backlog |
|---|---|---|---|---|---|
| NFR-PERF-01 | Performance | Event search/list APIs target responses within 2 seconds under up to 100 concurrent users. | `TC-PERF-01`: run the documented benchmark at 100 concurrent workers; retain raw latency/status results and environment; report distributions. SRS does not specify a percentile pass rule. | **Partially verified:** one local run in Issue #31 recorded 1,000/1,000 successful requests, p95 178.211 ms, max 259.926 ms, all below 2 seconds. Not production evidence. See `docs/issue-31-performance-and-integrity-report.md` and `docs/issue-31-results/`. | [#31](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/31) |
| NFR-PERF-02 | Performance/integrity | Target at least 500 concurrent registration attempts for one high-demand event without corruption or overbooking. | `TC-PERF-02`: send 500 concurrent attempts from unique attendees against a capacity-controlled event; inspect final registrations and capacity. | **Not verified:** registration route/model and conditional transactional capacity update exist; no 500-attempt load test is recorded. | [#25](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/25) |
| NFR-SEC-01 | Security | Store passwords using a strong salted hash (e.g. bcrypt); never store or log plaintext passwords. | `TC-SEC-01`: inspect persisted users, API responses and logs for salted hashes and absence of plaintext. | **Implemented in baseline:** bcrypt and response protections exist; rerun auth tests/review evidence as needed. | [#7](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/7) |
| NFR-SEC-02 | Security | Use the payment gateway's PCI-compliant flow; EMS must not store raw card numbers. | `TC-SEC-03`: after payment integration, inspect provider flow, persistence and logs for absence of raw card data. | **Planned/not assessable:** payment/provider absent; no PCI claim. | [#26](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/26) |
| NFR-SEC-03 | Security | Enforce RBAC on every API endpoint, not only in the UI. | `TC-SEC-02`: direct API permission matrix for anonymous, Attendee, Organizer and Admin, including ownership boundaries. | **Partially implemented:** middleware protects event routes; full endpoint-by-endpoint audit remains. | [#7](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/7) |
| NFR-SEC-04 | Security | Access JWTs expire after configured `JWT_EXPIRES_IN` (default one day). | `TC-SEC-04`: verify effective configuration and rejection after token expiration. Requirement is fixed token lifetime, not idle/sliding expiry. | **Partially implemented:** configurable JWT lifetime exists; inactivity expiry is not required by SRS and is not implemented. | [#32](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/32) |
| NFR-USAB-01 | Usability | Organizer with no technical background can create/publish an event in under 5 minutes without external assistance. | `TC-USAB-01`: repeatable first-time task; record elapsed time, outcome, assistance, validation errors and blockers. Agree participant/sample assumptions before generalizing. | **Not verified:** workflow exists; timed usability study absent. | [#33](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/33) |
| NFR-REL-01 | Availability/reliability | Target 99% uptime during active event registration windows. | `TC-REL-01`: after decisions below, collect representative deployment health evidence and calculate availability over the approved window. | **Not verified:** no deployed environment, approved measurement definition or uptime evidence. Registration APIs exist, but availability is not evidenced. Do not claim 99% achieved. | [#34](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/34) |
| NFR-MAINT-01 | Maintainability | Modular architecture separates API, business logic and data layers to ease future feature additions. | `TC-MAINT-01`: inspect routes/controllers, business-logic boundaries and persistence coupling against the as-built SAD; record findings. | **Partially satisfied:** frontend/API and routes/controllers/models are separated; consistent service layer absent. See `docs/ARCHITECTURE_NFR_ASSESSMENT.md` (historical 29 October review). | [#35](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/35) |
| NFR-SCAL-01 | Scalability | Architecture allows horizontal backend scaling for registration spikes. | `TC-SCAL-01`: inspect deployment/state assumptions; when deployed, verify multiple API replicas share consistent persisted state. `TC-PERF-02` covers the 500-attempt target. | **Not demonstrated:** local SQLite/single process does not demonstrate horizontal scale. | [#35](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/35), [#25](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/25) |
| SRS §6.2 (no separate NFR ID) | Data integrity/safety | Never exceed event capacity or lose a confirmed, paid registration record. | `TC-INT-01`: exercise the free-event transaction/capacity path under concurrent requests and inspect confirmed-record retention; paid-record integrity remains pending payment support; `TC-PERF-02` covers concurrency overlap. | **Partially implemented / not verified under concurrency:** free-event capacity is transactionally guarded and basic one-seat/waitlist behavior is covered by `backend/test/event-api.test.js`. No concurrency evidence exists; paid-registration retention cannot be verified because payments are absent. No NFR ID is added. | [#25](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/25) |

## Availability decisions requiring team approval

SRS supplies the 99% target and “during active event registration windows” but not the operational measurement contract. The team must approve and document:

1. Measurement period and boundaries for an active registration window and the period over which the target is assessed.
2. Service boundary, uptime definition, health/readiness probe, monitoring source and whether dependency failures count.
3. Downtime criteria, including partial degradation, failed registration operations, outage start/end and monitoring gaps.
4. Whether approved/planned maintenance is included in eligible time or excluded, and how it is identified.
5. Calculation rules. Candidate formula: eligible observed up time / eligible total observation time × 100; approve what qualifies as eligible time and an outage before applying it.
6. Deployment environment, evidence source/retention and review owner needed to reproduce the result.

Until decisions are approved and evidence is collected over the agreed period, `TC-REL-01` is blocked/not verified. Local development cannot support an availability claim.

## Interpretation and coverage gaps

- **NFR-PERF-01:** the SRS says “within 2 seconds” without a percentile rule. The Test Plan's old “at least 95%” criterion is not in the SRS. Report distributions and obtain agreement on pass aggregation; do not silently promote 95th percentile to a requirement.
- **NFR-SEC-02:** payment is future scope. SAD §3.9 separately states production TLS 1.2+ without a distinct SRS NFR ID; `TC-SEC-05` verifies that deployment control only in a deployed HTTPS environment.
- **NFR-SEC-04:** SRS requires configured JWT expiry, not inactivity expiry. Verify the requirement as written.
- **NFR-USAB-01:** sample size/participant method is unspecified; record task observations and agree assumptions before generalizing.
- **NFR-MAINT-01/NFR-SCAL-01:** review/deployment methods have no numeric threshold. The target architecture in the assessment is not current-state evidence.
- Test IDs are verification plans, not proof of execution. Current evidence is in `docs/TESTING_AND_RESULTS.md`, `docs/issue-31-performance-and-integrity-report.md`, and `docs/ARCHITECTURE_NFR_ASSESSMENT.md`.
