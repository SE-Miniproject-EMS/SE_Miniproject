# Team contributions and ownership evidence

**Repository baseline:** `main` at `27c92de869ae3aa151f4d886217159c2edb2f9f7` (18 November 2026)  
**Evidence method:** assigned owners are taken from GitHub issue assignees and the Sprint 2 Team Work Plan; implementation areas are taken from merged PR authors and changed-file lists. A PR author is the person who opened/pushed that PR, not proof that they alone wrote every line.

## Contributor summary

| Member | Main areas evidenced by assigned issues / authored PRs | Representative PRs |
|---|---|---|
| **ChiragBasanth** | Initial full-stack Event Management module (backend routes/controllers/models and React event pages); GitHub Actions CI; final release checklist; database-backed session inactivity expiry and its regression test. | [#1](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/1), [#2](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/2), [#41](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/41), [#51](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/51) |
| **dshivasaivarun-lgtm** | Frontend event-form validation and UI/branding fixes; Sprint 1 demo-readiness changes; regression report and E2E demo evidence; full-stack registration/waitlist and mock-payment screens/APIs; organizer/admin reporting dashboard and CSV export; usability/availability assessment documentation. | [#16](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/16), [#19](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/19), [#24](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/24), [#45](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/45), [#47](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/47), [#48](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/48), [#56](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/56), [#59](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/59), [#60](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/60) |
| **minestevealex-ux** | Event API and authentication/RBAC tests; notification, ticket-token/check-in and feedback APIs; Resend email notification delivery adapter and dispatch/retry path; functional requirements and architecture documentation; search benchmark and 500-attempt harness; security route matrix. | [#17](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/17), [#18](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/18), [#39](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/39), [#40](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/40), [#42](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/42), [#43](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/43), [#44](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/44), [#54](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/54), [#55](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/55), [#58](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/58) |
| **GGO4411** | Event API validation/integration test work; Sprint 2 API integration evidence; security regression tests; architecture/NFR assessment documentation; product backlog and NFR issue creation/coordination; assessor evidence index, sprint/contributor/PR ledger, operations/security runbooks, backend coverage-reporting CI setup, and a testable reminder-job refactor with direct unit tests (original PR #57; refreshed for current main in PR #61). | [#15](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/15), [#21](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/21), [#52](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/52), [#53](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/53), [#57](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/57) |



### Individual assignment-level audit

The detailed [GGO4411 Individual Work Evidence](GGO4411_INDIVIDUAL_WORK_EVIDENCE.md) maps each Sprint 1/Sprint 2 assignment and later NFR responsibility to the relevant issue, authored PR, review record, CI run and remaining limitation. It deliberately distinguishes GGO4411's own PRs (#15, #21, #52, #53, #57) from shared/team implementation and the formal review on PR #48.

## Current-main follow-up deliveries

- Alex authored and merged [PR #58](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/58) for the Resend email adapter, dispatcher, outbox claims/idempotency/retries and provider tests.
- Varun authored and merged [PR #59](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/59) for organizer/admin report aggregates, dashboard UI and filtered registration/attendance CSV export.
- Varun authored and merged [PR #60](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/60) for README and team-contribution/SRS/SAD/Test Plan documentation updates.
- The original GGO4411 evidence branch (PR #57) became stale after those merges. The refreshed current-main evidence and reminder-job tests are submitted separately in PR #61 and are not yet merged.

## Workstream view

| Workstream | Evidence from repository | Contributors evidenced |
|---|---|---|
| Frontend React/Vite | Event pages/navigation and initial layout in PR #1; event form validation in #16; event discovery/demo-readiness in #19; branding/responsive fixes in #36/#37; attendee registration and mock payment UI in #47/#48. | ChiragBasanth, dshivasaivarun-lgtm |
| Backend APIs | Event controllers/routes/models in #1; validation and integration checks in #15; notification/check-in/feedback APIs in #42; registration/capacity/waitlist in #47; mock payment/refund services in #48; session expiry in #51. | ChiragBasanth, GGO4411, dshivasaivarun-lgtm, minestevealex-ux |
| Testing / QA | Event API tests #15/#17; auth/RBAC tests #18; regression report/tests #24; security tests #52/#55; payment/migration tests in #48; demo/E2E results in #45. | GGO4411, minestevealex-ux, dshivasaivarun-lgtm, ChiragBasanth |
| CI / build automation | GitHub Actions workflow added in PR #2; validation/test/build jobs run on push and pull request to main. | ChiragBasanth |
| Documentation / diagrams | API integration report #21; SRS/SAD/API/testing docs #40; architecture NFR #44/#53; FR traceability #43; usability/availability docs #56. | GGO4411, minestevealex-ux, dshivasaivarun-lgtm |
| Demo / release | Sprint 1 readiness #19; release checklist #41; E2E results and demonstration videos #45. | dshivasaivarun-lgtm, ChiragBasanth |

## Sprint issue ownership

The official Sprint 2 Team Work Plan assigns:
- Issue #9 API integration testing — GGO4411 and minestevealex-ux.
- Issue #11 GitHub Actions CI — ChiragBasanth.
- Issue #12 regression/E2E testing — dshivasaivarun-lgtm.
- Issue #13 documentation — minestevealex-ux.
- Issue #14 final demo/release — dshivasaivarun-lgtm and ChiragBasanth.

The Sprint 1 issue assignees are recorded in [the issue ledger](GITHUB_ISSUE_PR_LOG.md). Use the “Assigned to” and “PR author” fields separately: multiple people were assigned to shared issues, while GitHub records one PR author for each pull request.

## Important interpretation

- This matrix is evidence of issue assignment and PR authorship, not a line-by-line attribution report. GitHub commits, diffs, PR review comments and merged commit history remain the authoritative record of code changes.
- “Testing” includes backend HTTP integration/regression tests and manual browser checks. The frontend package currently has a production build command but no separate automated React component/unit-test script.
- The 500-registration benchmark harness was authored in PR #54; the actual 500-attempt benchmark has not yet produced a committed registration result file. Do not describe the harness as a passing load test.
- The E2E evidence in PR #45 is for the recorded event lifecycle/auth/mobile checks. It is not evidence that every later registration/payment/notification UI path has browser automation.
