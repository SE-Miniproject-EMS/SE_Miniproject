# Free Render demo deployment and availability monitoring

This deployment creates a fresh PostgreSQL database for an academic demo. Existing local SQLite data stays on the local machine. The Render Blueprint uses free plans. Render Free PostgreSQL expires 30 days after creation. Free web services can sleep or restart, so retain these events in the availability evidence.

## Deploy the reviewed branch

1. In Render, choose New → Blueprint and connect the SE-Miniproject-EMS/SE_Miniproject repository. Review GitHub permissions and select only this repository where possible.
2. Select the branch containing render.yaml. Confirm the API and PostgreSQL plans show Free and the frontend shows Static Site. Check the displayed cost before creating resources.
3. Supply CORS_ORIGIN as the frontend HTTPS origin and VITE_API_URL as the backend HTTPS URL followed by /api. If the URLs are not assigned yet, use temporary values, create the resources, then replace them with the actual URLs. Redeploy the frontend after changing VITE_API_URL because Vite embeds it at build time.
4. The Blueprint generates JWT_SECRET and EMAIL_VERIFICATION_SECRET. Keep these stable across deployments. DATABASE_URL references the fresh Render database through its internal connection string.
5. Open the API /api/health/ready URL. Expect HTTP 200 and {"status":"ready","checks":{"database":"ok"}}. Check the frontend routes /login, /events and /dashboard, including a direct browser refresh.
6. Create fresh demo organizer and attendee accounts. Account verification still uses the existing server-log workflow. Copy the verification link from the private Render API logs and open it. The backend uses RENDER_EXTERNAL_URL to generate the hosted link. Avoid including verification links in screenshots or public evidence.
7. Test a free event with capacity one, attendee registration, waitlisting and cancellation/promotion. Restart or redeploy the API and verify the event and registration records remain in PostgreSQL.

Production mode preserves the existing restriction on mock paid checkout. Use free events for the hosted registration demonstration. Configure Resend separately for real notification delivery. The PostgreSQL configuration does not migrate SQLite data.

## Database connections

DATABASE_URL enables PostgreSQL. Without DATABASE_URL, local development continues to use DATABASE_FILE and SQLite. Render's internal PostgreSQL URL is used inside Render. For an external PostgreSQL connection that requires TLS, set DATABASE_SSL=true. Certificate verification stays enabled.

PostgreSQL registration, cancellation and payment transactions use a database advisory transaction lock shared by API instances, preserving serialized capacity/refund operations. SQLite keeps the existing local write queue. Session idle expiry uses the database clock for each dialect and retains the JWT expiry cap.

## Proposed measurement contract requiring team approval

Confirm the observation start/end times and which event registration windows count. A proposed academic exercise uses one-minute samples of the public /api/health/ready URL, a ten-second response timeout, maintenance included as downtime, and a separately hosted monitor. These are proposed measurement settings rather than existing SRS thresholds.

Readiness is UP only for HTTP 200 with status=ready and checks.database=ok. Failures and malformed responses count as DOWN. Missed intervals are UNKNOWN and prevent an unqualified 99% claim. Readiness exercises the database connection. Record a registration smoke test at the beginning and end of the window because this probe alone does not exercise a registration write or the frontend.

The script reports sample-based availability and a conservative percentage that treats missing samples as unavailable. For a final NFR conclusion, report the approved method, complete window, interval and outage classification. Do not interpret a short setup test as proof of 99% uptime.

## Run the monitor from another machine

Use Node 24 and keep the monitoring machine awake and connected. Run outside the hosted application so an API outage does not stop the monitor.

Example for a team-approved seven-day window, after replacing the API URL:

    node backend/scripts/monitor-availability.js https://YOUR-API.onrender.com/api/health/ready 60 10080 10 monitoring/ems-seven-days.jsonl

Arguments are URL, interval seconds, duration minutes, timeout seconds and output file. The script creates a JSONL observation log immediately and a .summary.json at normal completion. It refuses to overwrite an existing log. Keep the raw logs even if interrupted. Missing monitor coverage must be disclosed.

Record the frontend/backend URLs, deployed commit, UTC and local window boundaries, event IDs, probe interval/timeout, hosting tier, restarts, planned maintenance, observed incidents and recovery steps. Do not commit keys or personal data. Review the final results before claiming the availability target is verified.

## Recovery and lifecycle

If readiness fails, inspect Render deployment and application logs, database state and database expiry. Restore the last reviewed deployment if a code change caused the outage. Count actual recovery time in the measurement. Free database expiry requires a replacement demo database or a plan change approved by the team. Export any required demo evidence before expiry.

## Validation

The PostgreSQL Integration CI job uses a disposable PostgreSQL 16 service. Its test creates a new database, exercises the real HTTP API, and removes that database after the test. SQLite regression tests run separately. Review CI results for the deployment revision before using it for the observation window.
