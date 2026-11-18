# Backend Coverage Baseline — 18 November 2026

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
| `src/jobs/sendReminders.js` | 0% | 0% | 0% | Add tests for due/not-due reminder selection, recipient scope, duplicate prevention and dispatch behavior. |
| `src/controllers/notificationController.js` | 76.92% | 40.00% | 100% | Add negative/error/authorization route cases for notification endpoints. |
| `src/middleware/errorHandler.js` | 82.75% | 42.85% | 66.66% | Add explicit tests for unhandled, validation and operational error branches. |
| `src/services/notificationService.js` | 81.81% | 55.55% | 100% | Add recipient, deduplication, retry and provider-adapter failure cases. |
| `src/models/Session.js` | 95.45% | 50.00% | 100% | Add tests for remaining idle timeout boundary/configuration branches. |
| `src/services/registrationPaymentService.js` | 96.14% | 65.55% | 93.33% | Add tests for remaining payment expiry/late callback/refund edge branches. |

The test suite exercises the real Express server in a child process. The backend now handles SIGTERM/SIGINT by closing the HTTP listener and Sequelize connection gracefully so V8 can flush child-process coverage before exit.

## How to inspect

1. Open the workflow run link above.
2. Under **Artifacts**, download `backend-test-coverage-81`.
3. Open `index.html` for the browsable HTML report.
4. Use `lcov.info` for LCOV-compatible tooling and `coverage-summary.json` for machine-readable totals.

## Interpretation

- Branch coverage is lower than line/function coverage, so add targeted tests for unvisited decision paths; do not use the line percentage alone as a quality verdict.
- Reminder scheduling currently has no direct test coverage (0% for `sendReminders.js`).
- No coverage threshold is enforced yet. Agree a threshold after reviewing this measured baseline and prioritizing untested critical branches.
- The report covers backend source. The frontend package has no separate automated component/unit-test runner; its current CI check is the Vite production build.
- A passing unit/integration suite and coverage report do not prove 500-request performance, PCI compliance, uptime, deployment security or horizontal scalability.
