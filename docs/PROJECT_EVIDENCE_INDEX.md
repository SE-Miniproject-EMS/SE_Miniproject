# EMS — Assessor Evidence Index

**Repository:** [SE-Miniproject-EMS/SE_Miniproject](https://github.com/SE-Miniproject-EMS/SE_Miniproject)  
**Evidence pack date:** 18 November 2026  
**Scope:** contributor delivery, issue/PR review history, two sprint backlogs, working local website, code/tests, coverage artifacts, security and known limitations.

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

**Two-sprint note:** the course plan specifies Sprint 1 (19–23 October 2026), Sprint 2 (26–30 October 2026), then freeze. The burn-up is a transparent GitHub closure-date reconstruction because no daily native Jira/GitHub Projects history export was committed. It does not fabricate daily “in progress” data.

## 3. Code and working website

- [Implementation baseline](architecture/IMPLEMENTATION_BASELINE.md) — what the current code does and what remains partial/mock/not verified.
- [API reference](architecture/API_REFERENCE.md) — routes, payloads and responses.
- [Operations runbook](OPERATIONS_RUNBOOK.md) — local prerequisites, backend/frontend startup, login/verification, demo operations and known limitations.
- [Source tree](../) — inspect `backend/src/`, `backend/test/`, `frontend/src/` and `.github/workflows/`.
- [Architecture and NFR assessment](architecture/ARCHITECTURE_NFR_ASSESSMENT.md) plus [as-built architecture source](diagrams/as-built-architecture.dot).

The repository includes the [SRS](requirements/Event_Management_System_SRS.docx), [SAD](architecture/Event_Management_System_SAD.docx) and [Software Test Plan](testing/Event_Management_System_Test_Plan.docx) Word documents. These files were already tracked in main; the uploaded SRS/Test Plan copies were not used to overwrite the repository versions.

The website is reproducibly runnable locally using the README commands. A public academic demo is hosted at https://ems-demo-web.onrender.com with API https://ems-demo-api.onrender.com; this is not a production SLA or certification. The runbook describes what can be demonstrated and explicitly marks mock-only or incomplete features.

## 4. Testing and coverage

- [Testing and results](testing/TESTING_AND_RESULTS.md) — historical CI runs and current known gaps.
- [Detailed PR #48 backend test report](test-reports/2026-11-10-PR48-backend-test-report.md) — all 55 recorded test names and their grouped areas.
- [PR #61 current-main validation report](test-reports/2026-11-18-PR61-current-main-validation.md) — 73 backend tests, build checks, current coverage totals and worker-file results.
- [Testing and coverage guide](TESTING_AND_COVERAGE.md) — test-file inventory and exact commands for line/branch/function coverage.
- [API integration test report](testing/API_Integration_Test_Report.md)
- [Regression/E2E report](issue-12-regression-report.md)
- [Release checklist and browser evidence](issue-14/FINAL_RELEASE_CHECKLIST.md)
- [Machine-readable E2E result](issue-14/e2e-results.json)
- [Application demonstration](issue-14/application-demo.webm)
- [Technical verification demonstration](issue-14/technical-verification.webm)

### Latest coverage-enabled validation

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
- [Security NFR verification](issue-32-security-verification.md) and [route-matrix security report](issue-32-security-nfr-verification.md).
- [Usability study protocol](issue-33-usability-study.md) — the participant study is not yet run.
- [Availability assessment](issue-34-availability-assessment.md) — historical local assessment; [Render deployment and monitoring](issue-34-render-deployment.md) now documented, but no completed 99% uptime result.

## 6. Open limitations that must be disclosed

| Area | Current state |
|---|---|
| 500 concurrent registrations | 19 November local SQLite run: 500/500 successful, 100 confirmed, 400 waitlisted; no overbooking; no multi-instance or paid-provider claim |
| Payment | Mock simulator only; no real gateway/signed callbacks/provider-confirmed refunds; no PCI claim |
| Notifications | Resend adapter and dispatcher are present in PR #58; production email requires Resend API key/sender configuration; no SMS adapter |
| QR | One-use token/check-in API; no camera/QR scanner UI |
| Feedback | Backend/API exists; complete attendee prompt/display UI is incomplete |
| Dashboards/CSV | Implemented in PR #59 for Organizer/Admin roles with ownership scope, filters and CSV escaping |
| Usability NFR | Procedure documented; no participant timing result |
| Availability NFR | Approved seven-day readiness observation 19–26 November; incomplete at submission; #34 deferred |
| Scalability | Local SQLite/single-process implementation does not demonstrate horizontal scaling |
| Frontend automated unit tests | No separate frontend test runner/script in the current package; production build is checked |

## 7. Review and merge status of this evidence pack

The current-main evidence refresh was merged through [PR #61](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/61) on 18 November 2026. After synchronizing with the latest main and repairing documentation links, the final PR head passed backend tests, syntax validation, coverage collection and the frontend build in [Actions run #44378798728](https://github.com/SE-Miniproject-EMS/SE_Miniproject/actions/runs/44378798728). Merge commit: `e102592b457f92d53d0b348af4b90629363ed26d`. PR #57 and duplicate PR #62 were closed without merge.

## 8. Submission scope — 19 November 2026

Submission scope: issues #26 and #32 are closed as not planned for the academic release; provider integration and PCI verification remain deferred, not passed. Mock payments are local-only; production mock checkout is disabled.

Render demo provisioned; initial readiness check passed. The approved 19–26 November seven-day API/database readiness observation is incomplete at submission; the 99% target is not verified. Issue #34 is deferred, not completed.

[PR #68](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/68) merged email verification recovery after all three CI jobs passed. Hosted console verification still requires access to Render logs; real delivery requires provider configuration.
