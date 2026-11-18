# GitHub issue and pull-request activity log

**Snapshot:** `main` at `7f9792c37df7d646e327eb2e2cdfffaf3f1d7682` (11 November 2026)  
**Purpose:** Provide a repository-local index of the 56 GitHub issue/PR objects visible in the project at the snapshot. Each row links to the original issue or PR so an assessor can inspect the original description, assignees, branch, commits, review thread, changed files, CI and merge record.

## Backlog issue register

| Issue | Work item | Assigned owner(s) | State at snapshot | Related delivery / evidence |
|---|---|---|---|---|
| [#3](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/3) | Event Management backend APIs | GGO4411, ChiragBasanth | Closed | PR #1; expanded validation/tests in #15 and #17 |
| [#4](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/4) | Event creation | GGO4411, ChiragBasanth | Closed | PR #1 and #15 |
| [#5](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/5) | Event validation | dshivasaivarun-lgtm, GGO4411 | Closed | PR #15 backend validation; PR #16 frontend form validation |
| [#6](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/6) | Event ownership | GGO4411, ChiragBasanth | Closed | PR #1 and #15 |
| [#7](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/7) | Authentication and role-based access | dshivasaivarun-lgtm, minestevealex-ux | Closed | PR #18 auth/RBAC integration tests; PR #19 demo readiness; later session expiry in #51 |
| [#8](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/8) | Event Management API tests | GGO4411, minestevealex-ux | Closed | PR #15 and #17 |
| [#9](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/9) | API integration testing | GGO4411, minestevealex-ux | Closed | PR #15 code/tests; PR #21 test report; issue records 18 passing tests and manual smoke-check |
| [#10](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/10) | Frontend form validation | dshivasaivarun-lgtm | Closed | PR #16 |
| [#11](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/11) | GitHub Actions CI | ChiragBasanth | Closed | PR #2; later CI verification recorded on Sprint 2 issues |
| [#12](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/12) | Regression and E2E testing | dshivasaivarun-lgtm | Closed | PR #24 regression tests/report; PR #45 videos/release evidence |
| [#13](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/13) | Project documentation | minestevealex-ux | Closed | PR #40 |
| [#14](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/14) | Final demo and release | dshivasaivarun-lgtm, ChiragBasanth | Closed | PR #41 checklist; PR #45 videos and E2E results |
| [#22](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/22) | Functional requirements traceability | minestevealex-ux | Closed | PR #43 |
| [#23](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/23) | NFR traceability/documentation | dshivasaivarun-lgtm (issue assignee) | Open | PR #46 remains open; branch has updated NFR/FR/testing docs but is behind main and still needs sync/review |
| [#25](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/25) | Registration, capacity, waitlist and cancellation | GGO4411 | Open | PR #47 free-event flow; PR #48 mock paid flow. Real user-facing waitlist notification delivery remains unconfigured |
| [#26](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/26) | Payment processing and refunds | GGO4411, minestevealex-ux | Open | PR #48 provides mock checkout/refund only; real gateway, signed callbacks and provider-confirmed refunds remain unimplemented |
| [#27](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/27) | Registration/event notifications | minestevealex-ux | Open | PR #42 provides notification queue/service and reminder job; external email/SMS provider delivery is not configured |
| [#28](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/28) | QR tickets and check-in | dshivasaivarun-lgtm, minestevealex-ux | Closed | PR #42 provides one-use token/check-in API; QR image and camera/scanner UI are still limitations |
| [#29](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/29) | Organizer/admin dashboards and CSV reports | ChiragBasanth | Open | No dashboard or CSV reporting PR is present in the current main snapshot |
| [#30](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/30) | Feedback and ratings | minestevealex-ux | Closed | PR #42 provides feedback model/API and eligibility rules; complete attendee feedback prompt UI remains incomplete |
| [#31](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/31) | Performance, concurrency and data integrity NFRs | GGO4411, minestevealex-ux | Open | PR #39 search benchmark; PR #54 adds a 500-attempt registration harness, but the registration load has not been run/recorded |
| [#32](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/32) | Security NFRs | minestevealex-ux, ChiragBasanth (issue assignees; GGO4411 owner) | Open | PR #52 password/card-data regression checks; PR #55 route-matrix RBAC test. Provider-backed PCI flow remains blocked |
| [#33](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/33) | Event-creation usability NFR | dshivasaivarun-lgtm | Open | PR #56 documents a repeatable study; no participant timing result is recorded |
| [#34](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/34) | 99% availability/reliability NFR | dshivasaivarun-lgtm (assignee; issue body owner ChiragBasanth) | Open | PR #56 documents local-only limits; no deployed uptime measurement exists |
| [#35](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/35) | Maintainability/scalability architecture NFR | dshivasaivarun-lgtm (issue assignee; co-owners in body GGO4411/Alex) | Closed | PR #44 architecture assessment; PR #53 refreshed current as-built architecture and limitations |
| [#49](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/49) | Configurable session inactivity expiry | ChiragBasanth | Closed | PR #51 implements persisted idle sessions (default 30 minutes), bounded by JWT expiry |

## Pull-request ledger

“Merged” means GitHub reports the PR as merged. PR #50 was closed without merge because it was superseded by #52. PR #46 remains open.

| PR | Author | Branch | Related issue(s) | Changed area / delivery | State |
|---|---|---|---|---|---|
| [#1](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/1) | ChiragBasanth | `feature/event-management` | #3, #4, #6 | Backend event API/model/controller and React event-management pages | Merged |
| [#2](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/2) | ChiragBasanth | `feature/github-actions-ci` | #11 | GitHub Actions backend syntax/test and frontend build workflow | Merged |
| [#15](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/15) | GGO4411 | `feat/sprint1-event-api-tests` | #3–#6, #8, #9 | Event validation/ownership and API integration test changes | Merged |
| [#16](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/16) | dshivasaivarun-lgtm | `codex/sprint1-frontend-validation` | #5, #10 | React event form validation | Merged |
| [#17](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/17) | minestevealex-ux | `test/event-management-api-coverage` | #8 | Event API integration tests and CI/README adjustments | Merged |
| [#18](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/18) | minestevealex-ux | `test/authentication-rbac-coverage` | #7 | Authentication and role-based access tests | Merged |
| [#19](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/19) | dshivasaivarun-lgtm | `codex/sprint1-demo-readiness` | Sprint 1 readiness | Auth/event discovery fixes, tests, and Sprint 1 demo/deviation record | Merged |
| [#20](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/20) | dshivasaivarun-lgtm | `codex/readme-project-progress` | Project status docs | README progress update | Merged |
| [#21](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/21) | GGO4411 | `docs/api-integration-test-evidence` | #9 | Sprint 2 API Integration Test Report | Merged |
| [#24](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/24) | dshivasaivarun-lgtm | `codex/issue-12-regression` | #12 | Regression tests and report | Merged |
| [#36](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/36) | dshivasaivarun-lgtm | `codex/home-hero-ems-branding` | UI polish | Shared React pages and styling/branding | Merged |
| [#37](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/37) | dshivasaivarun-lgtm | `codex/ui-redesign-current-main` | UI polish | Mobile home hero overflow fix | Merged |
| [#38](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/38) | dshivasaivarun-lgtm | `codex/readme-run-guide` | Setup documentation | README local setup/run guide | Merged |
| [#39](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/39) | minestevealex-ux | `perf/issue-31-search-benchmark` | #31 | Event-search benchmark script and raw JSON/CSV | Merged |
| [#40](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/40) | minestevealex-ux | `docs/issue-13-project-documentation` | #13 | README, API reference, SRS/SAD/Test Plan and diagrams | Merged |
| [#41](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/41) | ChiragBasanth | `feature/issue-14-final-demo-release` | #14 | Final release checklist | Merged |
| [#42](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/42) | minestevealex-ux | `feat/issues-27-28-30` | #27, #28, #30 | Notification service/job, ticket-token check-in and feedback APIs/tests | Merged |
| [#43](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/43) | minestevealex-ux | `docs/issue-22-fr-traceability` | #22 | Functional requirements traceability matrix | Merged |
| [#44](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/44) | minestevealex-ux | `docs/issue-35-architecture-nfrs` | #35 | Maintainability/scalability assessment and architecture diagrams | Merged |
| [#45](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/45) | dshivasaivarun-lgtm | `codex/issue14-demo-videos` | #12, #14 | E2E results, release checklist updates, application and technical demo videos | Merged |
| [#46](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/46) | dshivasaivarun-lgtm | `codex/issue-23-nfr-traceability` | #23, #31, #32, #35 | NFR matrix and edits to SRS/SAD/Test Plan; latest branch updates still need sync/review | Open |
| [#47](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/47) | dshivasaivarun-lgtm | `codex/issue-25-registration` | #25 | Registration, free-event capacity, FIFO waitlist, attendee cancellation, one-use ticket tokens and UI | Merged |
| [#48](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/48) | dshivasaivarun-lgtm | `codex/issue-26-payments` | #26 | Mock checkout/refund, paid waitlist reservations, migrations, payment APIs and attendee UI | Merged |
| [#50](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/50) | ChiragBasanth | `issue-32-security-verification` | #32 | Earlier security verification draft; superseded by PR #52 | Closed — not merged |
| [#51](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/51) | ChiragBasanth | `issue-49-session-inactivity` | #49 | Persisted session model and configurable inactivity expiry | Merged |
| [#52](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/52) | GGO4411 | `security/issue-32-verification-current-main` | #32 | Password log assertion, fail-closed/card-data security tests and JWT expiry test | Merged |
| [#53](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/53) | GGO4411 | `docs/issue-35-current-architecture-baseline` | #35, #31 | Current as-built architecture, baseline and NFR evidence refresh | Merged |
| [#54](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/54) | minestevealex-ux | `test/issue-31-registration-concurrency-nfr` | #31 | 500-registration benchmark harness and benchmark artifacts | Merged; harness is not yet an executed 500-attempt result |
| [#55](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/55) | minestevealex-ux | `test/issue-32-security-rbac-nfr` | #32 | Route-family RBAC matrix integration test and security report | Merged |
| [#56](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/56) | dshivasaivarun-lgtm | `codex/issues-33-34-verification` | #33, #34 | Usability study procedure and availability measurement assessment | Merged; neither target is measured/passed |
| [#57](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/57) | GGO4411 | `docs/assessor-evidence-pack` | Assessor/repository evidence | Contributor/issue/PR ledger, sprint backlog/burn-up, operations/security runbooks, test reports and CI coverage artifact | Open; run #44241427529 passed 56 tests and build; 92.79% line / 77.81% branch / 95.71% function coverage; Alex review requested |

## Review → fix → re-push record

This section records review/resubmission events that are explicitly visible in the PR history. For older PRs without a review thread or follow-up commit recorded in the repository, use the linked GitHub timeline rather than inferring a review round.

### PR #48 — review changes addressed before merge

1. On 7 November 2026, GGO4411 submitted a **CHANGES_REQUESTED** review.
2. Requested fixes: register the Session model before database sync; cancel WAITLISTED records when an event is cancelled; rebase against current main; add regression tests.
3. The PR author pushed follow-up commit [`64ff239`](https://github.com/SE-Miniproject-EMS/SE_Miniproject/commit/64ff2399a8be1d3f3d5dfcc0fc0e68d13b8f89ec) titled “fix: address PR 48 review feedback”.
4. The PR branch then passed Actions run [#42747239410](https://github.com/SE-Miniproject-EMS/SE_Miniproject/actions/runs/42747239410): **55 backend tests passed, 0 failed**, backend syntax validation passed and frontend production build passed.
5. PR #48 merged on 10 November 2026.

### PR #50 → PR #52 — security verification rebuilt

PR #50 was closed without merge because it was superseded by PR #52, which rebuilt the security tests/report against updated main. PR #52 merged after its CI run passed 30 backend tests and the frontend build.

### PR #46 — NFR documentation review remains open

GGO4411 requested changes on 4 November because the NFR-SEC-04 row contradicted the submitted configurable-inactivity-expiry requirement. The PR branch has since received traceability/report updates, but it was still behind main at the last comparison and remains open. It must be synced/reviewed; do not present it as merged.

## Required log format for every future issue/PR

When work is pushed, add/update the issue or PR description with:
1. Issue ID, sprint/iteration, assignees, scope and estimate.
2. Branch name, PR link, PR author and changed files.
3. Reviewer(s), review state, each requested change and the follow-up commit SHA that addresses it.
4. CI run link and pass/fail for backend tests, syntax checks, frontend build and coverage artifact.
5. Manual/browser test evidence (steps, environment, result and screenshots/video link).
6. Final merge commit SHA and issue closure date.

Push another commit to the same PR branch after review feedback; do not create a duplicate PR for the same change. Close the linked issue only when acceptance criteria and evidence are recorded.
