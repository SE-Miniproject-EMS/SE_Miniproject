# Issue #14 — Final Release Verification and Submission Checklist

## Release Information

- **Project:** Event Management System (EMS)
- **Repository:** GGO4411/SE_Miniproject
- **Release preparation branch:** `feature/issue-14-final-demo-release`
- **Verified baseline commit:** `838316c`
- **Sprint:** Sprint 2

## 1. Integration Verification

- [x] Latest remote `main` fetched and synchronized at the time of verification.
- [x] Issue #14 branch created from the verified `main` baseline.
- [x] Git working tree was clean after the initial documentation commit.
- [x] Branch comparison returned `0 0` at verification time.
- [ ] Recheck latest approved changes before final merge.

## 2. Clean Setup and Testing

- [x] Node.js v24.19.0 available.
- [x] npm v11.17.0 available.
- [x] Backend dependencies installed using `npm ci`.
- [x] Frontend dependencies installed using `npm ci`.
- [x] Backend automated tests passed: 20/20.
- [x] Backend automated tests passed again after dependency updates: 20/20.
- [x] Frontend production build succeeded using `npm run build` before the backend dependency updates.
- [x] Application startup reported successful.
- [ ] Verify and document key application workflows in the browser.

## 3. Demonstration Evidence

- [ ] Application demonstration video — deferred.
- [ ] Technical verification video — deferred.
- [ ] Add accessible demonstration links or obtain an explicit waiver from the project team.

**Status:** Demonstration evidence remains outstanding under the original acceptance criteria.

## 4. Known Limitations and Release Risks

1. **Backend dependencies:** The initial audit reported 5 vulnerabilities (3 moderate, 2 high). After running `npm audit fix`, the remaining count is 2 moderate vulnerabilities involving `uuid` and `sequelize`.

2. **Remaining backend vulnerabilities:** The audit suggests a forced remediation that would introduce a potentially breaking Sequelize version change. This has not been applied.

3. **Frontend dependencies:** The audit reported 4 vulnerabilities (3 moderate, 1 high), involving `esbuild`, `vite`, `react-router`, and `react-router-dom`. Suggested automated fixes involve breaking dependency upgrades and have not been applied.

4. **Installation scripts:** npm continues to report pending installation-script approval for `sqlite3@6.0.1`. Its runtime impact requires further review.

5. **Manual verification:** The backend automated test suite passes, but manual end-to-end browser verification has not yet been documented.

6. **Demonstration materials:** Required demonstration videos have been deferred and remain outstanding.

## 5. Final Submission Checklist

- [x] Repository synchronized at the verified baseline.
- [x] Automated backend tests passed.
- [x] Frontend production build passed.
- [x] Backend dependency fixes applied and automated tests rerun successfully.
- [x] Dependency audit findings reviewed and outstanding risks documented.
- [ ] Verify core application workflows manually.
- [ ] Add required video links or obtain an explicit waiver.
- [ ] Confirm final release documentation.
- [ ] Recheck integration with the latest `main` branch.
- [ ] Create and review the Issue #14 pull request.
- [ ] Merge approved release changes.
- [ ] Close Issue #14 after all acceptance criteria are satisfied.

## Release Decision

**Status: Pending final approval**

The Event Management System has passed backend automated verification and frontend production build checks. Compatible backend dependency updates reduced the reported vulnerabilities from 5 to 2 without breaking the existing 20 automated tests.

Outstanding dependency risks, manual browser verification, demonstration evidence, and final integration review must be addressed or explicitly accepted before declaring the release complete.