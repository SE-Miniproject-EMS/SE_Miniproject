# EMS — Assessor Evidence Index

**Repository:** [SE-Miniproject-EMS/SE_Miniproject](https://github.com/SE-Miniproject-EMS/SE_Miniproject)  
**Evidence pack updated:** 20 November 2026

**Verified source baseline:** main `585fa8f4241ff0191ce1ec33b01d316c86a5f6f2` (merged PR #70).
**Scope:** contributor history, original two-sprint delivery, later Sprint 3 extension/verification work, local and hosted demo, code/tests, coverage, approved mock-only payments and known limitations.

This page is the entry point for reviewing the code and project process. It links each claim to repository files, GitHub issues/PRs or CI results. Historical results are dated; a passing test count must not be mistaken for code-coverage percentage or production readiness.

## 1. Team contributions

Open [Contributor Delivery Log](project-management/CONTRIBUTOR_DELIVERY_LOG.md) for each member's:
- assigned issues and Sprint 2 responsibilities;
- implementation areas (frontend, backend, testing, documentation, CI and release);
- representative PR links and changed file evidence;
- distinction between issue assignee and PR author.



For an individual assignment-by-assignment trail, see [GGO4411 — Individual Work Evidence](project-management/GGO4411_INDIVIDUAL_WORK_EVIDENCE.md). It separates personally authored PRs from shared assignments, peer-review work and work completed by other team members.

## 2. Backlogs, issues and PR/review records

- [Sprint 1 and Sprint 2 backlog + burn-up](project-management/SPRINT_BACKLOG_AND_BURNUP.md) — estimates, assignees, close dates, actual completion curve and source CSV.
- [Burn-up chart (SVG)](project-management/sprint-burnup.svg)
- [Burn-up source data (CSV)](project-management/sprint-burnup-data.csv)
- [GitHub issue/PR log](project-management/GITHUB_ISSUE_PR_LOG.md) — issue statuses, PR author/branch/related issues and review/fix/re-push history.
- [Pull request template](../.github/pull_request_template.md) — captures linked issue, changed files, automated/manual verification, coverage result, reviewer feedback and follow-up commit SHA.
- [Work item issue template](../.github/ISSUE_TEMPLATE/work-item.yml) — captures requirement, acceptance criteria, owner(s), workstream, sprint, points and evidence.

**Sprint and freeze note:** the course plan specifies Sprint 1 (19–23 October 2026), Sprint 2 (26–30 October 2026), then freeze. The current board also records Sprint 3 (2–4 November) and later changes; these are an extension/deviation, not work completed before the original freeze. Obtain instructor acceptance of that deviation. No final release tag/freeze approval is asserted here. The burn-up remains a dated closure-date reconstruction rather than a native daily status export.

The latest 20 November project query found 17 cards, all Done, each linked to merged PRs. This describes board state, not proof of every original requirement. See issue-level evidence and scope limits below. A merged PR is not itself a submitted peer review; PR #70 had no submitted GitHub review at merge, so do not claim universal formal-review compliance.

## 3. Code and working website

- [Implementation baseline](architecture/IMPLEMENTATION_BASELINE.md) — dated 18 November assessment; some delivery statements are superseded by this index and the v1.8 documents.
- [API reference](architecture/API_REFERENCE.md) — routes, payloads and responses.
- [Operations runbook](OPERATIONS_RUNBOOK.md) — local prerequisites, backend/frontend startup, login/verification, demo operations and known limitations.
- [Source tree](../) — inspect `backend/src/`, `backend/test/`, `frontend/src/` and `.github/workflows/`.
- [Architecture and NFR assessment](architecture/ARCHITECTURE_NFR_ASSESSMENT.md) plus [as-built architecture source](diagrams/as-built-architecture.dot).

The [SRS](requirements/Event_Management_System_SRS.docx), [SAD](architecture/Event_Management_System_SAD.docx) and [Software Test Plan](testing/Event_Management_System_Test_Plan.docx) are refreshed to v1.8 on 20 November. Original requirement/test IDs and embedded diagrams are retained. Earlier core diagrams are explicitly labelled as historical subsets; tables and route descriptions give current scope. This documentation refresh requires its own review/merge; it is not included in the cited source baseline. Instructor signatures/approval are not fabricated.

The website is reproducibly runnable locally using the README commands. A public academic demo is hosted at https://ems-demo-web.onrender.com with API https://ems-demo-api.onrender.com; this is not a production SLA or certification. The runbook describes what can be demonstrated and explicitly marks mock-only or incomplete features.

## 4. Testing and coverage

- [Saved 20 November backend code and branch coverage report](testing/coverage/2026-11-20/README.md) — current-main CI snapshot: 94.00% lines/statements and 78.84% branches, with HTML, CSV, JSON and LCOV downloads.

- [Testing and results](testing/TESTING_AND_RESULTS.md) — historical CI runs and current known gaps.
- [Detailed PR #48 backend test report](test-reports/2026-11-10-PR48-backend-test-report.md) — all 55 recorded test names and their grouped areas.
- [PR #61 current-main validation report](test-reports/2026-11-18-PR61-current-main-validation.md) — 73 backend tests, build checks, current coverage totals and worker-file results.
- [Testing and coverage guide](TESTING_AND_COVERAGE.md) — test-file inventory and exact commands for line/branch/function coverage.
- [API integration test report](testing/API_Integration_Test_Report.md)
- [Regression/E2E report](issue-12-regression-report.md)
- [Historical release checklist and browser evidence](issue-14/FINAL_RELEASE_CHECKLIST.md) — earlier test counts and awaiting-review notes are historical, not current release status.
- [Machine-readable E2E result](issue-14/e2e-results.json)
- [Application demonstration](issue-14/application-demo.webm)
- [Technical verification demonstration](issue-14/technical-verification.webm)

The repository contains these two videos, but this audit has not verified their durations or that they satisfy the distinct required 1-minute Sprint 1 and 2-minute Sprint 2 outcome deliverables. Confirm those before submission; file presence alone does not establish compliance.

### Current coverage-enabled validation

[PR #70 CI run #44582798838](https://github.com/SE-Miniproject-EMS/SE_Miniproject/actions/runs/44582798838), recorded 19 November 2026 UTC / 20 November IST, head `5fdf58a`, merged as `585fa8f`:

- Backend coverage job: **83 tests total, 82 passed, 0 failed, 1 PostgreSQL test skipped**.
- Dedicated PostgreSQL job: **1 integration test passed, 0 failed** with PostgreSQL 16. The backend skip is covered by this separate job; do not add the two job counts into a fabricated single-suite total.
- Backend syntax validation and frontend production build: passed.
- Backend statement/line coverage: **94.00%**; branch coverage: **78.84%**; function coverage: **96.73%**.
- Reminder job: 95.83% lines, 81.81% branches, 100% functions; dispatcher job: 92.30% lines, 81.81% branches, 66.66% functions.
- [Coverage artifact](https://github.com/SE-Miniproject-EMS/SE_Miniproject/actions/runs/44582798838/artifacts/14559931094) (`backend-test-coverage-150`) contains coverage output. CI artifacts have finite retention; preserve an approved submission copy before expiry if needed.

These results were read from CI logs; no application tests were rerun for this documentation-only refresh. No broad penetration test or real-payment security certification is claimed.

### Historical coverage baseline

[PR #61 CI run #44370948404](https://github.com/SE-Miniproject-EMS/SE_Miniproject/actions/runs/44370948404), 18 November 2026:
- Backend: **73 tests passed, 0 failed**.
- Backend syntax validation: passed.
- Frontend production build: passed.
- Backend line/statement coverage: **93.56%**.
- Backend branch coverage: **76.62%**.
- Backend function coverage: **94.25%**.
- Reminder job: **95.83% line, 81.81% branch, 100% function**.
- Notification dispatcher job: **92.30% line, 81.81% branch, 66.66% function**.
- [Coverage artifact #116](https://github.com/SE-Miniproject-EMS/SE_Miniproject/actions/runs/44370948404/artifacts/14459028533) includes HTML, LCOV and JSON summary. See the [coverage baseline](test-reports/2026-11-18-coverage-baseline.md) and [PR #61 current-main validation report](test-reports/2026-11-18-PR61-current-main-validation.md).

Historical integrated application result: [PR #48 run #42747239410](https://github.com/SE-Miniproject-EMS/SE_Miniproject/actions/runs/42747239410) reported 55 passed, 0 failed. Counts differ because they are from different commits; do not add them together.

**Current frontend test status:** a separate automated frontend component/unit-test script is not present in `frontend/package.json`; CI runs `npm run build`. Browser evidence is separate and limited to the flows recorded in the E2E JSON/video.

The current Word source documents are already tracked under `docs/`: [SRS](requirements/Event_Management_System_SRS.docx), [SAD](architecture/Event_Management_System_SAD.docx), and [Software Test Plan](testing/Event_Management_System_Test_Plan.docx). The latest uploaded SRS/Test Plan copies were not used to overwrite these tracked documents because their SRS version context is older than the current traceability baseline.

## 5. Performance, security and operational controls

- [Performance, concurrency and data-integrity report](issue-31-performance-and-integrity-report.md) and [raw search benchmark results](issue-31-results/) — includes raw search and registration results; [19 November registration benchmark](issue-31-results/registration-run-2026-11-19.md) passed 500/500 free-event requests.
- [Security controls register](SECURITY_CONTROLS.md) — bcrypt, JWT/session expiry, RBAC, ownership boundaries, mock-card-data behavior and unresolved provider/PCI requirements.
- [Security NFR verification](security-verification.md) and [route-matrix security report](security-nfr-verification.md).
- [Usability study protocol](issue-33-usability-study.md) plus [#33 manual result](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/33): P1 had no technical background or prior EMS experience and reportedly published without help/errors in under 5 minutes. Exact elapsed time and execution timestamp were not supplied. One user-attested session is not a population-wide usability result.
- [Availability assessment](availability-assessment.md) and [deployment/monitoring preparation](render-deployment.md) are historical preparation. Monitoring was stopped at the owner's request. There is no completed 99% uptime result.
- [#25 manual promotion/email result](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/25): the owner reported A cancelled, waitlisted B became CONFIRMED, and B received the promotion email. No screenshot/video, event ID, exact execution timestamp or Resend message ID was supplied for that test. It verifies only the reported scenario, not live delivery of all notification types.

## 6. Open limitations that must be disclosed

| Area | Current state |
|---|---|
| 500 concurrent registrations | 19 November local SQLite run: 500/500 successful, 100 confirmed, 400 waitlisted; no overbooking; no multi-instance or paid-provider claim |
| Payment | Approved academic mock-only demonstration in PR #48 with security regression evidence in PR #70. No money moves, signed gateway callbacks, provider-confirmed refunds or PCI claim. Mock checkout/outcomes remain blocked in production |
| Notifications | Resend configured on the hosted demo; #25 records user-attested promotion inbox receipt. Dispatch must run via CLI/Admin endpoint; no continuous hosted scheduler is claimed. Other live email types unverified; no SMS |
| QR | One-use token/check-in API; no camera/QR scanner UI |
| Feedback | Backend/API exists; complete attendee prompt/display UI is incomplete |
| Dashboards/CSV | Implemented in PR #59 for Organizer/Admin roles with ownership scope, filters and CSV escaping |
| Usability NFR | #33 P1 user-attested under-5-minute, unassisted pass; exact duration unavailable, one participant |
| Availability NFR | Observation stopped; 99% target remains unverified |
| Scalability | PostgreSQL support and dedicated integration CI exist; multi-replica/horizontal scaling not demonstrated |
| Frontend automated unit tests | No separate frontend test runner/script in the current package; production build is checked |
| Dependency/security audit | Existing dependency audit findings are not resolved by passing regression tests; PR #70 is a bounded security review, not a clean audit or penetration-test certificate |

## 7. Review and merge status of this evidence pack

The current-main evidence refresh was merged through [PR #61](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/61) on 18 November 2026. After synchronizing with the latest main and repairing documentation links, the final PR head passed backend tests, syntax validation, coverage collection and the frontend build in [Actions run #44378798728](https://github.com/SE-Miniproject-EMS/SE_Miniproject/actions/runs/44378798728). Merge commit: `e102592b457f92d53d0b348af4b90629363ed26d`. PR #57 and duplicate PR #62 were closed without merge.

Subsequent delivered evidence includes PR #66 (SQLite contention fix and saved 500-registration workload), PR #67 (PostgreSQL/Render support), PR #68 (verification recovery), and merged [PR #70](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/70) (expanded security matrix, payment/refund ownership, sentinel persistence and production mock blocking). This v1.8 documentation refresh follows those changes and is not yet a claim of a merged documentation PR.

## 8. Submission scope — 20 November 2026

Original real-provider/PCI requirements remain deferred. Separately, the project owner approved mock-only academic completion, and PR #70 verifies that simulator boundary. Do not describe the original gateway/PCI targets as passed or the delivered simulator as absent. The original SRS requirements are retained with explicit implementation deviations.

Render demo uses PostgreSQL and public HTTPS endpoints. Initial readiness checks passed, but the approved seven-day observation was stopped at the owner's request. No completed 99% result or multi-replica-scale verification exists. Free service sleep and database limits must be disclosed; local fallback remains useful for the demo.

[PR #68](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/68) merged verification recovery after three CI jobs passed. Verification uses Resend when configured; development console links require backend log access. Provider acceptance is not proof of inbox receipt; #25 supplies the owner's separate promotion-email receipt report.
