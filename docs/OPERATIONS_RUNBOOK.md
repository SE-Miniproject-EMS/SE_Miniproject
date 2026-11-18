# Website operations and demonstration runbook

## Runtime model

This repository contains a locally runnable React/Vite frontend and Express API backed by a local SQLite database. GitHub Actions checks backend syntax/tests and the frontend production build. **No production-hosted website or production uptime-monitoring environment is evidenced by the repository snapshot.** For assessment, demonstrate the local working system and its API; do not describe localhost as a public production deployment.

## Prerequisites

- Node.js 24 (the version configured in `.github/workflows/ci.yml`).
- npm (bundled with Node.js).
- Git and a browser.

## Start the backend

From the repository root in PowerShell:

```powershell
Set-Location .\backend
npm ci
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm run dev
```

The API listens on `http://localhost:5000` by default. Its health endpoint is:

```text
GET http://localhost:5000/api/health
```

The default local database is SQLite (`backend/dev.db`). The backend `.env.example` documents local settings for `DATABASE_FILE`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `SESSION_IDLE_TIMEOUT_SECONDS`, `EMAIL_VERIFICATION_SECRET`, `PORT`, `CORS_ORIGIN`, and `NOTIFICATION_ADAPTER`. For Resend delivery, configure `NOTIFICATION_ADAPTER=resend`, `RESEND_API_KEY`, and `NOTIFICATION_FROM_EMAIL` in the private backend `.env`; never commit the real values. Mock payment reservation settings remain prototype-only.

## Start the frontend

Open a second PowerShell window from the repository root:

```powershell
Set-Location .\frontend
npm ci
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
npm run dev
```

Open the Vite address shown in the terminal (normally `http://localhost:5173`). The frontend API URL defaults to `http://localhost:5000/api` via `VITE_API_URL`.

## Sign in for a local demonstration

1. Use the Sign Up page to create an Organizer or Attendee account.
2. The backend console prints a **development-only** email-verification link.
3. Open that link in the browser, then sign in from the frontend.
4. Use an Organizer account to create a draft event, edit it, publish it and manage it.
5. Use an Attendee account to browse an event and exercise available registration actions.

The email-verification link is printed to the backend terminal (development behavior). Event notifications support a Resend adapter via private environment configuration; set `NOTIFICATION_ADAPTER=resend`, `RESEND_API_KEY`, and `NOTIFICATION_FROM_EMAIL` in the private backend `.env`. Without provider credentials, use the non-production console adapter and treat its output as a test delivery, not an email. Admins can trigger queued delivery through the admin-only `POST /api/notifications/jobs/dispatch` endpoint; the CLI worker is available as `npm run dispatch:notifications` from `backend/`.

## Demonstration features and accurate limitations

| Feature | What can be shown | Limitation that must be stated |
|---|---|---|
| Event management | Create/edit/publish/cancel events, public listing, search and filters, organizer management | Local SQLite prototype, not production hosting |
| Authentication/security | Registration, verification gate, login, role restrictions, ownership, inactivity session expiry | Email delivery is development-console-only; production secrets/deployment controls need configuration |
| Free registration | Capacity reservation, FIFO waitlist, cancellation and one-use ticket token/check-in API | 500 concurrent registration load result is not yet recorded |
| Paid registration | Provider-independent mock checkout, pending/success/failure/retry and simulated refund outcomes | No gateway is configured, no real money moves, mock refund is not provider-confirmed |
| Notifications | Queue records, 24-hour reminder job, Resend email adapter, admin-only dispatch endpoint/CLI, atomic claims, idempotency and bounded retries | Real delivery requires valid Resend API key and approved sender address; no SMS adapter is configured. Do not claim delivery without checking the provider result. |
| QR/check-in | One-use ticket token and API check-in behavior | QR image generation/camera scanner UI is not complete |
| Feedback | Feedback API and eligibility/ownership rules | Full attendee feedback prompt/display UI is incomplete |
| Dashboards/reporting | Organizer/Admin dashboard report metrics; filters by event ID and inclusive UTC event-start dates; registration and attendance CSV download | Admin sees platform-wide totals; Organizers are scoped to their own events. Real provider revenue and simulated mock revenue are reported separately. |

## Verification before a live demo

Run these checks from a clean checkout:

```powershell
# Backend API/integration tests
Set-Location .\backend
npm ci
npm test

# Backend line/branch coverage artifact
npm run test:coverage

# Frontend production build
Set-Location ..\frontend
npm ci
npm run build
```

Then follow the manual browser cases in `docs/issue-14/FINAL_RELEASE_CHECKLIST.md` and compare them with `docs/issue-14/e2e-results.json`. Record any new manual result with date, commit, environment, test account role (not credentials), steps, outcome and screenshot/video link.

## Security and operating precautions

- Never commit `.env`, `.env.local`, production secrets, access tokens, passwords, database dumps or real attendee data.
- Replace example JWT and email-verification secrets before any shared deployment.
- Keep the development notification adapter clearly labelled; do not claim that a queue record is an email/SMS delivery.
- The payment adapter is a mock. Do not enter real card data or describe a simulated status as a real charge/refund.
- Keep SQLite and demo data local. A shared or multi-instance deployment needs a shared transactional database and deployment review.
- Use the documented API routes and backend tests to verify behavior; UI visibility alone is not an authorization control.

## Known operational gaps

- No production deployment URL/environment or uptime observation history is recorded.
- No configured Resend credentials/sender evidence in the repository; production notification dispatch depends on deployment-time configuration. No SMS adapter is configured.
- No real payment gateway/sandbox/callback integration.
- No measured 99% uptime evidence.
- No demonstrated multi-instance/shared-database deployment.
