# Event Management System

A system to manage and organize events with registrations.

Tech stack: **JavaScript (React.js + Node.js)**. (Originally scoped to allow
Python/Django as an alternative; this codebase implements the JS option —
see `docs/SAD` for the architecture rationale if the team wants to revisit.)

## Status: Member 1 — Authentication & RBAC foundation

This is the first module merged into the project: a working, tested
registration/login system with role-based access control. Everything else
(events, registrations, payments, notifications, check-in, dashboards)
plugs into the patterns established here.

**What's implemented and tested:**
- User registration (Attendee / Organizer roles) — `POST /api/auth/register`
- Email verification stub (logs a link to the console; swap in a real
  provider when the Notification module exists) — `GET /api/auth/verify/:token`
- Login with JWT issuance and account lockout after 5 failed attempts for
  15 minutes — `POST /api/auth/login`
- A protected "who am I" endpoint — `GET /api/auth/me`
- Reusable `authenticate` + `authorize(...roles)` middleware for everyone
  else to protect their own routes
- A React frontend: Register page, Login page, a protected Dashboard page,
  and an `AuthContext` that the rest of the team can reuse

## The Project Structure

```
event-management-system/
├── backend/           Node.js + Express API
│   ├── src/
│   │   ├── config/db.js            Sequelize (SQLite) connection
│   │   ├── models/User.js          User model (Member 1 owns this)
│   │   ├── controllers/            Route handlers
│   │   ├── routes/                 Route definitions
│   │   ├── middleware/             auth.js (JWT + RBAC), errorHandler.js
│   │   └── server.js               App entry point
│   └── .env.example                Copy to .env and fill in
├── frontend/           React (Vite) SPA
│   └── src/
│       ├── api/                    axios client + auth requests
│       ├── context/AuthContext.jsx Login/register/logout state
│       ├── components/             Navbar, ProtectedRoute
│       └── pages/                  Home, Login, Register, Dashboard
└── docs/                SRS, SAD, Test Plan (add these if not already here)
```

## Getting Started

### Backend

```bash
cd backend
npm install
cp .env.example .env     # fill in JWT secrets (any long random string works for dev)
npm run dev               # starts on http://localhost:5000
```

The database is a local SQLite file (`backend/dev.db`), created
automatically on first run — no separate database server needed for local
dev. **Do not commit `dev.db` or `.env`** (already covered by `.gitignore`).

> For a shared staging environment, switch `backend/src/config/db.js` to
> Postgres/MySQL per the SAD's technology stack section.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev                # starts on http://localhost:5173
```

Open http://localhost:5173, sign up, log in, and you'll land on the
Dashboard — confirming the full stack (React → Express → SQLite) works.

## For the Rest of the Team

When you add your module (Event Management, Registration/Payment,
Notifications/Check-in/Dashboard), follow the pattern already in place:

**Backend:**
1. Add your Sequelize model in `backend/src/models/` (see `User.js`).
2. Add a controller in `backend/src/controllers/`.
3. Add a router in `backend/src/routes/`, and protect routes with
   `authenticate` and, where needed, `authorize("ORGANIZER", "ADMIN")` —
   see `backend/src/routes/exampleProtectedRoutes.js` for a working example.
4. Mount your router in `backend/src/server.js` (there's a comment marking
   where to add it).
5. Use the same error shape everywhere: `throw new ApiError(status, code, message)`
   from `middleware/errorHandler.js` — don't invent a new error format.

**Frontend:**
1. Add your API calls in `frontend/src/api/`.
2. Add your pages in `frontend/src/pages/`.
3. Wrap role-restricted pages in `<ProtectedRoute roles={["ORGANIZER"]}>`.
4. Reuse `useAuth()` from `AuthContext` to get the current user/token —
   don't build a second auth system.

## Running Backend API Tests

The backend uses Node.js's built-in test runner and starts an isolated SQLite database for the API integration tests. From the repository root, run:

```bash
cd backend
npm ci
npm test
```

The test suite exercises event API authentication and authorization, event lifecycle operations, invalid request data, event ownership, public event filters, rejected updates, cancelled-event behavior, and not-found responses. The same suite runs in GitHub Actions for pushes and pull requests targeting `main`.

## Branching Workflow

- `main` is always the stable, working branch.
- Create a feature branch per module: `feature/event-management`,
  `feature/registration-payment`, `feature/notifications-checkin`.
- Open a Pull Request into `main` and get at least one teammate's review
  before merging.

## Related Documents

See `/docs` for the SRS, Software Architecture & Design Specification (SAD),
and Software Test Plan — this code follows the API design and security
architecture defined there (e.g. REQ-1 through REQ-4 in the SRS map
directly to the auth module in this repo).
