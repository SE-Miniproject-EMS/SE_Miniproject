# Event Management System

A full-stack event management prototype built with React, Express, Sequelize, and SQLite.

## Project progress

**Progress updated: 18 November 2026.** The two course-defined sprints (19–23 October and 26–30 October 2026) are complete and their original backlog issues are closed. Additional product/NFR issues remain in the post-sprint backlog. See the assessor evidence index for contributor, PR/review, testing, coverage, operations, security and sprint records.

### Sprint 1 — delivered

The Sprint 1 backlog issues are closed: [#3 Event Management Backend APIs](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/3), [#4 Event creation](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/4), [#5 Event validation](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/5), [#6 Event ownership](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/6), [#7 Authentication/RBAC](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/7), [#8 Event API tests](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/8), and [#10 Frontend validation](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/10).

Merged pull requests delivered the event module and CI ([#1](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/1), [#2](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/2)), event API validation and tests ([#15](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/15), [#16](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/16), [#17](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/17)), authentication and role tests ([#18](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/18)), and Sprint 1 demo readiness ([#19](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/19)).

**Delivered behavior**
- Attendee and organizer registration, password hashing, email verification, JWT login, and five-failed-attempt account lockout for 15 minutes.
- Server-side role checks and event ownership restrictions.
- Draft event creation, editing, publishing, and cancellation.
- Public upcoming event discovery with search, category, venue/location, and date filters, plus pagination.
- GitHub Actions CI for backend API tests and the frontend production build.

### Sprint 2 — completed (26–30 October 2026)

The assigned Sprint 2 items are closed: [#9 API integration](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/9), [#11 CI](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/11), [#12 regression/E2E](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/12), [#13 documentation](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/13), and [#14 final demo/release](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/14). Their owners, estimates, close dates and PR evidence are recorded in [Sprint Backlog and Burn-up](docs/project-management/SPRINT_BACKLOG_AND_BURNUP.md).

The official course plan defines two sprints and a development-cycle freeze after Sprint 2. Issues #22–#35 are additional product/verification backlog, not an undocumented third sprint.

## Sprint 1 demo and known deviations

Use [docs/sprint-1-demo-and-deviations.md](docs/sprint-1-demo-and-deviations.md) as the demo run sheet, traceability map, and deviation log.

Known limits to disclose:
- Email verification is enforced, but the development verification link is printed to the backend console. Real email delivery requires a configured provider.
- Cancellation changes the event status, but registrant notifications and refund processing are not implemented in the current flow.
- Later merged work added free-event registration/waitlisting, mock-paid checkout/refunds, token-based check-in and feedback APIs. External notification delivery, a real payment gateway, QR scanner UI, complete feedback UI, and dashboards/CSV reporting remain limitations.
- The repository uses local SQLite for development. Production deployment, shared database operations, measured 500-registration load, uptime monitoring and multi-instance scaling are not verified.
- CI runs backend syntax/tests and the frontend production build. The current test suite includes unverified-login, session expiry and RBAC route-matrix tests. Dedicated browser automation and the 500-registration load result remain gaps.

## Technology and structure

- **Frontend:** React 18, Vite, React Router
- **Backend:** Node.js, Express, Sequelize
- **Development database:** SQLite
- **Automation:** GitHub Actions

    backend/   Express API, Sequelize models, authentication and event routes
    frontend/  React + Vite application
    docs/      SRS, architecture, test plan, verification reports and assessor evidence

## Run locally on Windows

Install Git and Node.js with npm first. Open PowerShell and clone the repo once:

    Set-Location "$HOME\Documents"
    git clone https://github.com/SE-Miniproject-EMS/SE_Miniproject.git
    Set-Location .\SE_Miniproject

If you already cloned it, skip git clone and go to the existing folder instead. For example:

    Set-Location "$HOME\Documents\SE_Miniproject"

Check that you are at the repository root before continuing:

    Get-ChildItem

You should see the backend and frontend folders. If PowerShell says a path or package.json cannot be found, you are not in the repository folder yet.

### 1. Start the backend

In the first PowerShell window, from the repository root:

    Set-Location .\backend
    npm ci
    if (-not (Test-Path .env)) { Copy-Item .env.example .env }
    npm run dev

Keep this window open. The backend normally runs at http://localhost:5000. The local SQLite database file is created automatically. The example JWT secrets are for local development; replace them with secure values for any shared or deployed environment.

### 2. Start the frontend

Open a second PowerShell window. Go to the same repository root, then run:

    Set-Location "$HOME\Documents\SE_Miniproject\frontend"
    npm ci
    if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
    npm run dev

Keep this window open too. Vite prints the frontend address; it is usually http://localhost:5173. Open that address in your browser. The frontend API URL defaults to http://localhost:5000/api.

If you cloned the repository to a different folder, replace the example path in the second window with your actual repository path.

### 3. Verify an account before signing in

1. In the browser, open Sign Up and create an organizer account.
2. Return to the backend PowerShell window.
3. Find the line beginning with [DEV ONLY] Verification link for your email.
4. Open the full http://localhost:5000/api/auth/verify/... link in your browser.
5. Return to the app at http://localhost:5173/login and sign in.

The verification link is printed in the backend window; this project does not send verification emails yet. If you cannot find the link, it was printed when you registered, so check the backend window's earlier output.

## Verify changes

From backend/:

    npm test
    npm run test:coverage   # line/branch/function reports

From frontend/:

    npm run build

GitHub Actions runs the backend API suite and frontend build for pull requests and pushes to main.

## Team workflow

Create a feature branch for each change, open a pull request to main, and request a teammate review before merging. Reference the related backlog issue in the PR. Update issue status only after the work is reviewed and complete.

## Registration, QR check-in, notifications, and feedback APIs

The backend includes registration/waitlisting, token-based check-in, notifications queue/reminder job, feedback APIs, and mock payment/refund workflows. See [API Reference](docs/API_REFERENCE.md), [Implementation Baseline](docs/IMPLEMENTATION_BASELINE.md), [Operations Runbook](docs/OPERATIONS_RUNBOOK.md), and [Security Controls](docs/SECURITY_CONTROLS.md) for behavior and limitations.

## Assessor evidence pack

Start here: [Project Evidence Index](docs/PROJECT_EVIDENCE_INDEX.md). It links:
- [Contributor delivery log](docs/project-management/CONTRIBUTOR_DELIVERY_LOG.md) — assigned vs delivered work, by person/workstream.
- [GitHub issue and PR log](docs/project-management/GITHUB_ISSUE_PR_LOG.md) — linked issues, PR authors, review/fix/re-push evidence.
- [Sprint backlogs and burn-up](docs/project-management/SPRINT_BACKLOG_AND_BURNUP.md) — Sprint 1/Sprint 2 points, closure dates and chart data.
- [Testing and coverage](docs/TESTING_AND_COVERAGE.md) — test files, unit/integration tests, line/branch coverage commands and CI artifact.
- [Operations Runbook](docs/OPERATIONS_RUNBOOK.md) — local working website, startup and demo steps.
- [Security Controls](docs/SECURITY_CONTROLS.md) — password, JWT/session, RBAC and payment-security evidence.

Other documentation:
- [Functional requirements traceability matrix](docs/FR_TRACEABILITY_MATRIX.md)
- [Non-functional requirements traceability](docs/NFR_TRACEABILITY.md)
- [Testing and results](docs/TESTING_AND_RESULTS.md)

## Payment workflow demo (Issue #26)

Paid checkouts use a provider-independent **mock adapter** for local development. A pending checkout reserves capacity for 10 minutes; success, failure, expiry, FIFO waitlist offers, and full-refund states are demonstrable in the UI. Refund results from the mock adapter are labelled simulated and do not represent money movement or provider confirmation. No real payment provider is configured, and the application does not store card numbers or CVVs. See [API reference](docs/API_REFERENCE.md) for endpoints and behavior.
