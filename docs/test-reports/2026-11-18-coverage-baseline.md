# Backend Coverage Baseline and Follow-up — 18 November 2026

## Latest follow-up validation — PR #57 run [#44248457569](https://github.com/SE-Miniproject-EMS/SE_Miniproject/actions/runs/44248457569)

**Commit:** `21a3acb21a987c0becc0b498ca512dfe79e9da90`  
**Artifact:** [backend-test-coverage-99](https://github.com/SE-Miniproject-EMS/SE_Miniproject/actions/runs/44248457569/artifacts/14403085905)

- Backend tests: **60 passed, 0 failed**.
- Backend syntax validation: passed.
- Frontend production build: passed.
- Overall backend coverage: **94.06% lines/statements, 78.04% branches, 97.18% functions**.
- Reminder job `src/jobs/sendReminders.js`: **95.34% lines, 81.81% branches, 100% functions**.

The reminder job was refactored into an injectable runner and given direct tests for the 23–25 hour event window, confirmed-attendee targeting, deduplication outcomes, the no-matching-event path, startup failure handling and dependency wiring. The remaining uncovered lines (81–84) are the standalone CLI entry-point guard.

This is the latest measurement. The original 56-test/92.79%-line baseline below is retained as a historical comparison; use this follow-up run for the current result.


**Workflow:** [GitHub Actions run #44241742992](https://github.com/SE-Miniproject-EMS/SE_Miniproject/actions/runs/44241742992)  
**Commit:** `5e6ed8f6042af768f6cf35e14e96192e3dab5e5f`  
**Artifact:** [backend-test-coverage-81](https://github.com/SE-Miniproject-EMS/SE_Miniproject/actions/runs/44241742992/artifacts/14399547708)  
**Runtime:** Node.js 24 on GitHub-hosted Ubuntu runner  
**Test command:** `cd backend && npm run test:coverage`

## Execution result

- **Backend tests:** 56 passed, 0 failed.
- **Backend syntax validation:** passed.
- **Frontend production build:** passed.
- **Coverage collection:** passed; the artifact contains HTML, LCOV, JSON summary and raw V8 coverage files.

## Measured backend coverage

| Metric | Covered | Total | Coverage |
|---|---:|---:|---:|
| Lines | 2,075 | 2,236 | **92.79%** |
| Statements | 2,075 | 2,236 | **92.79%** |
| Branches | 414 | 532 | **77.81%** |
| Functions | 67 | 70 | **95.71%** |

These percentages apply to the backend JavaScript files included by `backend/.c8rc.json` (`src/**/*.js`) with `all: true`. This baseline is from one CI run/commit. It is not a frontend coverage result and not a guarantee of production reliability.

## Per-file areas needing follow-up

| File | Lines | Branches | Functions | Follow-up |
|---|---:|---:|---:|---|
| `src/jobs/sendReminders.js` | 95.34% | 81.81% | 100% | Direct scheduling/dispatch tests are now present; only the standalone CLI entry-point guard (lines 81–84) remains uncovered. |
| `src/controllers/notificationController.js` | 76.92% | 40.00% | 100% | Add negative/error/authorization route cases for notification endpoints. |
| `src/middleware/errorHandler.js` | 82.75% | 42.85% | 66.66% | Add explicit tests for unhandled, validation and operational error branches. |
| `src/services/notificationService.js` | 81.81% | 55.55% | 100% | Add recipient, deduplication, retry and provider-adapter failure cases. |
| `src/models/Session.js` | 95.45% | 50.00% | 100% | Add tests for remaining idle timeout boundary/configuration branches. |
| `src/services/registrationPaymentService.js` | 96.14% | 65.55% | 93.33% | Add tests for remaining payment expiry/late callback/refund edge branches. |

The test suite exercises the real Express server in a child process. The backend now handles SIGTERM/SIGINT by closing the HTTP listener and Sequelize connection gracefully so V8 can flush child-process coverage before exit.

## How to inspect

1. Open the workflow run link above.
2. For the latest result, download `backend-test-coverage-99`; the earlier `backend-test-coverage-81` artifact is retained as the original baseline.
3. Open `index.html` for the browsable HTML report.
4. Use `lcov.info` for LCOV-compatible tooling and `coverage-summary.json` for machine-readable totals.

## Interpretation

- Branch coverage is lower than line/function coverage, so add targeted tests for unvisited decision paths; do not use the line percentage alone as a quality verdict.
- Reminder scheduling now has direct unit coverage (95.34% lines, 81.81% branches, 100% functions); the CLI entry-point guard remains untested.
- No coverage threshold is enforced yet. Agree a threshold after reviewing this measured baseline and prioritizing untested critical branches.
- The report covers backend source. The frontend package has no separate automated component/unit-test runner; its current CI check is the Vite production build.
- A passing unit/integration suite and coverage report do not prove 500-request performance, PCI compliance, uptime, deployment security or horizontal scalability.
