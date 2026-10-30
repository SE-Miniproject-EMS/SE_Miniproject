# Issue #14 — Final Release Verification and Submission Checklist

## Release information

- **Project:** Event Management System (EMS)
- **Repository:** [SE-Miniproject-EMS/SE_Miniproject](https://github.com/SE-Miniproject-EMS/SE_Miniproject)
- **Sprint:** Sprint 2
- **Verified main baseline before this evidence update:** `ea5e9c6dce4ce6dcbfc9034ec06a5934353cffaf`
- **Runtime:** Node.js `v24.11.0`, npm `11.6.1`

## Integration verification

- [x] Started from a fresh checkout of the latest `main` available at verification time.
- [x] Verified the project against the latest fetched `main` baseline above.
- [x] Kept verification and video artifacts on an isolated branch; no unrelated checkout changes were included.

## Clean setup and automated checks

- [x] Backend dependencies installed from the lockfile with `npm ci`.
- [x] Frontend dependencies installed from the lockfile with `npm ci`.
- [x] Backend automated tests passed: **20/20** (`npm test`).
- [x] Frontend production build passed (`npm run build`).
- [x] Backend health endpoint returned HTTP 200.

## End-to-end browser verification

The application was run locally against a disposable SQLite database using test-only accounts and secrets. No real user data or credentials were used.

- [x] Organizer registration, email verification, and login.
- [x] Create event draft, edit it, and publish it.
- [x] Search for the published event and view its public details.
- [x] Cancel the event and confirm it no longer appears publicly.
- [x] Confirm unverified accounts cannot log in.
- [x] Confirm an attendee cannot access the organizer event-creation route.
- [x] Check a 390px mobile viewport; no horizontal overflow (`innerWidth=390`, `scrollWidth=390`).
- [x] Browser console/page errors: none during the recorded flows.

Detailed machine-readable results: [e2e-results.json](e2e-results.json).

## Demonstration videos

- [x] [Application demonstration video](application-demo.webm) — organizer event lifecycle and public event experience.
- [x] [Technical verification video](technical-verification.webm) — health endpoint, verification-gated login, role restrictions, and mobile layout.

Both clips are repository files and are viewable from this checklist after it is merged.

## Known limitations and release risks

- The clean backend install reported **2 moderate** npm audit findings.
- The clean frontend install reported **4 findings**: 3 moderate and 1 high.
- These dependency findings were recorded without applying potentially breaking dependency upgrades as part of this release verification.
- npm emitted existing package deprecation notices during installation.

These audit findings are documented as outstanding limitations; the E2E workflows, 20 backend tests, and frontend production build passed in this verification.

## Final submission checklist

- [x] Clean setup completed for backend and frontend.
- [x] Backend test suite and frontend production build passed.
- [x] Core event-management and authorization workflows verified in a real browser.
- [x] Application and technical demonstration videos recorded and linked above.
- [x] Release limitations documented.
- [x] Changes reviewed against current `main` and submitted for review in the linked PR.
- [x] Release evidence merged to `main`.
- [x] Issue #14 closed after all acceptance criteria were satisfied.

## Release decision

**Status: Complete.** The required setup verification, automated checks, end-to-end workflows, and linked demonstration evidence are complete. Remaining dependency audit findings are listed above for follow-up.
