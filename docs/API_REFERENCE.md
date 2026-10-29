# EMS API Reference

This reference describes the routes mounted by `backend/src/server.js` in the repository snapshot reviewed on 29 October 2026. It documents the implementation that exists today; it does not describe planned registration/payment/ticket endpoints.

## Local base URL

- Base URL: `http://localhost:5000/api`
- JSON body: send `Content-Type: application/json` for JSON requests.
- Authentication: protected routes use `Authorization: Bearer <access-token>`.
- Frontend API URL: `VITE_API_URL`; defaults to `http://localhost:5000/api`.
- Health check: `GET /api/health` returns `{"status":"ok"}` when the server is running.
- Errors use the JSON envelope `{"error":{"code":"ERROR_CODE","message":"Human-readable message"}}`.

The development server uses HTTP. HTTPS/TLS termination and production deployment configuration are not included in this repository snapshot.

## Authentication and accounts

### `POST /auth/register`

Creates an attendee or organizer account. ADMIN is not allowed for self-registration.

Request:

```json
{
  "name": "Asha Rao",
  "email": "asha@example.com",
  "password": "ExamplePassword123!",
  "role": "ATTENDEE"
}
```

- `name`: string, at least two non-whitespace characters.
- `email`: valid email string; must be unique.
- `password`: string of at least eight characters.
- `role`: `ATTENDEE` or `ORGANIZER`.

Success: `201 Created`, with a message and public `user` fields (`id`, `name`, `email`, `role`, `isVerified`, `createdAt`). The response excludes password hashes and login-lock fields.

Common errors: `400 INVALID_NAME`, `400 INVALID_EMAIL`, `400 INVALID_PASSWORD`, `400 INVALID_ROLE`, `409 EMAIL_IN_USE`.

**Development verification:** a signed, one-day verification URL is printed to the backend terminal. The application does not send verification email.

### `GET /auth/verify/:token`

Verifies an email using the signed token in the URL. Success returns a message and public user. Invalid/expired token returns `400 INVALID_TOKEN`; an account that no longer exists returns `404 NOT_FOUND`.

### `POST /auth/login`

Request:

```json
{
  "email": "asha@example.com",
  "password": "ExamplePassword123!"
}
```

Success: `200 OK` with `token` (JWT) and a public `user`. The `JWT_EXPIRES_IN` setting controls token life and defaults to `1d`.

Behavior and common errors:

- `400 INVALID_CREDENTIALS` when the request lacks a valid email or password string.
- `401 INVALID_CREDENTIALS` for a missing user or wrong password (same message to reduce account enumeration).
- `403 EMAIL_NOT_VERIFIED` until the email verification link is used.
- `423 ACCOUNT_LOCKED` after five consecutive failed passwords; lock duration is 15 minutes.
- The route also has a rate limit of 20 requests per 15 minutes per limiter key (IP-based by default).

### `GET /auth/me`

Requires a valid Bearer JWT. Returns `{"user": ...}` for the authenticated user. Missing, malformed, invalid or expired access tokens return `401 UNAUTHENTICATED`.

## Event APIs

### `GET /events`

Public listing of future events whose status is `PUBLISHED`. Results are sorted by `startDateTime` ascending, then `id`.

Supported query parameters:

| Parameter | Behavior |
| --- | --- |
| `search` | Substring search in `title` or `description`. |
| `category` | Exact category match. |
| `location` | Substring match against `venue`. |
| `startDate` | Optional date/time lower bound. Invalid values return `400 INVALID_START_DATE`. |
| `endDate` | Optional date/time upper bound. A date-only value (`YYYY-MM-DD`) includes the end of that UTC day. Invalid values return `400 INVALID_END_DATE`; an end before the start returns `400 INVALID_DATE_RANGE`. |
| `page` | Positive integer; defaults to `1`. Invalid values return `400 INVALID_PAGE`. |
| `limit` | Integer from `1` to `50`; defaults to `9`. Invalid values return `400 INVALID_LIMIT`. |

