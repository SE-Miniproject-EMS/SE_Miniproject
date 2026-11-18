# Frontend

React single-page application built with Vite.

## Setup

From this directory:

```bash
npm ci
cp .env.example .env.local
```

The optional `VITE_API_URL` variable points to the backend API. Its default is `http://localhost:5000/api`.

## Run

Start the Vite development server:

```bash
npm run dev
```

Create and preview a production build:

```bash
npm run build
npm run preview
```

## Source layout

- `src/api/` — Axios client and API modules
- `src/components/` — reusable UI components
- `src/context/` — shared React context
- `src/pages/` — route-level screens
- `src/App.jsx` — application routes and page composition
- `src/main.jsx` — React entry point
- `src/styles.css` — global styles

The API client reads the JWT stored as `ems_token` and attaches it to outgoing requests. This is a student-project implementation; production deployments should review the authentication storage approach and browser security controls.
