# Sprint 1 Demo and Deviation Record

Use this as the demo run sheet and record only what the team observes in its final environment. Sprint 1 focused on account access and event management.

## Sprint 1 requirement traceability

| SRS area | Implementation reference | Current evidence / coverage |
| --- | --- | --- |
| REQ-1 Registration | `backend/src/controllers/authController.js`; `frontend/src/pages/Register.jsx` | `backend/test/auth-api.test.js` covers registration, duplicate email, and password hashing. |
| REQ-2 Email verification | `backend/src/controllers/authController.js` | Verification endpoint and verified-login gate are implemented. Test setup follows the console link before authenticated flows; the suite does not yet assert that an unverified login is rejected. |
| REQ-3 Failed-login lockout | `backend/src/controllers/authController.js` | Five-attempt / 15-minute logic is implemented; no dedicated lockout test is currently present. Rehearse the behavior and record the result. |
| REQ-4 Roles and access control | `backend/src/middleware/auth.js`; `backend/src/routes/` | `backend/test/auth-api.test.js` covers role restrictions; `backend/test/event-api.test.js` covers event authorization and ownership. |
| REQ-5, REQ-8 Event create and capacity validation | `backend/src/controllers/eventController.js`; `frontend/src/pages/CreateEvent.jsx` | `backend/test/event-api.test.js` covers create, required fields, invalid capacity, and event lifecycle. |
| REQ-6, REQ-7 Event edit/cancel and ownership | `backend/src/controllers/eventController.js`; `frontend/src/pages/EditEvent.jsx`; `frontend/src/pages/ManageEvents.jsx` | Owner restrictions and event lifecycle are covered. Notifications to registrants on cancellation/rescheduling are not implemented because event registration is outside this Sprint 1 slice. |
| REQ-9 Upcoming event discovery | `backend/src/controllers/eventController.js`; `frontend/src/pages/Events.jsx` | Public listing filters to upcoming published events and sorts by start time. |
| REQ-10 Search and filters | `backend/src/controllers/eventController.js`; `frontend/src/pages/Events.jsx` | Search, category, venue/location, date filters, and pagination are implemented. Existing API coverage includes filters; dedicated pagination/UI tests are not present. |

## Demo preparation

1. Start the backend and frontend using the commands in the repository README.
2. Register an organizer account. Open the backend terminal and follow the development verification link printed for that account.
3. Sign in as the organizer and create an event with a future start/end time, venue, positive capacity, and category. Confirm it is saved as a draft.
4. Edit the draft and publish it. Confirm it appears in the public event list.
5. Demonstrate event search, category, venue/location, and date filters. If there are more than nine matching events, show Previous/Next pagination.
6. Open event details. Sign in as an attendee if useful and show that organizer-only event actions are protected.
7. Return as the owning organizer, cancel the event, and confirm it is no longer available in public discovery.
8. Capture the working flow in the required short demo video and save the video in the repository or agreed course submission location.

## Known limitations to disclose

| Area | Current behavior | Impact / deviation |
| --- | --- | --- |
| Email verification delivery | Verification is enforced, but the link is printed in the backend console. | No real email is sent; demo requires access to the backend terminal. Configure an email provider before production use. |
| Test coverage gaps | CI runs the current backend integration suite and frontend build. | Lockout behavior, rejection of unverified login, and pagination do not each have dedicated assertions; record any manual rehearsal result. |
| Cancellation side effects | Cancellation changes event status. | Attendee notifications and refund processing are not implemented in this Sprint 1 slice. |
| Future product modules | Attendee registration to events, payment, waitlist, check-in/QR, feedback, and reporting are not part of this demo flow. | Present as remaining roadmap scope; do not show them as completed functionality. |
| Deployment and scale | The repository uses a local SQLite development database. | Production hosting, shared database operations, load testing, and deployment hardening remain separate work. |

## Observed deviations to fill in after rehearsal

| Requirement / acceptance point | Expected | Observed result | Deviation, impact, and follow-up | Evidence |
| --- | --- | --- | --- | --- |
|  |  |  |  |  |
|  |  |  |  |  |
|  |  |  |  |  |

## Demo evidence checklist

- [ ] Video recorded and saved to the agreed location.
- [ ] Each Sprint 1 acceptance point was rehearsed.
- [ ] Observed failures or differences were entered in the deviation table.
- [ ] Team agreed which deviations are bugs, environment issues, or deferred scope.
- [ ] Pull requests and linked backlog issues reflect the work actually demonstrated.
