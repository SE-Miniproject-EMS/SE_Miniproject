\# Issue #14 — Final Release Verification and Submission Checklist



\## Release Information



\- \*\*Project:\*\* Event Management System (EMS)

\- \*\*Repository:\*\* GGO4411/SE\_Miniproject

\- \*\*Release preparation branch:\*\* `feature/issue-14-final-demo-release`

\- \*\*Verified baseline commit:\*\* `838316c`

\- \*\*Sprint:\*\* Sprint 2



\## 1. Integration Verification



\- \[x] Latest remote `main` fetched and synchronized.

\- \[x] Issue #14 branch created from the verified `main` baseline.

\- \[x] Git working tree clean.

\- \[x] Branch comparison returned `0 0` at verification time.

\- \[ ] Recheck latest approved changes before final merge.



\## 2. Clean Setup and Testing



\- \[x] Node.js v24.19.0 available.

\- \[x] npm v11.17.0 available.

\- \[x] Backend dependencies installed using `npm ci`.

\- \[x] Frontend dependencies installed using `npm ci`.

\- \[x] Backend automated tests passed: 20/20.

\- \[x] Frontend production build succeeded using `npm run build`.

\- \[x] Application startup reported successful.

\- \[ ] Verify and document key application workflows in the browser.



\## 3. Demonstration Evidence



\- \[ ] Application demonstration video — deferred.

\- \[ ] Technical verification video — deferred.

\- \[ ] Add accessible demonstration links.



\*\*Status:\*\* Demonstration evidence remains outstanding under the original acceptance criteria.



\## 4. Known Limitations and Release Risks



1\. Backend dependency audit reported 5 vulnerabilities: 3 moderate and 2 high.

2\. Frontend dependency audit reported 4 vulnerabilities: 3 moderate and 1 high.

3\. npm flagged pending installation-script approvals for `sqlite3` and `esbuild`. Runtime impact requires review.

4\. Manual end-to-end browser verification has not yet been documented.

5\. Required demonstration videos have not yet been supplied.



The vulnerability counts reflect installation-time audit output. Individual advisories, affected dependency paths, and remediation options still require review.



\## 5. Final Submission Checklist



\- \[x] Repository synchronized at the verified baseline.

\- \[x] Automated backend tests passed.

\- \[x] Frontend production build passed.

\- \[ ] Review dependency audit findings.

\- \[ ] Verify core user workflows.

\- \[ ] Add required video links or obtain an explicit waiver.

\- \[ ] Confirm final release documentation.

\- \[ ] Create and review the Issue #14 pull request.

\- \[ ] Merge approved release changes.

\- \[ ] Close Issue #14 after all acceptance criteria are satisfied.



\## Release Decision



\*\*Status: Pending final approval\*\*



The project has passed automated verification and build checks. Outstanding demonstration evidence, manual workflow verification, and dependency review must be addressed or explicitly accepted before the release is declared complete.



