# Event Management System

A full-stack event management application built with React, Vite, Node.js, Express, Sequelize, and SQLite. Attendees can browse upcoming events, while organizers can create, edit, publish, and cancel events.

## Run locally on Windows

Install Git and Node.js with npm. Clone the repository once:

```powershell
Set-Location "$HOME\Documents"
git clone https://github.com/SE-Miniproject-EMS/SE_Miniproject.git
Set-Location .\SE_Miniproject
```

If the repository is already cloned, open PowerShell at its folder, for example:

```powershell
Set-Location "$HOME\Documents\SE_Miniproject"
```

### Start the backend

In the first PowerShell window, from the repository root:

```powershell
Set-Location .\backend
npm ci
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm run dev
```

The backend runs at `http://localhost:5000` and creates the local SQLite database automatically. Keep this window open.

### Start the frontend

Open a second PowerShell window at the repository root and run:

```powershell
Set-Location .\frontend
npm ci
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
npm run dev
```

Open the Vite address shown in the terminal, usually `http://localhost:5173`. Keep this window open too. If the repo is in a different location, start the second window at that folder's root.

### Verify your email before logging in

After signing up, find the `[DEV ONLY] Verification link` printed in the backend window. Open that link in a browser, then sign in at `http://localhost:5173/login`. The app currently prints verification links to the backend console instead of sending email.
