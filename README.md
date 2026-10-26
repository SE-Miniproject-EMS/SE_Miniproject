# Event Management System

A full-stack event management prototype built with React, Express, Sequelize, and SQLite.

## Sprint 1 implementation

Sprint 1 provides the authentication foundation and event-management flow:

- Attendee and organizer registration with password hashing, email verification, and JWT login.
- Account lockout after five failed login attempts for 15 minutes.
- Server-side role checks and organizer ownership checks for event changes.
- Draft event creation, editing, publishing, and cancellation.
- Public upcoming-event discovery with search, category, location, and date filters.
- Paginated event results, ordered by start date.
- GitHub Actions CI for backend API checks and the frontend production build.

Email verification currently uses a development-only link printed to the backend console. Real email delivery requires a configured provider and credentials. Registrations and payments, waitlists, cancellation notifications/refunds, check-in, and reporting are outside the delivered Sprint 1 flow and remain planned work.

## Project structure

```
backend/   Express API, Sequelize models, auth/event routes and controllers
frontend/  React + Vite application
docs/      SRS, architecture, test plan, Sprint 1 demo/deviation notes
```

## Run locally

### Backend

```bash
cd backend
npm ci
cp .env.example .env
npm run dev
```

The development database is SQLite and is created automatically. Keep `.env` and local database files out of commits.

### Frontend

```bash
cd frontend
npm ci
cp .env.example .env.local
npm run dev
```

Open the Vite URL shown in the terminal. Set the frontend API base URL in `.env.local` if it differs from the backend default.

## Verify the code

From `backend/`:

```bash
npm test
```

From `frontend/`:

```bash
npm run build
```

GitHub Actions runs the backend API suite and frontend build for pushes and pull requests targeting `main`.

## Team workflow

Create a feature branch for each change, open a pull request to `main`, and request a teammate review before merging. Link the pull request to its backlog issue in the PR description or with GitHub's issue-closing keywords when the work is ready to close that issue.

See `docs/sprint-1-demo-and-deviations.md` for the Sprint 1 walkthrough and deviation log template. The SRS, Software Architecture & Design, and Software Test Plan are under `docs/`.
