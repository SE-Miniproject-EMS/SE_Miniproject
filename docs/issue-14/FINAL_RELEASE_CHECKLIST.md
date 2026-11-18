# Issue #14 - Final Release Verification and Submission Checklist

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

- [x] [Application demonstration video](application-demo.webm) - organizer event lifecycle and public event experience.
- [x] [Technical verification video](technical-verification.webm) - health endpoint, verification-gated login, role restrictions, and mobile layout.

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
- [x] Pull request #45 opened for review.
- [ ] Release evidence merged to `main`.
- [ ] Issue #14 closed after the PR is merged.

## Release decision

**Status: Awaiting PR review and merge.** Verification and demo materials are ready in [PR #45](https://github.com/SE-Miniproject-EMS/SE_Miniproject/pull/45). Remaining dependency audit findings are listed above for follow-up.


---

## Assessor evidence update — 18 November 2026

The checklist above is the original Issue #14 verification record from 30 October 2026. Its 20-test result, baseline SHA and “awaiting PR review” release note are historical and are not the latest repository state.

Current integrated evidence:
- [PR #48 CI run #42747239410](https://github.com/SE-Miniproject-EMS/SE_Miniproject/actions/runs/42747239410): **55 backend tests passed, 0 failed**; backend syntax validation and frontend production build passed.
- Later merged changes added mock checkout/refunds, session-model startup integration, event-cancellation cleanup for waitlisted records and broader security/RBAC tests.
- The recorded browser E2E artifacts still refer to the earlier event-management/verification/authorization/mobile flow; they are not a full browser automation report for every new feature.
- A real payment gateway, external email/SMS delivery, QR-camera scanner UI, full feedback prompt UI, dashboards/CSV, production deployment, uptime measurement and the measured 500-registration workload remain limitations.

Current source-of-truth links:
- [Implementation Baseline](../IMPLEMENTATION_BASELINE.md)
- [Testing and Results](../TESTING_AND_RESULTS.md)
- [Testing and Coverage](../TESTING_AND_COVERAGE.md)
- [Operations Runbook](../OPERATIONS_RUNBOOK.md)
- [Security Controls](../SECURITY_CONTROLS.md)
- [Issue/PR and review log](../project-management/GITHUB_ISSUE_PR_LOG.md)

The 18 November assessor-evidence branch adds a coverage command and a CI artifact upload. **Line/branch/function percentages are pending the first successful workflow run on that branch** and must be read from that run's coverage artifact, not inferred from test counts.
