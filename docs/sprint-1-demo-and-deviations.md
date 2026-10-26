# Sprint 1 Demo and Deviation Record

Use this as the demo run sheet and record only what the team observes in its final environment. Sprint 1 focused on account access and event management.

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
