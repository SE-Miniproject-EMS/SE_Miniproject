# Backend Coverage Baseline and Current-Main Validation — 18 November 2026

**Current assessor PR:** [PR #61](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/61)  
**Latest successful run:** [GitHub Actions #44370034661](https://github.com/SE-Miniproject-EMS/SE_Miniproject/actions/runs/44370034661)  
**Validated commit:** `d7a8858fab1410b483d69e3ce0540af6235ee92d`  
**Artifact:** [backend-test-coverage-114](https://github.com/SE-Miniproject-EMS/SE_Miniproject/actions/runs/44370034661/artifacts/14457259318)  
**Runtime:** Node.js 24 on GitHub-hosted Ubuntu runner  
**Command:** `cd backend && npm run test:coverage`

## Current validation result

- Backend tests: **73 passed, 0 failed**.
- Backend syntax validation: passed.
- Frontend production build: passed.
- Coverage artifact uploaded successfully.

## Measured backend coverage

| Metric | Coverage |
|---|---:|
| Lines | **93.56%** |
| Statements | **93.56%** |
| Branches | **76.62%** |
| Functions | **94.25%** |

These percentages apply to backend `src/**/*.js` included by `backend/.c8rc.json` with `all: true`. They are repository-wide backend numbers, not an individual contributor's personal coverage score.

## Selected per-file coverage and follow-up

| File | Lines | Branches | Functions | Remaining uncovered paths / follow-up |
|---|---:|---:|---:|---|
| `src/jobs/sendReminders.js` | **95.83%** | **81.81%** | **100%** | Standalone CLI entry-point lines 91–94 |
| `src/jobs/dispatchNotifications.js` | **92.30%** | **81.81%** | **66.66%** | Standalone CLI entry-point lines 47–50 |
| `src/controllers/notificationController.js` | 61.76% | 40.00% | 50.00% | Admin reminder/dispatch HTTP controller paths need direct route tests |
| `src/services/notificationService.js` | 88.83% | 54.34% | 91.66% | Remaining provider and retry branches |
| `src/routes/reportRoutes.js` | 93.04% | 75.67% | 100% | Remaining error/validation branches |
| `src/middleware/errorHandler.js` | 82.75% | 42.85% | 66.66% | Remaining unhandled and validation error paths |
| `src/services/registrationPaymentService.js` | 96.14% | 65.55% | 93.33% | Payment expiry/late callback/refund edge branches |

The reminder job was refactored into an injectable runner and now has direct tests for the 23–25 hour event window, confirmed attendee filtering, deduplication outcome, empty event set, startup failure cleanup, notification-schema setup and dependency wiring. The notification dispatch job is also testable through injected dependencies; tests cover schema setup, bounded batch dispatch, failed-delivery exit status, startup error and database cleanup.

## How to inspect

1. Open [Actions run #44370034661](https://github.com/SE-Miniproject-EMS/SE_Miniproject/actions/runs/44370034661).
2. Download [backend-test-coverage-114](https://github.com/SE-Miniproject-EMS/SE_Miniproject/actions/runs/44370034661/artifacts/14457259318).
3. Open `index.html` for the browsable HTML report.
4. Use `lcov.info` for LCOV-compatible tooling and `coverage-summary.json` for machine-readable totals.

## Historical comparison and interpretation

The earlier PR #57-only run recorded 60 tests and 94.06% line, 78.04% branch and 97.18% function coverage. Those numbers are from an earlier source tree before the current-main notification-provider and reporting code was included, so they are not directly comparable to this current-main run.

Branch coverage remains lower than line/function coverage. Prioritize direct route tests for notification-controller branches and failure paths in provider/report/error-handling code. No arbitrary coverage threshold is enforced yet.

The frontend has no separate automated component/unit-test runner; CI checks its production build. Backend coverage does not prove browser E2E behavior, a 500-registration result, PCI compliance, production uptime, deployment security or horizontal scalability.
