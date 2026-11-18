# Backend

Express API for the Event Management System.

## Setup

From this directory:

```bash
npm ci
cp .env.example .env
```

Set a unique local `JWT_SECRET` and `EMAIL_VERIFICATION_SECRET` in `.env`. Keep the real file untracked. The default local database is a SQLite file at `./dev.db`; it is created by Sequelize during startup.

## Run

```bash
npm run dev
```

The default API port is `5000`. The health endpoint is `GET /api/health`.

## Validation

```bash
npm test
```

The tests use Node's built-in test runner. The CI workflow also checks JavaScript syntax in `src/`.

## Source layout

- `src/config/` — database configuration
- `src/controllers/` — request handlers
- `src/jobs/` — scheduled/operational jobs
- `src/middleware/` — authentication and error handling
- `src/migrations/` — compatibility migrations
- `src/models/` — Sequelize models
- `src/routes/` — API route registration
- `src/services/` — business logic and external-provider adapters
- `src/utils/` — shared utilities
- `test/` — API, migration, and service tests
- `scripts/` — benchmark utilities

## Utility scripts

- `npm run reminders`
- `npm run benchmark:events`
- `npm run benchmark:registrations`

Payment flows are mock/simulated. The console notification adapter is for development and testing, not production delivery.
