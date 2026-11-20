# Event Management System (EMS)

A Software Engineering mini-project for managing events, registrations, waitlists, notifications, mock payments, check-in, feedback, and reporting.

## Team roles

- **Dharoor Shiva Sai Varun** — Full-stack development for registration, mock payments, and reporting, plus end-to-end testing and demos.
- **Chirag Basanth Bellavi** — Event management features, GitHub Actions, and session expiry.
- **Gandhar Sameer Gokhale** — Backend validation, API integration and security testing, reminder/notification-dispatch worker tests, and requirements verification.
- **Harshith J (Alex)** — Notifications, QR check-in, and feedback, plus API testing and documentation.

## Hosted demo

- **Website:** https://ems-demo-web.onrender.com
- **Backend API:** https://ems-demo-api.onrender.com

The free backend service may take a minute to wake up after inactivity. Payments and refunds are simulated; no real money is processed.

## Technology

- **Frontend:** React, React Router, Vite, Axios
- **Backend:** Node.js, Express, Sequelize
- **Database:** SQLite for local development; PostgreSQL for the hosted demo
- **Testing:** Node.js built-in test runner and API tests
- **Automation:** GitHub Actions

## Prerequisites

Install:

- Node.js 24 and npm
- Git

Check the installations:

```powershell
node --version
npm --version
git --version
```

## Local setup on Windows

Use two PowerShell terminals: one for the backend and one for the frontend.

### 1. Download the repository

For a new installation:

```powershell
Set-Location "$HOME\Documents"
git clone https://github.com/SE-Miniproject-EMS/SE_Miniproject.git
Set-Location .\SE_Miniproject
```

If the repository is already downloaded:

```powershell
Set-Location "$HOME\Documents\SE_Miniproject"
git status
git switch main
git pull --ff-only
```

Preserve any uncommitted work before switching branches or updating the repository.

### 2. Configure and start the backend

In the first terminal:

```powershell
Set-Location "$HOME\Documents\SE_Miniproject\backend"
npm ci
if (-not (Test-Path .env)) {
    Copy-Item .env.example .env
}
```

Generate a secret:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Run the command twice. Put the two different generated values into `backend/.env`:

```dotenv
DATABASE_FILE="./dev.db"

JWT_SECRET="paste_first_generated_secret"
JWT_EXPIRES_IN="1d"
SESSION_IDLE_TIMEOUT_SECONDS=1800

EMAIL_VERIFICATION_SECRET="paste_second_generated_secret"

PORT=5000
CORS_ORIGIN="http://localhost:5173"

NOTIFICATION_ADAPTER=console

PAYMENT_RESERVATION_TTL_MINUTES=10
PAYMENT_EXPIRY_SCAN_INTERVAL_MS=30000
```

Leave `DATABASE_URL` unset to use SQLite locally. The application creates the local database automatically.

Start the backend:

```powershell
npm run dev
```

Keep this terminal open. The backend should listen at:

```text
http://localhost:5000
```

### 3. Configure and start the frontend

Open a second PowerShell terminal:

```powershell
Set-Location "$HOME\Documents\SE_Miniproject\frontend"
npm ci
if (-not (Test-Path .env.local)) {
    Copy-Item .env.example .env.local
}
```

Ensure `frontend/.env.local` contains:

```dotenv
VITE_API_URL=http://localhost:5000/api
```

Start the frontend:

```powershell
npm run dev
```

Open the address printed by Vite, normally:

```text
http://localhost:5173
```

Keep both terminals running while using the application.

### 4. Create an account and verify your email

1. Open the frontend and select **Sign Up**.
2. Submit your account details.
3. With the console notification adapter, look in the backend terminal for a verification link.
4. Open that link in your browser.
5. After verification succeeds, return to the frontend and log in.

The console adapter logs verification links instead of delivering real email.

If the link is missing or expired, use **Request a verification link** on the login page where available. You can also request a fresh link using PowerShell:

```powershell
$email = Read-Host "Enter your registered email"
$body = @{ email = $email.Trim() } | ConvertTo-Json

Invoke-RestMethod `
    -Uri "http://localhost:5000/api/auth/resend-verification" `
    -Method Post `
    -ContentType "application/json" `
    -Body $body
```

Check the backend terminal for the new link.

### 5. Stop or restart the application

Press **Ctrl + C** in each terminal to stop its server.

To start again, run `npm run dev` from the corresponding `backend` and `frontend` folders.

After changing environment files, restart the affected server.

