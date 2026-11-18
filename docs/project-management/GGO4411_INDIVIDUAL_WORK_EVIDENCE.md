# Individual work and assessment evidence — GGO4411

**GitHub contributor:** [GGO4411](https://github.com/GGO4411)  
**Repository:** [SE-Miniproject-EMS/SE_Miniproject](https://github.com/SE-Miniproject-EMS/SE_Miniproject)  
**Purpose:** Make the work assigned to and evidenced for GGO4411 directly auditable by an assessor.

## 1. Sprint-assigned work

| Sprint / issue | Assigned responsibility | Evidence and what it demonstrates | Attribution |
|---|---|---|---|
| Sprint 1 — [#3 Event Management backend APIs](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/3) | Shared assignment with ChiragBasanth | [PR #15](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/15) contains GGO4411's event API validation/ownership and integration-test changes. The initial full-stack module is in [PR #1](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/1), authored by Chirag. | Shared issue; GGO-authored follow-up/test work is PR #15. Do not attribute all of PR #1 to GGO4411. |
| Sprint 1 — [#4 Event creation](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/4) | Shared assignment with ChiragBasanth | [PR #15](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/15) is the GGO-authored validation/test evidence related to the event workflow; [PR #1](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/1) contains the initial event-management implementation. | Shared issue; implementation ownership is split across PR authors. |
| Sprint 1 — [#5 Event validation](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/5) | Shared assignment with dshivasaivarun-lgtm | [PR #15](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/15) records backend validation/test work by GGO4411; [PR #16](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/16) records Varun's frontend form validation. | Shared issue; backend and frontend evidence are separately attributed. |
| Sprint 1 — [#6 Event ownership](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/6) | Shared assignment with ChiragBasanth | [PR #15](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/15) contains GGO-authored ownership/authorization validation and test work; [PR #1](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/1) contains the original feature implementation. | Shared issue; use the PR author and changed-file history to distinguish work. |
| Sprint 1 — [#8 Event Management API tests](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/8) | Shared assignment with minestevealex-ux | [PR #15](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/15) is GGO4411's API validation/integration test contribution; [PR #17](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/17) is Alex's separate test contribution. | Shared test assignment; each PR retains its author. |
| Sprint 2 — [#9 API integration testing](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/9) | Shared assignment with minestevealex-ux | [PR #15](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/15) contains automated API test/code changes; [PR #21](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/21) is GGO4411's API Integration Test Report. The report links the CI run with 18 passing tests and records the manual smoke-check procedure. | GGO-authored PRs #15 and #21; shared issue with Alex. |

## 2. Later quality, security and architecture responsibilities

| Issue / responsibility | GGO4411's evidenced contribution | Other team evidence / current status |
|---|---|---|
| [#25 Registration and waitlist](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/25) | Issue owner/coordinator and substantive reviewer of the related mock-payment implementation. The review on [PR #48](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/48) identified a missing Session model registration, waitlisted-record cleanup when an event is cancelled, an outdated base branch and required regression tests. | Core implementation PRs #47 and #48 were authored by Varun. Waitlist promotion can use the notification service; the merged PR #58 adds a Resend adapter, but provider credentials and external delivery still require deployment configuration. |
| [#26 Payment processing and refunds](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/26) | Shared owner; reviewed [PR #48](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/48) with a formal **CHANGES_REQUESTED** review on 7 November 2026. The review also explicitly required the project to describe payment as a mock simulator, not a real gateway/PCI implementation. | PR #48 was authored by Varun; follow-up commit [64ff239](https://github.com/SE-Miniproject-EMS/SE_Miniproject/commit/64ff2399a8be1d3f3d5dfcc0fc0e68d13b8f89ec) addressed review feedback before merge. Real provider-backed payment remains unimplemented. |
| [#27 Reminder notifications](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/27) | GGO4411 refactored the scheduled reminder job into an injectable runner and added direct tests for event-window selection, confirmed-recipient scope, dedupe, empty result and error cleanup in PR #61. The refactor preserves the schema migration and provider dispatch behavior from PR #58. | Alex authored the Resend provider/dispatcher feature in PR #58. Real email requires deployment-time Resend credentials and a configured sender; SMS is not configured. |\n| [#31 Performance and concurrency NFR](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/31) | GGO4411 documented the measured event-search result, remaining registration-load gap and traceability in PR #53 and the refreshed evidence pack. | Alex authored the search benchmark (PR #39) and 500-registration harness (PR #54). The 500-attempt registration run has not been executed/recorded; do not claim it passed. |
| [#32 Security NFR](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/32) | Authored [PR #52](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/52): password-plaintext-in-logs assertion, payment/card-data sentinel/fail-closed checks, and JWT expiry regression test. Also documented the controls and limitations in PR #57. | Alex authored the separate route-family RBAC matrix in PR #55; Chirag is an issue assignee. Real payment-provider/PCI verification remains out of scope/unverified. |
| [#35 Maintainability/scalability architecture NFR](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/35) | Authored [PR #53](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/53), refreshing the current as-built architecture, implementation baseline and NFR assessment. | Alex authored the earlier architecture assessment in PR #44. Horizontal scaling is not demonstrated by the local SQLite/single-process deployment. |

## 3. Directly authored pull requests

These are the clearest GitHub records to open when checking GGO4411's personal work:

| PR | Work personally submitted | Main evidence |
|---|---|---|
| [#15](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/15) | Sprint 1 event API validation/ownership and API integration test changes | Code diff, PR commits, linked issues #3–#6/#8/#9 and CI checks |
| [#21](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/21) | Sprint 2 API integration testing report | Documentation diff and Actions run showing 18 tests passed |
| [#52](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/52) | Security regression tests | Test code, CI run with 30 passing backend tests and frontend build |
| [#53](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/53) | Current architecture and NFR assessment refresh | Documentation diff, baseline and limitation analysis |
| [#57](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/57) | Original assessor evidence pack and reminder-job refactor/tests | Historical PR diff and CI run; superseded because the branch diverged from newer main commits |
| [#61](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/61) | Refreshed current-main assessor evidence pack; backend coverage CI; graceful server shutdown; reminder-job and notification-dispatch worker refactors; direct tests for both jobs | Current-main PR diff and GGO4411 commits; [73-test CI run](https://github.com/SE-Miniproject-EMS/SE_Miniproject/actions/runs/44370034661); [coverage artifact #114](https://github.com/SE-Miniproject-EMS/SE_Miniproject/actions/runs/44370034661/artifacts/14457259318) |

## 4. Review and re-push evidence

[PR #48 review record](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/48#pullrequestreview-5813995140) is a concrete example of GGO4411 performing code review rather than only submitting code:

1. GGO4411 submitted a **CHANGES_REQUESTED** review on 7 November 2026.
2. The review identified three required code/process fixes: register the Session model before database sync; cancel WAITLISTED registrations when an event is cancelled and test the behavior; and rebase/retarget the PR onto current main. It also required the payment limitation to be accurately described as mock-only.
3. The PR author pushed follow-up commit [64ff239](https://github.com/SE-Miniproject-EMS/SE_Miniproject/commit/64ff2399a8be1d3f3d5dfcc0fc0e68d13b8f89ec).
4. PR #48 then passed CI with 55 backend tests and merged on 10 November 2026.

This is evidence of GGO4411's review and acceptance work; the follow-up implementation commit belongs to the PR author, not GGO4411.

## 5. Testing and coverage evidence GGO4411 helped establish

- [PR #21 API integration report](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/21) — Sprint 2 integration-testing deliverable.
- [PR #52 security tests](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/52) — security regression test code.
- [PR #61 Actions run](https://github.com/SE-Miniproject-EMS/SE_Miniproject/actions/runs/44370034661) — **73 backend tests passed, 0 failed**; backend syntax validation and frontend production build passed.
- [Coverage artifact #114](https://github.com/SE-Miniproject-EMS/SE_Miniproject/actions/runs/44370034661/artifacts/14457259318) — backend **93.56% line/statement, 76.62% branch and 94.25% function** coverage.
- Reminder-job direct tests in PR #61 cover the 23–25 hour selection window, confirmed attendees, dedupe outcome, empty events, startup failure, notification-schema setup and dependency wiring.
- Notification-dispatch worker tests in PR #61 cover schema setup, batch size, failed-delivery exit status, startup error logging and database cleanup.

Coverage in PR #61 is repository-wide backend coverage, not a percentage attributable to one person. The frontend has no separate component/unit-test coverage report in the current project.

## 6. What must not be overstated

- Shared issue assignment does not mean GGO4411 authored every related PR or every line. Use PR author, changed files, commits and review records to establish authorship.
- PR #48 implementation was authored by Varun; GGO4411's individual evidence there is the formal review and requested changes.
- The 500-registration harness was authored by Alex; the actual 500-attempt benchmark result is missing.
- PR #57 is closed as superseded and was not merged. The refreshed individual matrix and assessor pack are on PR #61, which is open, mergeable and awaiting Alex's independent review.
- Do not claim real payment-provider/PCI certification, email/SMS delivery, production uptime, or horizontal-scaling verification.

## 7. Assessor navigation

Start with [the Assessor Evidence Index](../PROJECT_EVIDENCE_INDEX.md), then use this page for GGO4411's individual assignment trail. For the source records, open the linked GitHub issue/PR and inspect the actual commits, changed files, reviews and CI checks.
