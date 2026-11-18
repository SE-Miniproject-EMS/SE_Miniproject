# Test, unit-test and coverage reporting

**Current evidence:** coverage-enabled PR #57 run [#44241742992](https://github.com/SE-Miniproject-EMS/SE_Miniproject/actions/runs/44241742992), 18 November 2026.  
**Result:** 56 backend tests passed, 0 failed; backend syntax validation and frontend production build passed. The same run uploaded the measured coverage artifact.  
**Scope note:** these are Node.js test-runner results. Most API scenarios are HTTP integration/regression tests, not isolated unit tests.

## What is tested

| Test file | Test type | Main coverage |
|---|---|---|
| `backend/test/auth-api.test.js` | HTTP integration | Account registration, duplicate emails, bcrypt hashing, verification gate, login, session expiry, authentication and role restrictions |
| `backend/test/event-api.test.js` | HTTP integration/regression | Event lifecycle, validation, search/filters, ownership, registrations, capacity, waitlist, cancellation, check-in, feedback, payment mock behavior and RBAC route matrix |
| `backend/test/jwt.test.js` | Unit | JWT configuration, issuance and absolute expiry rules |
| `backend/test/payment-rules.test.js` | Unit/rule | Paise conversion, validation and refund-cutoff rules |
| `backend/test/issue26-migration.test.js` | Database migration integration | Existing registration preservation and idempotent waitlist-position backfill |

## Test commands

From the repository root:

```bash
cd backend
npm ci
npm test
```

Frontend production build:

```bash
cd frontend
npm ci
npm run build
```

The backend integration tests start a local Express child process and use disposable temporary SQLite files. They do not intentionally use the normal `backend/dev.db`. Do not point load or integration tests at production or shared user data.

## Line, branch and function coverage

The repository CI now runs:

```bash
cd backend
npm run test:coverage
```

That script uses the pinned `c8@12.0.0` V8 coverage reporter with `--all` and `src/**/*.js` inclusion. It covers child backend processes launched by the integration tests and includes source files not reached by tests as zero-coverage entries.

It generates:
- **Text summary:** line, branch, function and statement coverage in the GitHub Actions job log.
- **HTML report:** `backend/coverage/index.html`, with per-file details.
- **LCOV report:** `backend/coverage/lcov.info`, including line and branch records.
- **JSON summary:** `backend/coverage/coverage-summary.json`.

The CI job uploads the complete `backend/coverage/` folder as the Actions artifact named `backend-test-coverage-<run number>`. Open the relevant Actions run, select *Artifacts*, and download that report. The same run shows the Node test pass/fail summary in the backend job log.

### Coverage status

**Measured baseline — 18 November 2026:** run [#44241427529](https://github.com/SE-Miniproject-EMS/SE_Miniproject/actions/runs/44241427529) reports 92.79% line coverage, 77.81% branch coverage, 95.71% function coverage and 92.79% statement coverage. This includes 2,075/2,236 lines, 414/532 branches and 67/70 functions across backend `src/**/*.js`. The downloadable [coverage artifact](https://github.com/SE-Miniproject-EMS/SE_Miniproject/actions/runs/44241742992/artifacts/14399547708) contains the HTML/LCOV/JSON files. See the [detailed coverage baseline](test-reports/2026-11-18-coverage-baseline.md).

The reminder job `src/jobs/sendReminders.js` has 0% line/branch/function coverage and is the clearest follow-up. Notification service/controller and error-handler branches also need more tests. No minimum line/branch threshold is enforced yet; agree a justified threshold after reviewing this baseline rather than adding an arbitrary CI gate.

## Frontend testing status

The frontend currently defines `dev`, `build` and `preview` scripts; it does not define a separate automated component/unit-test script. CI verifies that the React/Vite production build succeeds. Browser-level evidence is held separately in:
- `docs/issue-14/e2e-results.json`
- `docs/issue-14/application-demo.webm`
- `docs/issue-14/technical-verification.webm`

The recorded browser test covers the organizer event lifecycle, verification/login, attendee authorization and a 390px layout check. It is not a full automated browser suite for every registration/payment/notification feature.

## Historical CI evidence

| PR / run | Backend result | Frontend result | Interpretation |
|---|---|---|---|
| PR #21 / [run #40363629586](https://github.com/SE-Miniproject-EMS/SE_Miniproject/actions/runs/40363629586) | 18 passed, 0 failed | Build passed | Sprint 2 API integration baseline |
| PR #47 / [run #41889324919](https://github.com/SE-Miniproject-EMS/SE_Miniproject/actions/runs/41889324919) | 28 passed, 0 failed | Build passed | Registration/free-event and waitlist changes |
| PR #52 / [run #42396147609](https://github.com/SE-Miniproject-EMS/SE_Miniproject/actions/runs/42396147609) | 30 passed, 0 failed | Build passed | Security regressions and NFR evidence |
| PR #55 / [run #42491216438](https://github.com/SE-Miniproject-EMS/SE_Miniproject/actions/runs/42491216438) | 30 passed, 0 failed | Build passed | RBAC route matrix test |
| PR #48 / [run #42747239410](https://github.com/SE-Miniproject-EMS/SE_Miniproject/actions/runs/42747239410) | **55 passed, 0 failed** | **Build passed** | Later integrated code baseline including mock payment/refund and security route-matrix test |

Run counts are historical results from different commits and must not be added together. PR #56 was documentation-only; its PR description records `git diff --check` passing and says backend/frontend suites were not run on that PR.

## Performance and security verification are separate

- Event search benchmark results are in `docs/issue-31-results/`; these do not measure registration concurrency.
- PR #54 adds the 500-registration harness, but no registration-specific 500-attempt result JSON/CSV is currently committed. Issue #31 remains open.
- The security evidence and limitations are recorded in `docs/issue-32-security-nfr-verification.md` and `docs/SECURITY_CONTROLS.md`.
- A passing test suite/build is not production deployment, PCI certification, 99% uptime evidence or proof of horizontal scalability.
