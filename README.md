# Apollo Server Dashboard

A home server dashboard inspired by Stream Deck. Each service is represented as a card with live status and contextual actions (restart, resend notifications, etc.).

Built with React + Vite (frontend) and FastAPI (backend). Runs as two Docker containers behind an nginx reverse proxy.

## Features

- Live service status cards with auto-refresh every 30 seconds
- Per-service action buttons (configurable per service)
- API key authentication
- Docker-ready with nginx reverse proxy

## Project Structure

```
.
├── Dockerfile              # Frontend: Node.js builder → nginx
├── nginx.conf              # nginx: serves SPA + proxies /services to backend
├── compose.yaml            # Docker Compose orchestration
├── Jenkinsfile             # CI/CD pipeline (Jenkins shared library)
├── src/                    # React frontend (Vite)
└── backend/
    ├── Dockerfile          # Python 3.12-slim + uvicorn
    ├── main.py             # FastAPI app entry point
    ├── models.py           # Pydantic models (Service, Action, ActionResult)
    ├── http_client.py      # Shared httpx client singleton
    ├── upstream.py         # Shared helper: POST to upstream service + map errors to ActionResult
    └── services/
        ├── minecraft/      # Minecraft service card + actions
        └── free_games_notifier/  # Free Games Notifier card + actions (resend, E2E checks)
```

## Local Development

### Backend

```bash
cd backend
python3 -m venv env
source env/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

### Frontend

```bash
npm install
npm run dev
```

The Vite dev server proxies `/services` to `http://localhost:8001` automatically.

## Docker Deployment

### Prerequisites

- Docker 20.10+
- Docker Compose v2+
- An existing external Docker network named `apollo-server-network`:
  ```bash
  docker network create apollo-server-network
  ```

### Quick Start

```bash
cp .env.example .env
# Edit .env as needed
docker compose up -d
```

The dashboard will be available at `http://<host>:3000`.

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `API_KEY` | _(required)_ | Secret key for the dashboard; must be set to a non-empty value |
| `FRONTEND_PORT` | `3000` | Host port for the dashboard |
| `FREE_GAMES_NOTIFIER_URL` | `http://free-games-notifier:8000` | URL of the Free Games Notifier service |
| `FREE_GAMES_NOTIFIER_API_KEY` | _(empty)_ | API key for the Free Games Notifier service |
| `FREE_GAMES_NOTIFIER_TEST_WEBHOOK_URL` | _(empty)_ | Discord webhook URL for test notifications |

## Adding a New Service

1. Create `backend/services/<service_name>/`
2. Add `__init__.py` and `router.py` — implement `get_card() -> Service` and add `@router.post/get(...)` actions
3. For action endpoints that POST to an upstream service, import and use the shared helper:
   ```python
   from upstream import post_to_upstream

   @router.post("/my-action")
   def my_action() -> ActionResult:
       return post_to_upstream(
           f"{MY_SERVICE_URL}/some-endpoint",
           headers={"X-API-Key": MY_SERVICE_API_KEY},
       )
   ```
4. Import and register in `backend/main.py`

## CI/CD (Jenkins)

The included `Jenkinsfile` uses the shared pipeline library. Before first run:

```bash
sudo mkdir /opt/stacks/apollo-server-dashboard
sudo chown -R jenkins:jenkins /opt/stacks/apollo-server-dashboard
```

Then create a Jenkins pipeline job pointing to this repository. The pipeline will build the Docker images, copy `compose.yaml` to the Dockge stack directory, and restart the stack.

> **Note:** Replace `'dockge-pipeline'` in `Jenkinsfile` with the actual name of your shared library as configured in Jenkins.

## License

MIT
