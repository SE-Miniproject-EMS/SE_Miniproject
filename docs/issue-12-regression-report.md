# Issue 12: Regression and End-to-End Test Report

## Scope

The backend integration tests start the Express application on a local port with a temporary SQLite database, then exercise the real HTTP routes and persistence layer. Each test run uses isolated test data and does not touch the application's configured database.

## Coverage

| Area | Regression coverage |
| --- | --- |
| Event lifecycle | Organizer creates a draft, views it in their managed events, edits it, publishes it, reads the updated public event, cancels it, and confirms it is no longer publicly available. |
| Event authorization | Anonymous and attendee event creation is rejected; another organizer cannot update or cancel an event; the owner can update it. |
| Event validation | Required fields, dates, capacity, ticket price, title length, invalid updates, invalid publishing data, and cancelled-event restrictions are checked. Rejected updates are verified not to change stored data. |
| Public event discovery | Category, location, text search, and date filters are exercised. Pagination order and metadata are checked, and invalid page/limit values are rejected. |
| Authentication and access control | Registration, duplicate email, password hashing, verified and unverified login, invalid credentials, token validation, current-user access, role restrictions, and admin self-registration denial are covered. |

## Defects and release notes

No unexpected failures were found in this automated regression run. Invalid inputs and unauthorized actions returned the expected API errors. No critical defect was observed by the covered tests.

This repository does not include a browser automation suite. These tests verify end-to-end behavior through the running backend HTTP API; they do not claim to verify responsive layout, browser navigation, browser console output, or the complete frontend-to-backend journey in a real browser. Perform a manual browser smoke check for those UI-specific items before the final demo.

## Verification

- `cd backend && npm test` — passed: 20 tests, 0 failures.
- `cd frontend && npm run build` — passed: Vite production build completed successfully.
