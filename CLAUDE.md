# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A home server dashboard that displays live service cards with status monitoring and contextual action buttons. The frontend polls `/services` every 30 seconds; the backend builds every card live from `config/services.yaml`, with no per-service code required.

## Commands

**Frontend (React + Vite):**
```bash
npm run dev       # dev server at localhost:5173, proxies /services, /config, /auth, /version → localhost:8001
npm run build     # production bundle to dist/
npm run lint      # ESLint on .js/.jsx
npm run preview   # preview production build
```

**Backend (FastAPI):**
```bash
cd backend
python3 -m venv env && source env/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

**Docker (full stack):**
```bash
docker compose up -d    # frontend (nginx) + backend (uvicorn)
```

## Architecture

### Data Flow
```
React App
  → POST /auth/login (username + password) → access + refresh token
  → GET /services (Authorization: Bearer <access token>)
  → FastAPI aggregates all service cards
  → Returns Service[]
  → Renders card grid

User clicks action button
  → Frontend calls action.endpoint (Authorization: Bearer <access token>)
  → action_dispatcher reads live config, forwards to the service's action-url
  → Returns ActionResult → displayed in ActionPanel

Service summary (services that opt in via summary-url)
  → Frontend GETs each service's summary_endpoint alongside /services
  → summary_dispatcher proxies the upstream JSON through as-is
  → Rendered inside that service's own ActionPanel by a shape-specific
    SummaryPanel component (no shared schema, and not shown on the homepage)

On a 401/403, the frontend calls POST /auth/refresh with the refresh token to
get a new access token and retries once, silently — no re-login unless the
refresh token itself is invalid or expired.
```

### Frontend (`src/`)
- `App.jsx` — root state (services, summaries, accessToken/refreshToken, selectedService), 30s polling, `authFetch` helper (attaches the access token, retries once after a silent refresh), login/logout
- `ServiceCard.jsx` — renders one service tile; click opens ActionPanel
- `ActionPanel.jsx` — modal with action buttons, confirm dialogs, loading/success/error states
- `SummaryPanel.jsx` — embedded inside `ActionPanel` for services with a `summary_endpoint`; dispatches on response shape (not service name) to a per-service renderer
- `Login.jsx` — username/password form with "remember me" (localStorage vs sessionStorage)
- `utils/auth.js` — login/refresh requests and token storage helpers
- `utils/version.js` — build version + self-reload when the backend's version no longer matches
- `utils/icons.jsx` — maps icon name strings to Lucide components
- `utils/storage.js` — safe localStorage/sessionStorage wrappers

### Backend (`backend/`)
Everything is driven by `config/services.yaml` (gitignored — see `backend/services.example.yaml` for the schema) — no per-service Python code.
- `main.py` — FastAPI app; `GET /services` returns `yaml_to_card()` for every configured service
- `config_loader.py` — loads/validates/persists `services.yaml`, with `${ENV_VAR}` interpolation for secrets
- `config_service.py` — `yaml_to_card()` builds each `Service` card; `action_dispatcher` and `summary_dispatcher` are live catch-all routes (`/services/{slug}/actions/{action}`, `/services/{slug}/summary`) that read config fresh on every call, so Admin UI edits take effect without a restart
- `yaml_models.py` — Pydantic models mirroring the YAML schema (`YamlService`, `YamlAction`)
- `models.py` — API response models: `Service`, `Action`, `ActionResult`
- `http_client.py` — singleton httpx client, initialized/closed via FastAPI lifespan
- `upstream.py` — `call_upstream(url, method, label, headers, body, timeout) → ActionResult` helper used by `action_dispatcher`
- `monitoring.py` — background loop polling `monitor-url`/Docker health per service's `monitor-interval`, cached and read by `get_status()`

### Deployment
- `Dockerfile` — two-stage: Node 20 build → nginx serving SPA
- `backend/Dockerfile` — Python 3.12-slim + uvicorn
- `nginx.conf` — proxies `/services/*` to backend, serves SPA for everything else
- `compose.yaml` — two services on a shared external Docker network, pulling versioned images from GHCR (built by `.github/workflows/release.yml` on a `v*.*.*` tag push)

### Environment Variables
See `.env.example`. Key vars: `DASHBOARD_USER`, `DASHBOARD_PASSWORD`, `JWT_SECRET`, `FRONTEND_PORT`, `FREE_GAMES_NOTIFIER_*`, `CADUTRACK_API_KEY`.

## Adding a New Service

Add an entry to `config/services.yaml` — see `backend/services.example.yaml` for the full schema (name, icon, url, action-url/action-headers/actions, monitor-*, summary-url/summary-headers). No backend code changes needed; `config_service.action_dispatcher`/`summary_dispatcher` read the live config on every request. Use `${ENV_VAR}` in the YAML to reference secrets from `.env` rather than hardcoding them.

## Key Conventions

- Actions with `method: "href"` open an external URL; others call the backend endpoint
- `ActionResult` has `success: bool` and `message: str` — the frontend displays `message` after any action
- A service that sets `summary-url` (+ optional `summary-headers`) gets a `summary_endpoint` on its `Service` card and shows its summary inside its own `ActionPanel` (not on the homepage); `GET /services/{slug}/summary` proxies the upstream JSON through unchanged — each service defines its own summary contract, there's no shared schema, and `SummaryPanel.jsx` dispatches on response shape to pick a renderer
- Every route except `/auth/login`, `/auth/refresh`, and `/version` requires `Authorization: Bearer <access token>`; validation lives in `backend/auth.py` (`verify_access_token`), applied per-route/per-router rather than app-wide so those endpoints stay public
- `APP_VERSION`/`VITE_APP_VERSION` are baked into the Docker images at build time from the release tag (`build-args` in `.github/workflows/release.yml`); the frontend polls `GET /version` and reloads itself if it no longer matches the bundle it was built with, so a tab left open across a deploy self-heals instead of running stale JS against a newer backend indefinitely
- CORS is configured for `localhost:5173` only (dev); production traffic goes through nginx
