# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A home server dashboard that displays live service cards with status monitoring and contextual action buttons. The frontend polls `/services` every 30 seconds; each backend service module returns its own card data and action endpoints.

## Commands

**Frontend (React + Vite):**
```bash
npm run dev       # dev server at localhost:5173, proxies /services → localhost:8001
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
  → GET /services (X-API-Key header)
  → FastAPI aggregates all service cards
  → Returns Service[]
  → Renders card grid

User clicks action button
  → Frontend calls action.endpoint (X-API-Key header)
  → Service router handles it (calls upstream or returns direct result)
  → Returns ActionResult → displayed in ActionPanel
```

### Frontend (`src/`)
- `App.jsx` — root state (services, apiKey, selectedService), 30s polling, login/logout
- `ServiceCard.jsx` — renders one service tile; click opens ActionPanel
- `ActionPanel.jsx` — modal with action buttons, confirm dialogs, loading/success/error states
- `Login.jsx` — API key form with "remember me" (localStorage vs sessionStorage)
- `utils/icons.jsx` — maps icon name strings to Lucide components
- `utils/storage.js` — safe localStorage/sessionStorage wrappers

### Backend (`backend/`)
- `main.py` — FastAPI app; imports all service modules; `GET /services` aggregates `get_card()` from each
- `models.py` — Pydantic models: `Service`, `Action`, `ActionResult`
- `http_client.py` — singleton httpx client, initialized/closed via FastAPI lifespan
- `upstream.py` — `post_to_upstream(url, label, headers, body) → ActionResult` helper
- `services/<name>/` — each service has `__init__.py` (exports `router`, `get_card`) and `router.py`

### Deployment
- `Dockerfile` — two-stage: Node 20 build → nginx serving SPA
- `backend/Dockerfile` — Python 3.12-slim + uvicorn
- `nginx.conf` — proxies `/services/*` to backend, serves SPA for everything else
- `compose.yaml` — two services on a shared external Docker network
- `Jenkinsfile` — calls shared `dockge-pipeline` library

### Environment Variables
See `.env.example`. Key vars: `API_KEY`, `FRONTEND_PORT`, `FREE_GAMES_NOTIFIER_*`.

## Adding a New Service

1. Create `backend/services/<name>/` with `__init__.py` and `router.py`
2. `router.py` must export `router` (APIRouter) and `get_card()` returning a `Service`
3. Import and register in `backend/main.py` alongside the other services
4. See `backend/services.example.yaml` for the intended YAML schema (service configuration is currently hardcoded in Python)

## Key Conventions

- Actions with `method: "href"` open an external URL; others call the backend endpoint
- `ActionResult` has `success: bool` and `message: str` — the frontend displays `message` after any action
- The `X-API-Key` header is required on every request; auth is handled centrally in `main.py`
- CORS is configured for `localhost:5173` only (dev); production traffic goes through nginx
