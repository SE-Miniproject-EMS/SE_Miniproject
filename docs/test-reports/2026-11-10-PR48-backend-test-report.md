# Backend Test Execution Report — Integrated Mock-Payment Baseline

- **Date:** 10 November 2026
- **PR:** [#48 — mock payment and refund workflows](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/48)
- **GitHub Actions run:** [#42747239410](https://github.com/SE-Miniproject-EMS/SE_Miniproject/actions/runs/42747239410)
- **Backend job:** [Backend Validation](https://github.com/SE-Miniproject-EMS/SE_Miniproject/actions/runs/42747239410)
- **Result:** **55 tests passed, 0 failed**
- **Other checks:** Backend JavaScript syntax validation passed; frontend production build passed.
- **Scope:** historical test result for the PR #48 head commit `64ff2399a8be1d3f3d5dfcc0fc0e68d13b8f89ec`. This is not a test execution on the 18 November assessor-evidence branch.

## Results by area

| Area | Test count | Result |
|---|---:|---|
| Authentication, password storage, sessions and access | 11 | Passed |
| Event lifecycle, validation, discovery and ownership | 11 | Passed |
| Registration, capacity, waitlist, ticket and RBAC | 9 | Passed |
| Paid mock checkout, retry, refund, FIFO offer and cancellation | 19 | Passed |
| Payment rule conversion and migration | 5 | Passed |
| **Total** | **55** | **55 passed / 0 failed** |

Counts are grouped by the test cases below for assessor navigation. The migration case is displayed without its historical work-item prefix; consult the linked CI log for the exact runner label. Execution counts and results are unchanged. The repository uses Node's built-in `node:test` runner; the event/auth scenarios use HTTP requests against a local Express child process and temporary SQLite database.

## Authentication, password storage, sessions and access

1. `registration creates an account and does not expose its password hash`
2. `registration rejects duplicate email addresses`
3. `registration stores a bcrypt password hash rather than plaintext`
4. `valid login returns an access token and a public user record`
5. `login rejects an unverified account until its verification link is used`
6. `invalid credentials are rejected without revealing whether the email exists`
7. `protected account routes reject missing, malformed, and invalid tokens`
8. `a valid token can access the current-user route`
9. `server-side role checks deny attendees and organizers access to restricted routes`
10. `self-registration cannot grant the ADMIN role`
11. `authenticated activity extends a session and expired or removed sessions stay invalid`

## Event lifecycle, validation, discovery and ownership

12. `event API requires authentication and organizer/admin authorization`
13. `organizer can create, view, edit, publish, and cancel an event`
14. `event creation returns 400 for missing required data or invalid values`
15. `organizers can modify their own events but not another organizer's event`
16. `public event listing supports category, location, search, and date filters`
17. `public event listing paginates future published events and validates page bounds`
18. `event updates reject invalid values without changing the stored event`
19. `cancelled events cannot be edited or published again`
20. `cancelling an event cancels its waitlisted registrations`
21. `event endpoints return 404 for unknown event IDs`
22. `creating an event as PUBLISHED rejects invalid publishing data`

## Registration, capacity, waitlist, ticket and RBAC

23. `registrations enforce capacity, issue one-use tickets, and gate feedback to checked-in attendees`
24. `cancelling a confirmed registration promotes a waitlisted attendee`
25. `cancelling a registration for a cancelled event does not promote its cancelled waitlist`
26. `simultaneous registrations for the last seat never overbook the event`
27. `attendees can only cancel their own registration`
28. `cancellation is rejected after the event's configured cutoff`
29. `registration rejects unauthenticated, malformed, organizer, and unavailable-event requests`
30. `security NFR route matrix: every mounted protected endpoint enforces role authorization`

## Paid mock checkout, refund and concurrency rules

31. `paid checkout ignores and never reflects or logs submitted card-data sentinels`
32. `paid checkout reserves one seat and stores the exact paise amount and checkout purpose`
33. `mock payment success confirms a paid registration without incrementing its reserved seat`
34. `failed paid checkout releases once and retries create a distinct payment attempt`
35. `retry is rejected while the event is full without creating a payment attempt`
36. `late mock payment after expiry stays unconfirmed and creates a pending refund`
37. `cancelling a confirmed paid registration creates a full refund and reserves the next FIFO offer`
38. `organizer cancellation refunds paid confirmations, releases all seats once, and never promotes waitlist`
39. `concurrent organizer cancellation requests create one refund and release capacity once`
40. `expired and failed paid FIFO offers move attendees to the tail exactly once`
41. `pending mock payment remains pending and duplicate success confirms only once`
42. `mock refund failure and simulated success reuse one full-refund record and key`
43. `paid attendee cancellation uses the 24-hour default when refundWindowHours is null`
44. `event creation rejects fractional-paise ticket prices and negative refund windows`
45. `concurrent paid last-seat checkouts reserve exactly one pending seat`
46. `late-success refund blocks another FIFO offer until the mock refund resolves`
47. `concurrent last-seat paid checkout requests reserve once`
48. `concurrent expiry and late mock success create one refund and no confirmed registration`
49. `unrelated attendee cannot simulate another user's payment outcome`
50. `organizer cancellation expires pending checkout and releases its seat without refund`

## Payment rule and migration tests

51. `Registration migration preserves registrations and idempotently backfills FIFO position`
52. `ticket prices convert to exact integer paise`
53. `ticket prices with fractional paise are rejected`
54. `24-hour default refund cutoff allows before and exactly at cutoff only`
55. `zero-hour refund window allows through event start`

## Interpretation and limits

- The tests cover application code paths in this commit. They do not prove the live payment-provider or PCI requirements; the adapter is mock-only.
- The six-way free registration last-seat test is functional concurrency regression. It is not the separate SRS target of 500 simultaneous registration attempts.
- The frontend job verifies a production Vite build. It is not a frontend component/unit-test suite.
- This report records test execution count, not line or branch coverage. The assessor-evidence branch adds a c8 coverage command and CI artifact. Coverage percentages must be read from the artifact after that new workflow has passed.
- Local test databases are temporary SQLite files. No production deployment, 99% uptime or multi-instance scale guarantee is implied.
