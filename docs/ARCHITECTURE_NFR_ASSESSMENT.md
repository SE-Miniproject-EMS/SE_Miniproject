# Architecture Verification: Maintainability and Scalability

**Issue:** [#35 — Verify maintainability and scalability architecture NFRs](https://github.com/SE-Miniproject-EMS/SE_Miniproject/issues/35)  
**SRS traceability:** NFR-MAINT-01, NFR-SCAL-01  
**Cross-document NFR matrix:** [`docs/NFR_TRACEABILITY.md`](NFR_TRACEABILITY.md)
**Review baseline:** repository snapshot `476204cb491f9aa542dd1dc5510bf560d12ceb89`, dated 29 October 2026  
**Scope:** architecture inspection and recommendations. This document does not claim that the future architecture has been implemented or load-tested.

## 1. Executive summary

The current Event Management System is a small, layered full-stack application:

- React/Vite is the browser presentation layer.
- Express routes expose HTTP endpoints and controllers implement request handling and application behavior.
- Sequelize models provide persistence access.
- SQLite is the local development database.
- JWT authentication and role/ownership middleware protect relevant endpoints.

This is a reasonable starting point for a course prototype and is simpler to operate than a distributed system. However, the backend currently has **route/controller-to-model coupling**: the inspected implementation does not establish a distinct service/use-case layer between controllers and Sequelize models. As the system gains registration, capacity management, payment, ticketing, notifications and feedback, this will make business rules harder to reuse and test independently.

The current SQLite file is suitable for local development and isolated tests. It is **not a shared transactional database for multiple horizontally scaled application instances**. Running multiple API processes with separate local SQLite files would create divergent state; sharing one SQLite file across networked containers is not a safe scaling strategy.

**Conclusion:** NFR-MAINT-01 is partially satisfied by the existing separation of frontend, routes/controllers and models, but needs stronger business-logic boundaries. NFR-SCAL-01 is not demonstrated by the current deployment architecture. The recommended next step is a modular monolith with explicit services/repositories and a shared PostgreSQL database, deployed as stateless API replicas. A queue/worker should be added for asynchronous work when registration, notifications and reminders are implemented. Microservices are not recommended at this project's current scale.

## 2. As-built architecture (reviewed baseline)

### 2.1 Components and responsibilities

| Layer / component | Current responsibility | Observed boundary |
|---|---|---|
| Browser UI | React 18/Vite pages, authentication context and Axios API client | Separate frontend application communicating over HTTP/JSON |
| HTTP/API | Express application, JSON parsing, CORS, health/auth/event/example route mounting and error handling | Routes define endpoint and middleware composition |
| Authentication | Auth routes/controllers; password hashing, verification token and login behavior | Controller owns much of the request and authentication workflow |
| Event management | Event routes/controllers; create, list/search, detail, edit, publish and cancel behavior | Controller handles request validation/behavior and uses Sequelize models |
| Authorization | JWT authentication and role/ownership middleware | Reusable middleware boundary exists |
| Persistence | Sequelize `User` and `Event` models | Model layer exists, but controllers access models directly in the reviewed implementation |
| Database | SQLite file selected through `DATABASE_FILE` (default `./dev.db`) | Local, file-based persistence |
| CI | GitHub Actions syntax checks, backend tests and frontend build | Build/test automation; not a runtime scaling component |

The current model relationship is `User 1 → many Events` through `Event.organizerId`. The reviewed baseline does not contain registration, payment, ticket, notification or feedback persistence modules.

### 2.2 Request/data flow

1. The browser sends an HTTP request to the Express API.
2. Express routes select the endpoint and attach authentication/role middleware where required.
3. The controller validates request data and performs the endpoint's application behavior.
4. The controller reads/writes through Sequelize models.
5. Sequelize persists to the configured SQLite database file.
6. The controller returns an HTTP/JSON response to the browser.

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

- Adding registration and capacity logic directly to event controllers would mix HTTP concerns, capacity rules, transaction handling and persistence.
- Repeating authorization and event-state rules across endpoints can lead to inconsistent access checks.
- Direct model access makes it harder to replace SQLite, introduce transaction boundaries or test business rules without a database.
- Notifications and reminders should not be sent synchronously inside event/registration request handlers; external delivery failures should not undo a committed registration.
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

The current benchmark evidence for event search/listing is a local single-environment observation only. It does not prove production throughput, 500 concurrent registration integrity, high availability or horizontal scaling. Registration itself was absent from the reviewed baseline and therefore could not be load-tested.

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

When registration is implemented, capacity must be protected by the database, not by an in-memory counter in one API process.

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

- JWT authentication can support stateless API replicas if all replicas validate tokens using the same securely managed signing/verification key and consistent issuer/audience/expiry configuration.
- Do not store authoritative sessions, rate-limit counters, locks or job state only in process memory if those features must work across replicas. Use a shared store or a token-based design appropriate to the requirement.
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
| NFR-MAINT-01 — modular separation of API, business logic and data layers | **Partially satisfied.** Frontend/API and routes/controllers/models are separated, but a consistent application-service boundary is not established and controllers are coupled to Sequelize models. | Domain service/repository boundaries, focused service tests, and updated as-built diagram showing implemented—not merely planned—layers. |
| NFR-SCAL-01 — horizontal backend scaling for registration spikes | **Not satisfied / not demonstrated in current baseline.** The app uses local SQLite and no multi-instance deployment or registration concurrency test is present. | Shared PostgreSQL, stateless API replicas behind a load balancer, concurrency-safe registration transaction, and repeatable multi-instance load-test evidence. |

## 8. Scope and implementation boundary

This issue is an architecture verification/documentation task. The recommendations above describe a target architecture; they do not mean PostgreSQL, Redis, a queue, workers, Kubernetes, or multiple API replicas have already been deployed. The project should implement these incrementally when the corresponding product features and deployment environment are ready.

For the current project scale, prefer a **modular monolith + shared relational database** over microservices. This preserves a simple development workflow while creating clear boundaries and a credible path to horizontal scaling.
