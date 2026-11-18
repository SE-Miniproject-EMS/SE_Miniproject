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

- [Implementation baseline](IMPLEMENTATION_BASELINE.md) — what the current code does and what remains partial/mock/not verified.
- [API reference](API_REFERENCE.md) — routes, payloads and responses.
- [Operations runbook](OPERATIONS_RUNBOOK.md) — local prerequisites, backend/frontend startup, login/verification, demo operations and known limitations.
- [Source tree](../) — inspect `backend/src/`, `backend/test/`, `frontend/src/` and `.github/workflows/`.
- [Architecture and NFR assessment](ARCHITECTURE_NFR_ASSESSMENT.md) plus [as-built architecture source](diagrams/as-built-architecture.dot).

The website is reproducibly runnable locally using the README commands. The repository does **not** evidence a public production URL or production hosting environment. The runbook describes what can be demonstrated and explicitly marks mock-only or incomplete features.

## 4. Testing and coverage

- [Testing and results](TESTING_AND_RESULTS.md) — historical CI runs and current known gaps.
- [Detailed PR #48 backend test report](test-reports/2026-11-10-PR48-backend-test-report.md) — all 55 recorded test names and their grouped areas.
- [PR #61 current-main validation report](test-reports/2026-11-18-PR61-current-main-validation.md) — 73 backend tests, build checks, current coverage totals and worker-file results.
- [Testing and coverage guide](TESTING_AND_COVERAGE.md) — test-file inventory and exact commands for line/branch/function coverage.
- [API integration test report](API_Integration_Test_Report.md)
- [Regression/E2E report](issue-12-regression-report.md)
- [Release checklist and browser evidence](issue-14/FINAL_RELEASE_CHECKLIST.md)
- [Machine-readable E2E result](issue-14/e2e-results.json)
- [Application demonstration](issue-14/application-demo.webm)
- [Technical verification demonstration](issue-14/technical-verification.webm)

### Latest coverage-enabled validation

[PR #57 CI run #44248457569](https://github.com/SE-Miniproject-EMS/SE_Miniproject/actions/runs/44248457569), 18 November 2026:
- Backend: **60 tests passed, 0 failed**.
- Backend syntax validation: passed.
- Frontend production build: passed.
- Backend line/statement coverage: **94.06%**.
- Backend branch coverage: **78.04%**.
- Backend function coverage: **97.18%**.
- The reminder job has **95.34% line, 81.81% branch and 100% function coverage** after new direct tests.
- [Coverage artifact](https://github.com/SE-Miniproject-EMS/SE_Miniproject/actions/runs/44248457569/artifacts/14403085905) includes HTML, LCOV and JSON summary. The detailed [coverage baseline report](test-reports/2026-11-18-coverage-baseline.md) preserves the earlier baseline and records this follow-up.

Historical integrated application result: [PR #48 run #42747239410](https://github.com/SE-Miniproject-EMS/SE_Miniproject/actions/runs/42747239410) reported 55 passed, 0 failed. Counts differ because they are from different commits; do not add them together.

**Current frontend test status:** a separate automated frontend component/unit-test script is not present in `frontend/package.json`; CI runs `npm run build`. Browser evidence is separate and limited to the flows recorded in the E2E JSON/video.

The current Word source documents are already tracked under `docs/`: [SRS](Event_Management_System_SRS.docx), [SAD](Event_Management_System_SAD.docx), and [Software Test Plan](Event_Management_System_Test_Plan.docx). The latest uploaded SRS/Test Plan copies were not used to overwrite these tracked documents because their SRS version context is older than the current traceability baseline.

## 5. Performance, security and operational controls

- [Performance, concurrency and data-integrity report](issue-31-performance-and-integrity-report.md) and [raw search benchmark results](issue-31-results/) — search benchmark only; the separate registration-load harness exists but its 500-attempt run is not yet recorded.
- [Security controls register](SECURITY_CONTROLS.md) — bcrypt, JWT/session expiry, RBAC, ownership boundaries, mock-card-data behavior and unresolved provider/PCI requirements.
- [Security NFR verification](issue-32-security-verification.md) and [route-matrix security report](issue-32-security-nfr-verification.md).
- [Usability study protocol](issue-33-usability-study.md) — the participant study is not yet run.
- [Availability assessment](issue-34-availability-assessment.md) — local-only setup; no 99% uptime result.

## 6. Open limitations that must be disclosed

| Area | Current state |
|---|---|
| 500 concurrent registrations | Harness merged in PR #54; no registration-specific result file; Issue #31 remains open |
| Payment | Mock simulator only; no real gateway/signed callbacks/provider-confirmed refunds; no PCI claim |
| Notifications | Queue/console dev adapter; no configured email/SMS delivery |
| QR | One-use token/check-in API; no camera/QR scanner UI |
| Feedback | Backend/API exists; complete attendee prompt/display UI is incomplete |
| Dashboards/CSV | Not implemented; backlog #29 |
| Usability NFR | Procedure documented; no participant timing result |
| Availability NFR | No deployed monitoring contract or uptime observation |
| Scalability | Local SQLite/single-process implementation does not demonstrate horizontal scaling |
| Frontend automated unit tests | No separate frontend test runner/script in the current package; production build is checked |

## 7. Review and merge status of this evidence pack

This pack is submitted in a reviewable branch/PR. It includes evidence and report-generation configuration; it does not change application business logic. Merge only after a teammate reviews the docs, verifies the new CI coverage report and confirms all evidence links resolve.
