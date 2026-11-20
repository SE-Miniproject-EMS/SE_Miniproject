# Backend code and branch coverage report

**Measured:** 20 November 2026, GitHub Actions on Node.js 24 / Ubuntu.
**Source commit:** `74c1912044928c4a32375ff19d581d12600e3d73` (main after PR #71).
**CI evidence:** [successful run 44665800768](https://github.com/SE-Miniproject-EMS/SE_Miniproject/actions/runs/44665800768) / artifact `backend-test-coverage-155`.

This is a saved backend coverage snapshot from an executed CI run. It is not a new test run or frontend coverage report.

## Overall coverage

| Metric | Covered | Total | Coverage |
|---|---:|---:|---:|
| Statements | 2571 | 2735 | **94.00%** |
| Lines | 2571 | 2735 | **94.00%** |
| Branches | 548 | 695 | **78.84%** |
| Functions | 89 | 92 | **96.73%** |

Line coverage records executed lines. Branch coverage records exercised decision outcomes; it is one part of code coverage, not a separate proof of correctness. Functions and statements provide additional execution measures.

## Saved reports

- [Download HTML report](html-coverage-report.zip): download the ZIP using GitHub's raw/download button, extract it, then open `index.html`. Select a source file to inspect line/branch execution and uncovered paths. GitHub does not render this ZIP as a live website.
- [Per-file coverage table](per-file-coverage.csv): GitHub can display the CSV, including branch counts.
- [Machine-readable summary](coverage-summary.json): source keys normalized from CI absolute paths to backend-relative `src/...`; metric values are unchanged.
- [LCOV report](lcov.info): original line, function and branch records retained from CI.

## Per-file branch coverage

| Backend source file | Lines | Branches | Covered branches |
|---|---:|---:|---:|
| `src/config/db.js` | 83.33% | 50.00% | 2/4 |
| `src/controllers/authController.js` | 88.26% | 62.22% | 28/45 |
| `src/controllers/eventController.js` | 88.85% | 85.79% | 151/176 |
| `src/controllers/feedbackController.js` | 100.00% | 79.16% | 19/24 |
| `src/controllers/notificationController.js` | 82.35% | 37.50% | 3/8 |
| `src/controllers/paymentController.js` | 100.00% | 93.33% | 14/15 |
| `src/controllers/registrationController.js` | 96.91% | 86.25% | 69/80 |
| `src/jobs/dispatchNotifications.js` | 92.30% | 81.81% | 9/11 |
| `src/jobs/sendReminders.js` | 95.83% | 81.81% | 9/11 |
| `src/middleware/auth.js` | 92.45% | 87.50% | 14/16 |
| `src/middleware/errorHandler.js` | 82.75% | 42.85% | 3/7 |
| `src/migrations/issue26.js` | 100.00% | 100.00% | 5/5 |
| `src/models/Event.js` | 100.00% | 100.00% | 1/1 |
| `src/models/Feedback.js` | 100.00% | 100.00% | 1/1 |
| `src/models/Notification.js` | 100.00% | 100.00% | 1/1 |
| `src/models/Payment.js` | 100.00% | 100.00% | 1/1 |
| `src/models/Refund.js` | 100.00% | 100.00% | 1/1 |
| `src/models/Registration.js` | 100.00% | 100.00% | 1/1 |
| `src/models/Session.js` | 96.00% | 40.00% | 4/10 |
| `src/models/User.js` | 100.00% | 100.00% | 1/1 |
| `src/routes/authRoutes.js` | 100.00% | 100.00% | 1/1 |
| `src/routes/eventRoutes.js` | 100.00% | 100.00% | 1/1 |
| `src/routes/exampleProtectedRoutes.js` | 100.00% | 100.00% | 4/4 |
| `src/routes/feedbackRoutes.js` | 100.00% | 100.00% | 1/1 |
| `src/routes/notificationRoutes.js` | 100.00% | 100.00% | 1/1 |
| `src/routes/paymentRoutes.js` | 100.00% | 100.00% | 1/1 |
| `src/routes/registrationRoutes.js` | 100.00% | 100.00% | 1/1 |
| `src/routes/reportRoutes.js` | 93.33% | 85.36% | 35/41 |
| `src/server.js` | 89.31% | 61.11% | 11/18 |
| `src/services/databaseWrites.js` | 92.85% | 66.66% | 6/9 |
| `src/services/mockPaymentAdapter.js` | 100.00% | 100.00% | 9/9 |
| `src/services/notificationService.js` | 96.20% | 64.40% | 38/59 |
| `src/services/paymentService.js` | 100.00% | 80.00% | 12/15 |
| `src/services/registrationPaymentService.js` | 96.70% | 75.96% | 79/104 |
| `src/utils/jwt.js` | 100.00% | 100.00% | 6/6 |
| `src/utils/validators.js` | 100.00% | 100.00% | 5/5 |

## Reproduce

From the repository root:

```powershell
Set-Location backend
npm ci
npm run test:coverage
```

Open `backend/coverage/index.html`. The repository's `.c8rc.json` includes all backend `src/**/*.js`, including files not executed by the tests. Local results can differ with source changes, database setup and runtime. The dedicated PostgreSQL integration job runs separately; this saved report comes from the backend coverage job.

CI automatically uploads its complete coverage output with 90-day retention. These selected snapshot files remain versioned in the repository. Temporary V8 data, duplicate HTML output, credentials and application databases are not included.

Coverage is a repository-wide backend metric, not an individual contribution score, a requirement-pass percentage, or proof that every user workflow is correct. No separate frontend unit-test coverage report exists.
