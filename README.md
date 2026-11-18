# Event Management System (EMS)

A Software Engineering mini-project for managing events, registrations, notifications, payments, and reporting.

## Team roles

- **Dharoor Shiva Sai Varun** — Full-stack development for registration, mock payments, and reporting, plus end-to-end testing and demos.
- **Chirag Basanth Bellavi** — Event management features, GitHub Actions, and session expiry.
- **Gandhar Sameer Gokhale** — Backend validation, API integration and security testing, reminder/notification-dispatch worker tests, and requirements verification.
- **Harshith J (Alex)** — Notifications, QR check-in, and feedback, plus API testing and documentation.

## Project evidence

Start with the [assessor evidence index](docs/PROJECT_EVIDENCE_INDEX.md) for contribution records, sprint evidence, test reports and project limitations. The [GGO4411 individual work evidence](docs/project-management/GGO4411_INDIVIDUAL_WORK_EVIDENCE.md) maps personal assignments to authored pull requests, code review, tests and CI evidence.

## Repository layout

```text
.
├── .github/workflows/       # CI workflow
├── backend/                 # Express API, data models, services, jobs, and tests
├── frontend/                # React + Vite client
├── docs/
│   ├── architecture/        # Architecture, API reference, implementation baseline
│   ├── requirements/        # SRS and requirements traceability
│   ├── testing/             # Test plan, integration report, test results
│   ├── project-management/  # Team evidence, sprint notes, implementation plans
│   ├── diagrams/            # Editable diagram sources and rendered diagrams
│   └── ...                 # Issue-specific evidence and benchmark artefacts
└── README.md
```

See [the documentation index](docs/README.md) for the complete guide to project artefacts.

## Technology

- **Frontend:** React, React Router, Vite, Axios
- **Backend:** Node.js, Express, Sequelize, SQLite
- **Testing:** Node.js built-in test runner and the repository's API test suite
- **Automation:** GitHub Actions

Payments/refunds are simulated for demonstration; do not use this project to process real payments.

## Prerequisites

- Node.js 24 (the CI workflow uses Node.js 24)
- npm

## Local setup

### 1. Backend

```bash
cd backend
npm ci
```

Copy `backend/.env.example` to `backend/.env` and configure the local values before starting the API.

Start the development server:

```bash
npm run dev
```

Run backend tests:

```bash
npm test
```

### 2. Frontend

In a second terminal:

```bash
cd frontend
npm ci
```

Copy `frontend/.env.example` to `frontend/.env`, configure the API base URL, and start Vite:

```bash
npm run dev
```

Create a production build:

```bash
npm run build
```

## Backend utility scripts

Run these from `backend/`:

- `npm run reminders` — execute the reminder job.
- `npm run dispatch:notifications` — dispatch queued notifications.
- `npm run benchmark:events` — run the event-search benchmark.
- `npm run benchmark:registrations` — run the registration-concurrency benchmark.

Benchmark outputs are local artefacts unless explicitly added to the repository.

## Continuous integration

The GitHub Actions workflow in `.github/workflows/ci.yml` installs dependencies, checks backend JavaScript syntax, runs backend tests with coverage reporting, uploads the coverage artifact, and builds the frontend for pushes and pull requests targeting `main`.

## Contribution workflow

1. Create a focused branch for a change.
2. Keep changes scoped to one feature, fix, or documentation task.
3. Run the relevant backend tests and/or frontend production build.
4. Open a pull request with a summary, test evidence, and linked issue.
5. Address review feedback and update the pull request before merging.

Never commit real credentials, local environment files, databases, dependency folders, or generated build output.