Success response shape:

```json
{
  "events": [],
  "pagination": { "page": 1, "limit": 9, "total": 0, "pages": 0 }
}
```

The example shows the shape, not a promise that the database is empty.

### `GET /events/:id`

Public details for a published event. Includes the organizer's public `id` and `name`. An unknown, draft or cancelled event returns `404 NOT_FOUND`.

### `GET /events/manage/mine`

Requires a Bearer JWT and `ORGANIZER` or `ADMIN` role. An organizer receives their own events; an ADMIN receives all events. Success response: `{"events":[...]}`.

### `POST /events`

Requires a Bearer JWT and `ORGANIZER` or `ADMIN` role. Creates an event and assigns `organizerId` from the authenticated user, not from the request body.

Example request:

```json
{
  "title": "Intro to Robotics",
  "description": "A hands-on workshop.",
  "category": "Workshop",
  "startDateTime": "2027-02-10T09:00:00.000Z",
  "endDateTime": "2027-02-10T12:00:00.000Z",
  "venue": "Engineering Hall",
  "capacity": 40,
  "ticketPrice": 0,
  "refundWindowHours": 24,
  "status": "DRAFT"
}
```

Required fields: `title`, `category`, `startDateTime`, `endDateTime`, `venue`, and `capacity`. `description` is optional; `ticketPrice` defaults to `0`; `refundWindowHours` defaults to `null`; `status` defaults to `DRAFT` and may be `DRAFT` or `PUBLISHED`. Publishing at creation validates publish requirements. A successful create returns `201 Created` and `{"event": ...}`.

Validation failures return `400` with a structured error. Unauthenticated requests return `401`; an attendee attempting the operation returns `403`.

### `PUT /events/:id`

Requires a Bearer JWT and `ORGANIZER` or `ADMIN` role. Allows updates to `title`, `description`, `category`, `startDateTime`, `endDateTime`, `venue`, `capacity`, `ticketPrice` and `refundWindowHours`. Only the owning organizer or ADMIN may modify the event. Cancelled events cannot be edited (`409 EVENT_CANCELLED`). A valid update returns `{"event": ...}`.

### `POST /events/:id/publish`

Requires a Bearer JWT and `ORGANIZER` or `ADMIN` role. Only the owner or ADMIN may publish. Publish-required fields are validated before the status changes to `PUBLISHED`. Success returns a message and `event`; cancelled events return `409 EVENT_CANCELLED`.

### `POST /events/:id/cancel`

Requires a Bearer JWT and `ORGANIZER` or `ADMIN` role. Only the owner or ADMIN may cancel. Success changes status to `CANCELLED` and returns a message and `event`. Repeated cancellation returns `409 ALREADY_CANCELLED`. The response explicitly states that attendee notifications/refunds are to be handled by future modules; no such workflow exists in the current baseline.

## Access matrix

| Endpoint | Anonymous | Attendee | Organizer (owner) | ADMIN |
| --- | --- | --- | --- | --- |
| `GET /events`, `GET /events/:id` | Yes, published events only | Yes | Yes | Yes |
| Register/login/verify | Yes | Yes | Yes | Admin accounts are provisioned separately |
| `GET /auth/me` | No | Yes | Yes | Yes |
| `GET /events/manage/mine` | No | Own events | Own events | All events |
| `POST /events` | No | No | Yes | Yes |
| `PUT`, `publish`, `cancel` event | No | No | Own events only | Any event |

## Not available in this API

There are no implemented endpoints for attendee event registration, waitlisting, payment or refunds, notifications/reminders, digital ticket or QR check-in, reporting/CSV export, or feedback/ratings. Do not call guessed URLs for these functions; they must be designed and implemented before they can be documented as APIs.

## Route source files

- `backend/src/server.js`
- `backend/src/routes/authRoutes.js`
- `backend/src/routes/eventRoutes.js`
- `backend/src/controllers/authController.js`
- `backend/src/controllers/eventController.js`
- `backend/src/middleware/auth.js`
