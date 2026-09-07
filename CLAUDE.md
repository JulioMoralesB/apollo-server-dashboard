# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A home server dashboard that displays live service cards with status monitoring and contextual action buttons. The frontend polls `/services` every 30 seconds; the backend builds every card live from `config/services.yaml`, with no per-service code required.

## Commands

**Frontend (React + Vite):**
```bash
npm run dev       # dev server at localhost:5173, proxies /services, /config, /auth, /version → localhost:8001
npm run build     # production bundle to dist/
npm run lint      # ESLint
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
POST /auth/login (user+pass) → access + refresh token
GET /services (Bearer <access>) → yaml_to_card() per service → card grid
  service with summary-url → also GET its summary_endpoint → SummaryPanel
    (dispatches on response shape; no shared schema; not on the homepage)

Click action → authFetch(action.endpoint) → action_dispatcher reads live
  config → forwards to the service's action-url → ActionResult → shown in
  ActionPanel

Any 401/403 → authFetch silently POSTs /auth/refresh and retries once —
  no re-login unless the refresh token itself is invalid or expired
```

### Frontend (`src/`)
- `App.jsx` — root state (services, summaries, accessToken/refreshToken, selectedService), 30s polling, `authFetch` (attaches the access token, retries once after a silent refresh), login/logout
- `ServiceCard.jsx` — one service tile; click opens ActionPanel if it has actions or a summary_endpoint, otherwise opens `url` directly
- `ActionPanel.jsx` — modal with action buttons, confirm dialogs, loading/success/error states; embeds `SummaryPanel` when the service has one
- `SummaryPanel.jsx` — dispatches on response shape (not service name) to a per-service summary renderer
- `AdminPanel.jsx` — list/add/edit/delete/drag-reorder services; footer shows backend version (`utils/version.js`)
- `ServiceForm.jsx` — add/edit form for a service's fields, monitor config, and actions
- `IconPicker.jsx` — searchable visual grid over `lucide-react`'s icons, used by `ServiceForm`
- `Login.jsx` — username/password form with "remember me" (localStorage vs sessionStorage)
- `utils/auth.js` — login/refresh requests and token storage helpers
- `utils/version.js` — build version + self-reload when the backend's version no longer matches
- `utils/icons.jsx` — maps icon name strings to Lucide components
- `utils/storage.js` — safe localStorage/sessionStorage wrappers

### Backend (`backend/`)
Everything is driven by `config/services.yaml` (gitignored — see `backend/services.example.yaml` for the schema) — no per-service Python code.
- `main.py` — FastAPI app; auth routes, `/version`, and `GET/PUT /services`/`/config`
- `auth.py` — bcrypt password check, JWT access/refresh issuance and verification (`verify_access_token`)
- `config_loader.py` — loads/validates/persists `services.yaml`, with `${ENV_VAR}` interpolation for secrets
- `config_service.py` — `yaml_to_card()` builds each `Service` card; `action_dispatcher`/`summary_dispatcher` are live catch-all routes (`/services/{slug}/actions/{action}`, `/services/{slug}/summary`) that read config fresh on every call, so Admin UI edits take effect without a restart
- `yaml_models.py` — Pydantic models mirroring the YAML schema (`YamlService`, `YamlAction`)
- `models.py` — API response models: `Service`, `Action`, `ActionResult`
- `http_client.py` — singleton httpx client, initialized/closed via FastAPI lifespan
- `upstream.py` — `call_upstream()` → `ActionResult`; also promotes a `message` string out of a JSON response body into `ActionResult.message`
- `monitoring.py` — background loop polling `monitor-url`/Docker health per service's `monitor-interval`, cached and read by `get_status()`
- `docker_client.py` — Docker SDK wrapper; `get_container_status()` backs `use-docker-health` services

### Deployment
- `Dockerfile` — two-stage: Node 20 build → nginx serving SPA
- `backend/Dockerfile` — Python 3.12-slim + uvicorn
- `nginx.conf` — proxies `/services`, `/config`, `/auth`, `/version` to the backend, serves the SPA for everything else
- `compose.yaml` — two services on a shared external Docker network, pulling versioned images from GHCR (built by `.github/workflows/release.yml` on a `v*.*.*` tag push)

### Environment Variables
See `.env.example`. Key vars: `DASHBOARD_USER`, `DASHBOARD_PASSWORD`, `JWT_SECRET`, `FRONTEND_PORT`, `FREE_GAMES_NOTIFIER_*`, `CADUTRACK_API_KEY`.

## Adding a New Service

Add an entry to `config/services.yaml` — see `backend/services.example.yaml` for the full schema (name, icon, url, action-url/action-headers/actions, monitor-*, summary-url/summary-headers). No backend code changes needed; the dispatcher reads live config on every request. Use `${ENV_VAR}` in the YAML to reference secrets from `.env` rather than hardcoding them.

## Key Conventions

- Actions with `method: "href"` open an external URL; others call the backend endpoint
- `ActionResult` (`success`, `message`, `status_code`, `body`) is what the frontend shows after an action; `message` is either set explicitly or auto-extracted from a `{"message": "..."}` upstream JSON body — useful for clients that only surface `message` (e.g. a notification)
- A service with `summary-url` (+ optional `summary-headers`) gets a `summary_endpoint`; `GET /services/{slug}/summary` proxies the upstream JSON through unchanged — no shared schema, each service defines its own contract
- Every route except `/auth/login`, `/auth/refresh`, and `/version` requires `Authorization: Bearer <access token>`, enforced per-route/per-router via `verify_access_token` (`backend/auth.py`) so those three stay public
- `APP_VERSION`/`VITE_APP_VERSION` are baked into the Docker images at build time from the release tag; the frontend polls `GET /version` and self-reloads on mismatch, so a tab left open across a deploy self-heals instead of running stale JS against a newer backend
- CORS is configured for `localhost:5173` only (dev); production traffic goes through nginx same-origin
