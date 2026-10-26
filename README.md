# Event Management System

A full-stack event management prototype built with React, Express, Sequelize, and SQLite.

## Project progress

**Progress updated: 26 October 2026.** Sprint 1 implementation is merged. Sprint 2 backlog work remains open and is assigned across the four teammates.

### Sprint 1 — delivered

The Sprint 1 backlog issues are closed: [#3 Event Management Backend APIs](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/3), [#4 Event creation](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/4), [#5 Event validation](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/5), [#6 Event ownership](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/6), [#8 Event API tests](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/8), and [#10 Frontend validation](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/10).

Merged pull requests delivered the event module and CI ([#1](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/1), [#2](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/2)), event API validation and tests ([#15](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/15), [#16](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/16), [#17](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/17)), authentication and role tests ([#18](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/18)), and Sprint 1 demo readiness ([#19](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/19)).

**Delivered behavior**
- Attendee and organizer registration, password hashing, email verification, JWT login, and five-failed-attempt account lockout for 15 minutes.
- Server-side role checks and event ownership restrictions.
- Draft event creation, editing, publishing, and cancellation.
- Public upcoming event discovery with search, category, venue/location, and date filters, plus pagination.
- GitHub Actions CI for backend API tests and the frontend production build.

### Sprint 2 — current backlog

All items below are open in the project backlog. Assignments and estimates reflect the current issues.

| Issue | Work | Estimate | Assignee(s) | Status |
| --- | --- | ---: | --- | --- |
| [#9](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/9) | API integration testing | 5 points | GGO4411, minestevealex-ux | Open |
| [#11](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/11) | Set up / finalize GitHub Actions CI | 5 points | ChiragBasanth | Open |
| [#12](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/12) | Regression and end-to-end testing | 5 points | dshivasaivarun-lgtm | Open |
| [#13](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/13) | Finalize project documentation | 3 points | minestevealex-ux | Open |
| [#14](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/14) | Final demonstration and release | 3 points | dshivasaivarun-lgtm, ChiragBasanth | Open |

The CI workflow is already present and the latest checks on PR #19 passed. Issue #11 remains open for the team to complete its acceptance criteria and document the workflow.

## Sprint 1 demo and known deviations

Use [docs/sprint-1-demo-and-deviations.md](docs/sprint-1-demo-and-deviations.md) as the demo run sheet, traceability map, and deviation log.

Known limits to disclose:
- Email verification is enforced, but the development verification link is printed to the backend console. Real email delivery requires a configured provider.
- Cancellation changes the event status, but registrant notifications and refund processing are not implemented in the current flow.
- Event registration, payments, waitlists, check-in/QR, feedback, and reporting remain outside the delivered Sprint 1 flow.
- The repository uses local SQLite for development; production deployment, shared database operations, and load testing remain future work.
- CI passes the current backend suite and frontend build. Dedicated test assertions for lockout, rejection of unverified login, and pagination remain coverage gaps.

## Technology and structure

- **Frontend:** React 18, Vite, React Router
- **Backend:** Node.js, Express, Sequelize
- **Development database:** SQLite
- **Automation:** GitHub Actions

    backend/   Express API, Sequelize models, authentication and event routes
    frontend/  React + Vite application
    docs/      SRS, architecture, test plan, Sprint 1 demo/deviation guide

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

From frontend/:

    npm run build

GitHub Actions runs the backend API suite and frontend build for pull requests and pushes to main.

## Team workflow

Create a feature branch for each change, open a pull request to main, and request a teammate review before merging. Reference the related backlog issue in the PR. Update issue status only after the work is reviewed and complete.
