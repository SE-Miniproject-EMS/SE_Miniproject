# Architecture Verification: Maintainability and Scalability

**Issue:** [#35 — Verify maintainability and scalability architecture NFRs](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/35)  
**SRS traceability:** NFR-MAINT-01, NFR-SCAL-01  
**Review baseline:** `main` at `6d5feae057e713ff5b270b8db2b23a892b476987` (7 November 2026).  
**Scope:** architecture inspection and recommendations. This document does not claim that the future architecture has been implemented or load-tested.

## 1. Executive summary

The current Event Management System is a layered full-stack prototype:

- React/Vite provides the browser interface.
- Express routes and middleware expose the API and enforce authentication/role checks.
- Controllers coordinate application behavior and use Sequelize models.
- SQLite is the local development and CI-test database.
- The backend includes User, Event, Session, Registration, Notification and Feedback persistence.
- Free-event registration, capacity reservation, FIFO waitlisting, attendee cancellation, one-use ticket tokens, check-in and feedback API flows are present.
- Notification records are queued in the database; the development adapter writes test-delivery output to the backend console. No production email/SMS provider is configured.
- No real payment gateway, payment/refund persistence, production deployment or multi-instance runtime is included in this baseline.

This is a reasonable starting point for a course prototype. The main maintainability gap remains **controller-to-model coupling**. The registration controller contains transaction coordination and business rules directly, while the notification service provides only a partial service boundary. A consistent application-service/repository layer is not established across domains, so business rules are harder to test independently of HTTP and SQLite.

SQLite remains suitable for local development and isolated tests, but it is **not evidence of a shared transactional database for horizontally scaled application instances**. Separate local database files would diverge; this repository does not currently contain a PostgreSQL deployment or multi-instance configuration.

**Conclusion:** NFR-MAINT-01 is partially satisfied: frontend/API, routes, controllers, models and middleware have useful boundaries, but a consistent domain service boundary is still missing. NFR-SCAL-01 is not demonstrated: there is no shared production database or multi-instance deployment. The recommended direction remains a modular monolith with explicit application services/repositories and a shared PostgreSQL database. Microservices are not recommended at this project's current scale.

## 2. As-built architecture (reviewed baseline)

### 2.1 Components and responsibilities

| Layer / component | Current responsibility | Observed boundary |
|---|---|---|
| Browser UI | React 18/Vite pages, authentication context and Axios API client | Separate frontend application communicating over HTTP/JSON |
| HTTP/API | Express application, JSON parsing, CORS, health/auth/event/registration/feedback/notification/example routes and error handling | Routes define endpoint and middleware composition |
| Authentication | Auth routes/controller, bcrypt password hashing, email-verification token, JWT issuance and current-user route | Controller owns login flow; server-side idle-session tracking is persisted in the Session model |
| Event management | Event routes/controller; create, list/search, detail, edit, publish and cancel | Controller validates and coordinates Event model operations |
| Registration/check-in | Registration routes/controller; free registration, capacity transaction, FIFO waitlist, cancellation, one-use ticket tokens and check-in | Registration controller coordinates multi-record SQLite transactions directly |
| Notifications | Notification model and service; enqueue/deduplicate notices and console test-delivery adapter | Queue record creation has a service boundary; no external email/SMS provider is configured |
| Feedback | Feedback routes/controller/model for checked-in attendee submissions and restricted organizer/admin views | Separate domain endpoints/model; no full attendee feedback prompt UI |
| Authorization | JWT authentication plus role/ownership middleware used by protected routes | Reusable middleware boundary; a full endpoint-by-endpoint permission matrix remains unverified |
| Persistence | Sequelize models for User, Session, Event, Registration, Notification and Feedback | Controllers access Sequelize models directly in several domains; no consistent repository layer |
| Database | SQLite file selected through `DATABASE_FILE` (default `./dev.db`) | Local, file-based persistence; not a shared multi-instance database |
| CI | GitHub Actions syntax checks, backend tests and frontend build | Build/test automation; not runtime scalability evidence |

Current model relationships include User-to-Event ownership, Event-to-Registration, and Registration-to-Event. Payment/Refund models and a real gateway integration are not present on this reviewed `main` baseline. QR token check-in exists, but QR image generation/camera scanning UI does not.

### 2.2 Request/data flow

1. The browser sends an HTTP/JSON request to the Express API.
2. Express routes compose authentication and role middleware for protected endpoints.
3. The controller validates input and coordinates the use case; registration operations use an explicit SQLite IMMEDIATE transaction.
4. Controllers read/write Sequelize models. Registration capacity uses a conditional update and the attendee/event pair has a uniqueness constraint.
5. Sequelize persists to the configured SQLite file. Authenticated sessions are represented by rows in the Session table and their idle deadlines are advanced by authentication middleware.
6. Registration/event changes can enqueue deduplicated Notification rows within the relevant transaction; the current development adapter logs test-delivery output rather than sending real email/SMS.
7. The controller returns an HTTP/JSON response to the browser.

The diagram source is `docs/diagrams/as-built-architecture.dot`.

### 2.3 Maintainability assessment — NFR-MAINT-01

| Criterion | Finding | Assessment |
|---|---|---|
| UI/API separation | React/Vite frontend is separate from Express backend and uses an HTTP API | Satisfied |
| Endpoint boundary | Express routes separate endpoint definitions and middleware from controller functions | Satisfied |
| Authentication/authorization reuse | JWT and role/ownership checks are implemented in middleware | Partially satisfied; new modules must consistently reuse it |
| Business-logic isolation | Controllers contain endpoint behavior and access Sequelize models directly; a consistent service/use-case layer is not established | Gap |
| Persistence abstraction | Sequelize models centralize schema/mapping, but controllers are coupled to Sequelize model APIs | Partial |
| Independent unit testing | HTTP integration tests exercise real routes and persistence; isolated business-service tests are limited by the absence of a distinct service layer | Gap / improvement |
| Module boundaries | Auth and event route/controller/model files are separated by domain | Useful starting structure; domain services and repository interfaces are not yet explicit |

**Maintainability risks**

- Registration is already implemented in a separate controller, but it coordinates capacity, waitlist and cancellation transactions directly against Sequelize models. Moving these invariants into a focused application service would improve isolated testing and reduce controller coupling.
- Repeating authorization and event-state rules across endpoints can lead to inconsistent access checks.
- Direct model access makes it harder to replace SQLite, introduce transaction boundaries or test business rules without a database.
- Notification records are queued through a service, but delivery is currently console-only. A production adapter and durable worker/retry policy are still required; external delivery must not undo a committed registration.
- As new domains are added, a single large controller or generic utility module would create hidden coupling between unrelated features.

## 3. Recommended maintainable architecture

Adopt a **modular monolith**: one deployable backend, organized into domain modules, with clear internal boundaries. This avoids the operational overhead of microservices while supporting independent testing and later extraction if genuinely needed.

### 3.1 Recommended request flow

`HTTP route → middleware → controller → application service/use case → repository/model → database`

- **Routes:** HTTP paths, methods, middleware composition and request/response contract only.
- **Middleware:** authentication, role/ownership authorization, rate limits, request correlation and common validation.
- **Controllers:** translate HTTP input into service calls and translate service outcomes into HTTP status/JSON responses. Avoid business rules and direct SQL/model orchestration.
- **Services/use cases:** enforce business rules and coordinate transactions. Examples: `RegisterForEvent`, `CancelRegistration`, `IssueTicket`, `CheckInAttendee`, `SubmitFeedback`, `PublishEvent`.
- **Repositories/data access:** isolate Sequelize queries and persistence-specific behavior behind domain-oriented methods. Use transaction objects explicitly for multi-record operations.
- **Models:** define persistence schema, associations, indexes and constraints. Do not make models responsible for sending email or handling HTTP.
- **Adapters/integrations:** payment provider, email/SMS provider, QR encoding, job queue and clock are external boundaries injected into services.

Suggested directory organization (illustrative target, not a description of existing files):

```text
backend/src/
  app.js
  routes/
  middleware/
  modules/
    auth/
      auth.routes.js
      auth.controller.js
      auth.service.js
      auth.repository.js
      auth.model.js
    events/
      events.routes.js
      events.controller.js
      events.service.js
      events.repository.js
      events.model.js
    registrations/
      registrations.routes.js
      registrations.controller.js
      registrations.service.js
      registrations.repository.js
      registration.model.js
    tickets/
    feedback/
    notifications/
  infrastructure/
    database/
    queue/
    email/
    payments/
    logging/
  shared/
    errors/
    validation/
```

The exact filenames can follow the repository's established naming convention. Do not create empty layers just to match this diagram; introduce a service/repository when a domain has behavior that benefits from the boundary.

### 3.2 Maintainability rules for future changes

1. Keep controllers thin; no multi-step business workflows or direct provider calls in controllers.
2. Put each domain's invariants in one service/use case. For example, registration capacity and duplicate-registration rules must not be reimplemented independently in multiple routes.
3. Use database transactions for state changes spanning registration, capacity/waitlist and ticket state. Enforce important uniqueness/integrity rules with database constraints as well as application validation.
4. Pass a transaction explicitly through repository operations that must commit or roll back together.
5. Keep provider SDKs behind adapters so tests can use deterministic fakes.
6. Use dependency injection or explicit constructor/function parameters for repositories, provider clients and clocks; avoid hidden global mutable state.
7. Keep API contract tests at the HTTP boundary and add focused service tests for business rules.
8. Use schema migrations for shared/production databases. Do not rely on automatic schema synchronization as the production migration strategy.
9. Keep authorization checks server-side and centralize reusable policy checks.
10. Update API documentation, architecture diagrams and tests when a domain boundary changes.

## 4. Scalability assessment — NFR-SCAL-01

### 4.1 Current limitation

The reviewed application uses a local SQLite database file. This is acceptable for development and isolated test environments, but it is not evidence of horizontal scalability.

If two backend instances each use their own local `dev.db`, each instance sees a different set of users/events/registrations. A load balancer could send consecutive requests to different databases, producing inconsistent results. A shared SQLite file on a network filesystem is not the recommended solution for concurrent multi-instance transactional workloads.

The current event-search benchmark is a local single-environment observation only. It does not prove production throughput, high availability or horizontal scaling. The registration implementation uses SQLite IMMEDIATE transactions, a conditional capacity update and a uniqueness constraint; the integration suite covers six simultaneous last-seat attempts. The SRS target of 500 concurrent registration attempts has **not** been run, and no paid-registration persistence or 500-attempt integrity result is available.

### 4.2 Recommended target deployment

Use stateless backend replicas behind a load balancer/reverse proxy, all connected to the same managed PostgreSQL database. Add a queue and worker process for asynchronous work. The target diagram source is `docs/diagrams/target-scalable-architecture.dot`.

| Component | Recommended responsibility | Why it is needed |
|---|---|---|
| Load balancer / reverse proxy | Distribute HTTP traffic across healthy API replicas; terminate TLS | Allows multiple API instances and removes one process as a throughput bottleneck |
| Stateless Express API replicas | Serve requests; hold no authoritative user/event/registration state in local memory or local files | Any replica can serve any request |
| Managed PostgreSQL | Shared source of truth for users, events, registrations, capacity, tickets and feedback | Shared transactional state, constraints, row locking and indexes |
| Queue (e.g. Redis-backed queue or managed queue) | Store asynchronous notification/reminder jobs | Keeps email/SMS latency and provider outages out of the registration request path |
| Worker replicas | Deliver notifications, retry transient failures and run scheduled reminder jobs | Worker count can scale independently from API request traffic |
| Shared object storage (if needed) | Store uploaded event assets, not local container disk | Assets remain available across API replicas |
| Centralized logs/metrics | Correlate requests, database latency, queue depth, errors and worker retries | Makes scaling and reliability measurable |
| Secrets/configuration manager | Supply DB/provider credentials and JWT secrets to each instance | Avoids hard-coded secrets and instance-specific configuration |

**Important:** Redis is optional for the first scalable version. It should be introduced for queueing, caching or distributed rate limiting only when the corresponding requirement exists. PostgreSQL remains the authoritative store for registrations and ticket/check-in state; cache data must never be the only source of truth for capacity or payment status.

### 4.3 Registration integrity under concurrency

Registration is now implemented for free events. The current controller starts an SQLite IMMEDIATE transaction and uses a conditional update of `Event.seatsTaken` as the capacity gate; the (eventId, attendeeId) unique index prevents duplicate registrations. Tests cover FIFO promotion, cancellation cutoff and six simultaneous requests for the last seat. This is functional verification for a small local concurrency case, **not** evidence that the SRS target of 500 simultaneous registration attempts is met. Any shared/multi-instance deployment must protect capacity in one shared database, not with process-local state.

Recommended approach:

1. Start a database transaction.
2. Lock the target event row (or use a carefully designed atomic conditional update).
3. Check event state, registration window and remaining capacity inside the transaction.
4. Enforce one registration per attendee/event with a database unique constraint.
5. Create the confirmed registration or waitlist entry.
6. Commit the transaction.
7. Publish an outbox event in the same transaction; a worker later delivers notifications.

For PostgreSQL, a row-level lock (`SELECT ... FOR UPDATE`) or atomic conditional update can serialize capacity decisions for one event. A unique constraint such as `(event_id, attendee_id)` prevents duplicates even if requests race. A transactional outbox avoids the failure mode where the database commit succeeds but the process crashes before publishing a notification job.

Do not decrement an event capacity counter and create a registration in separate unprotected operations. Do not use a process-local mutex: it cannot coordinate multiple API replicas.

### 4.4 Session, files and process state

- JWTs include an identifier and the current application also persists idle-session deadlines in the Session table. This is not purely stateless authentication; all API replicas must consult the same authoritative session store/database for session validity and idle-time updates.
- Do not store authoritative sessions, rate-limit counters, locks or job state only in process memory if those features must work across replicas. Use the shared database or another shared store appropriate to the requirement.
- Do not store user uploads, generated tickets or durable exports only on a container's local filesystem. Use object storage or another shared durable store if/when those files are introduced.
- Ensure each replica has the same application version/configuration and uses graceful shutdown/readiness checks.

## 5. Prioritized recommendations

| Priority | Recommendation | Reason | Completion evidence |
|---|---|---|---|
| P0 | Keep SQLite explicitly limited to local development and isolated tests | Prevent false claims that the current prototype is horizontally scalable | README/SAD state the limitation; test DBs remain isolated |
| P0 | Introduce domain services for registration/capacity before adding dependent features | Registration is the highest-risk shared business workflow and will be used by payment, ticketing and notifications | Service-level tests; controllers no longer orchestrate registration invariants |
| P0 | Add PostgreSQL configuration and schema migrations before multi-instance deployment | All replicas need one shared transactional source of truth | Migration test on clean DB and upgrade path; integration suite passes against PostgreSQL |
| P1 | Add transactional capacity enforcement and uniqueness constraints | Prevent overbooking and duplicate registrations under concurrent requests | Concurrency test with 500 simultaneous attempts; confirmed registrations never exceed capacity |
| P1 | Make API replicas stateless and deploy at least two behind a load balancer | Demonstrates requests can be served by more than one instance | Deployment test confirms both replicas serve traffic and share consistent data |
| P1 | Add transactional outbox + queue/worker for notifications | Decouples provider failures and slow delivery from user-facing transactions | Retry, idempotency and worker-restart tests |
| P1 | Add structured logs, request IDs, metrics and health/readiness checks | Needed to diagnose latency and failures under load | Dashboard/metrics and documented alert thresholds |
| P2 | Add shared cache only for measured hot reads or distributed coordination | Avoid premature complexity and stale authoritative data | Load profile demonstrates bottleneck; cache invalidation and fallback tests |
| P2 | Consider read replicas or partitioning only after measurement | More advanced scaling is unnecessary until the shared database is demonstrably saturated | Database metrics and repeatable load tests justify the change |

## 6. Verification plan

The following checks are proposed. They are **not claimed as completed** by this architecture review.

| Test ID | Verification | Pass condition / evidence |
|---|---|---|
| ARCH-01 | Inspect route/controller/service/repository boundaries for each domain | Controllers contain HTTP mapping only; business invariants are in services; persistence access is isolated |
| ARCH-02 | Unit-test domain services using fake repositories/adapters | Business rules can be tested without starting Express or connecting to a real provider |
| ARCH-03 | Run backend integration tests against a clean PostgreSQL database using migrations | Migrations apply from empty state; API tests pass; no reliance on SQLite-specific behavior |
| ARCH-04 | Run two or more API replicas behind a load balancer against the same PostgreSQL database | Requests handled by different replicas observe the same committed user/event/registration state |
| ARCH-05 | Run 500 concurrent registration attempts against an event with known capacity | Confirmed count never exceeds capacity; no duplicate attendee/event records; all outcomes are consistent |
| ARCH-06 | Kill/restart an API replica during traffic | Requests continue through healthy replica(s); committed data remains intact |
| ARCH-07 | Stop a notification worker/provider temporarily and restart it | Jobs remain durable, retry safely and do not create duplicate notifications |
| ARCH-08 | Observe load test metrics | Record throughput, p50/p95/p99 latency, error rate, CPU/memory, DB connection saturation and queue depth |
| ARCH-09 | Test readiness and graceful shutdown | Load balancer stops routing to unready/shutting-down instances; in-flight requests drain within configured timeout |

### Suggested load-test report fields

Record the environment (instance type/count, Node version, DB version/size, network region), dataset size, request mix, concurrency, duration, warm-up period, throughput, p50/p95/p99 latency, HTTP error rate, CPU/memory, DB connections/lock waits and queue depth. Preserve raw results and test scripts with the report. A single local run must not be described as a production SLA.

## 7. NFR conclusion

| NFR | Current conclusion | Evidence needed to claim fully satisfied |
|---|---|---|
| NFR-MAINT-01 — modular separation of API, business logic and data layers | **Partially satisfied.** Frontend/API, routes, domain controllers, middleware and models are separated. However, registration transaction/business rules are coordinated directly in the controller and there is no consistent application-service/repository layer across domains. | Extract focused use-case/service boundaries where useful; add service-level tests and keep the as-built diagram limited to implemented components. |
| NFR-SCAL-01 — horizontal backend scaling for registration spikes | **Not demonstrated.** The current implementation uses a local SQLite file, and there is no shared production database, multi-instance deployment or 500-attempt registration load test. The six-request last-seat integration test verifies only a small functional concurrency case. | Shared PostgreSQL, stateless API replicas behind a load balancer, shared session state, a concurrency-safe registration transaction, and repeatable 500-attempt plus multi-instance load-test evidence. |

## 8. Scope and implementation boundary

This issue is an architecture verification/documentation task. The recommendations above describe a target architecture; they do not mean PostgreSQL, Redis, a queue, workers, Kubernetes, or multiple API replicas have already been deployed. The project should implement these incrementally when the corresponding product features and deployment environment are ready.

For the current project scale, prefer a **modular monolith + shared relational database** over microservices. This preserves a simple development workflow while creating clear boundaries and a credible path to horizontal scaling.
