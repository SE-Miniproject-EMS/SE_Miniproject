# Issue #27 — User-facing email notifications

## What this patch changes

- Uses the existing notification outbox for registration confirmations, waitlist promotion, reminders, reschedules and cancellations.
- Adds a Resend email adapter (`NOTIFICATION_ADAPTER=resend`) using the provider's HTTPS API.
- Keeps the console adapter for local development only. Console output is explicitly a test delivery, not an email.
- Adds atomic worker claims (`claimedAt` / `claimToken`) to reduce concurrent duplicate dispatch.
- Retries failed deliveries up to three attempts with a short exponential delay.
- Sends a provider idempotency key derived from the existing notification `dedupeKey`, so a retry after an ambiguous network failure does not send the same email twice within Resend's idempotency retention period.
- Includes confirmed and waitlisted attendees in event-change notices.
- Adds `npm run dispatch:notifications` and an admin-only `POST /api/notifications/jobs/dispatch` endpoint.
- Adds provider/template tests that run without real credentials or network access.

## Configure real email delivery

1. Create a Resend account and verify a sender domain, or use Resend's test sender for initial sandbox testing where account restrictions allow.
2. Generate a Resend API key.
3. In `backend/.env`, configure:

```env
NOTIFICATION_ADAPTER=resend
RESEND_API_KEY=re_...
NOTIFICATION_FROM_EMAIL=Event Management System <notifications@your-verified-domain.example>
NOTIFICATION_TIME_ZONE=Asia/Kolkata
NOTIFICATION_BATCH_SIZE=50
```

Do not commit `.env` or paste API keys into source code. The sender address must be permitted by the Resend account; production should use a verified domain.

## Run it

```bash
cd backend
npm ci
npm test
npm run dev
```

After a registration, event change, or reminder run, pending outbox entries can be dispatched with:

```bash
npm run dispatch:notifications
```

An ADMIN can also call `POST /api/notifications/jobs/dispatch` with a valid bearer token. The existing `POST /api/notifications/jobs/reminders` queues reminders for events starting between 23 and 25 hours from the job's run time, then dispatches the queue.

## Scheduling

Run the reminder job at least daily (for example, every 15 minutes so the 23–25 hour window is not missed) and run the dispatch job frequently (for example, every 1–5 minutes). Example crontab entries from the repository root; adjust paths for your machine/server:

```cron
*/15 * * * * cd /absolute/path/SE_Miniproject/backend && npm run reminders >> /var/log/ems-reminders.log 2>&1
*/2 * * * * cd /absolute/path/SE_Miniproject/backend && npm run dispatch:notifications >> /var/log/ems-notifications.log 2>&1
```

Only one scheduler should be configured for each reminder cadence. The unique `dedupeKey` prevents repeated reminder creation for the same event/registration.

## Delivery semantics and limitations

- `SENT` means the configured adapter accepted the email request. For Resend, this means the provider API accepted the message; it does not prove that the recipient opened or read it. Configure provider webhooks/monitoring if delivery/bounce evidence is required.
- The console adapter logs a test delivery only. It must never be represented as real email delivery.
- Resend idempotency keys are provider-side duplicate protection for retries within the provider's documented retention window. The database claim token prevents two local workers from dispatching the same row concurrently; it is not a mathematical exactly-once guarantee across all failure modes.
- A successful paid-registration confirmation must only be enqueued after the payment provider has verified capture. Paid registrations remain blocked by the current registration flow until payment integration is merged and invokes the confirmation enqueue after verification.
- Email is implemented; SMS is not included. The issue can be satisfied through a configured email provider.
- Before closing the issue, configure a real sender and test a delivered confirmation, a 24-hour reminder, reschedule/cancellation notices, waitlist promotion, a provider outage/retry, and duplicate dispatch.

## Tests

`backend/test/notification-provider.test.js` verifies all notification templates, HTML escaping, Resend request configuration/idempotency, provider errors and missing-credential fail-closed behavior. These are adapter/unit tests and do not substitute for a live provider delivery test.
