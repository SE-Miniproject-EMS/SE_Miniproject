# Availability and reliability assessment

**Requirement:** NFR-REL-01 — target 99% uptime during active event-registration windows.

**Historical assessment: NOT MEASURED / NOT VERIFIED.** At the original assessment, the project had local development only and no deployed service, independent monitor, or approved availability measurement contract. Subsequent Render deployment preparation is recorded in [the deployment report](render-deployment.md). The later availability observation was stopped at the owner's request; no uptime percentage is claimed. See [the current evidence index](PROJECT_EVIDENCE_INDEX.md) for the latest scope.

## Current health signal and limits

The backend exposes two distinct signals in `backend/src/server.js`. `GET /api/health` is a liveness endpoint that confirms the Express process responds. `GET /api/health/ready` calls `sequelize.authenticate()` and returns HTTP 200 with `{"status":"ready","checks":{"database":"ok"}}` only when the configured database connection succeeds; it returns HTTP 503 with a sanitized database-unavailable result otherwise. The integration suite verifies both signals against its disposable SQLite test database. Readiness still does not exercise an end-to-end registration transaction, payment flow, or email delivery.

The reviewed local architecture uses one backend process and a local SQLite database. The repository does not provide an independently hosted uptime monitor, a production deployment environment, or a collected time series for active registration windows. Local development and a one-time health request cannot establish the 99% target.

## Measurement contract decisions requiring team approval

Before measurement begins, agree and record:

1. Which events/windows count as active registration windows, and the measurement period and exact start/end boundaries for each.
2. The service boundary and user-visible availability probe. Decide whether the probe must verify database readiness and a representative registration read/write path, and how often it runs.
3. What counts as downtime, including partial failure, registration errors, latency, monitoring gaps, and the outage start/end rule.
4. Whether approved planned maintenance is included in eligible time or excluded, and how approved maintenance is recorded.
5. The evidence source, raw-data retention, review owner, and the calculation rule. A possible calculation is observed eligible up time divided by eligible total observation time multiplied by 100, but the team must approve eligibility and outage classification before using it.
6. Which deployed environment is representative of the project and who owns monitoring, recovery, and incident records.

These are unresolved decisions, not assumptions. Do not choose a measurement window or thresholds silently.

## Evidence and recovery record

| Item | Current finding |
|---|---|
| Environment | Local development only; no deployed target was supplied. |
| Liveness probe | `GET /api/health` confirms that the Express process responds. |\n| Readiness probe | `GET /api/health/ready` verifies Sequelize can authenticate to the configured database; covered by an integration test. It does not exercise a registration write or external provider. |
| Monitoring history | None supplied or recorded for an active registration window. |
| Availability calculation | Not possible until the measurement contract is approved and representative observations exist. |
| Recovery evidence | No deployment-level failover, restore-time, backup-restore, or incident-recovery exercise is recorded in this assessment. A single local process and SQLite file provide no demonstrated high availability. |
| Conclusion | 99% target **not verified**; no claim of achieved uptime. |

For a later approved deployment exercise, retain probe timestamps and results, deployment/configuration identity, incident and maintenance intervals, database health, and any recovery actions. Calculate only after the approved measurement period is complete, and report monitoring gaps rather than treating them as uptime.

## Follow-up and verification status

- Team approval of the measurement contract and access to a representative deployed environment are required before a meaningful availability measurement. Configure the external monitor to use `/api/health/ready` for database-aware readiness and retain `/api/health` for process liveness.
- **Status:** blocked on deployment and team decisions; NFR-REL-01 remains **not verified**. This assessment documents the present limitation and is not evidence of 99% availability.