## Hosted account verification

When the hosted demo uses the console notification adapter:

1. Register at https://ems-demo-web.onrender.com.
2. Open Render → **ems-demo-api → Logs**.
3. Search for `Verification link` and your registered email.
4. Open the fresh verification link.
5. Return to the website and log in.

If needed, request another link:

```powershell
$email = Read-Host "Enter your registered email"
$body = @{ email = $email.Trim() } | ConvertTo-Json

Invoke-RestMethod `
    -Uri "https://ems-demo-api.onrender.com/api/auth/resend-verification" `
    -Method Post `
    -ContentType "application/json" `
    -Body $body
```

Only team members with access to Render logs can retrieve console-delivered links. Real email delivery requires a configured email provider.

## Render configuration

The hosted backend uses PostgreSQL through `DATABASE_URL`; local development can continue using SQLite.

Configure the backend environment in Render:

```dotenv
DATABASE_URL=<PostgreSQL connection URL>
DATABASE_SSL=true
JWT_SECRET=<strong random secret>
EMAIL_VERIFICATION_SECRET=<different strong random secret>
CORS_ORIGIN=https://ems-demo-web.onrender.com
PUBLIC_API_URL=https://ems-demo-api.onrender.com
TRUST_PROXY=1
NOTIFICATION_ADAPTER=console
PAYMENT_RESERVATION_TTL_MINUTES=10
PAYMENT_EXPIRY_SCAN_INTERVAL_MS=30000
```

Configure the frontend environment:

```dotenv
VITE_API_URL=https://ems-demo-api.onrender.com/api
```

After merging changes, ensure both Render services deploy from `main`. Use **Manual Deploy → Deploy latest commit** if automatic deployment is disabled.

Frontend environment changes require a new frontend build and deployment.

## Troubleshooting

### `package.json` cannot be found

Run npm commands from the correct folder:

```powershell
Set-Location "$HOME\Documents\SE_Miniproject\backend"
```

Or:

```powershell
Set-Location "$HOME\Documents\SE_Miniproject\frontend"
```

### `EPERM`, `vite` not recognized, or `nodemon` not recognized

An installation may have failed because a running server locked a dependency.

1. Stop the project's running frontend and backend with **Ctrl + C**.
2. Run `npm ci` again in the affected folder.
3. Run `npm run dev` only after installation succeeds.

### Login says to verify your email

Open the verification link from the backend terminal or Render backend logs, then try logging in again.

### Frontend cannot connect to the backend

- Confirm the backend is running.
- Check `VITE_API_URL`.
- Check that `CORS_ORIGIN` matches the frontend address.
- Restart local servers after environment changes.
- Allow the free hosted backend time to wake up.

## Tests and build

Backend tests:

```powershell
Set-Location "$HOME\Documents\SE_Miniproject\backend"
npm test
```

Frontend production build:

```powershell
Set-Location "$HOME\Documents\SE_Miniproject\frontend"
npm run build
```

### Backend coverage reports

[View the saved code and branch coverage report](docs/testing/coverage/2026-11-20/README.md): **94.00% line/statement coverage**, **78.84% branch coverage**, measured on 20 November 2026. Includes a downloadable HTML report, per-file CSV, JSON summary and LCOV data.

## Backend utility scripts

Run from `backend/`:

- `npm run reminders` — execute the reminder job.
- `npm run dispatch:notifications` — dispatch queued notifications.
- `npm run benchmark:events` — run the event-search benchmark.
- `npm run benchmark:registrations` — run the registration-concurrency benchmark.

Benchmark outputs remain local unless deliberately added to the repository.

## Documentation and evidence

- [Documentation index](docs/README.md)
- [Assessor evidence index](docs/PROJECT_EVIDENCE_INDEX.md)
- [GGO4411 individual work evidence](docs/project-management/GGO4411_INDIVIDUAL_WORK_EVIDENCE.md)

## Repository layout

```text
.
├── .github/workflows/       # Continuous integration
├── backend/                 # API, models, services, jobs, and tests
├── frontend/                # React client
├── docs/
│   ├── architecture/
│   ├── requirements/
│   ├── testing/
│   ├── project-management/
│   ├── diagrams/
│   └── ...
└── README.md
```

## Contribution workflow

1. Create a focused branch.
2. Implement the change and run relevant checks.
3. Open a pull request with test evidence and the related issue.
4. Address review feedback before merging.

Never commit real credentials, verification links, local environment files, databases, dependency folders, or generated build output.
