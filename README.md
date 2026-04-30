# Apollo Server Dashboard

A home server dashboard inspired by Stream Deck. Each service is represented as a card with live status and contextual action buttons.

Built with React + Vite (frontend) and FastAPI (backend). Runs as two Docker containers behind an nginx reverse proxy.

## Features

- Live service cards with auto-refresh every 30 seconds
- Per-service action buttons (configurable: any HTTP method, custom body, confirm dialogs)
- HTTP health monitoring with configurable intervals, retries, expected status and body
- Docker container status monitoring via Docker socket
- Custom monitor headers (for services that require authentication, e.g. Home Assistant)
- Admin UI to manage services without editing files
- Declarative YAML config — no code required to add services
- API key authentication

## Project Structure

```
.
├── Dockerfile              # Frontend: Node.js builder → nginx
├── nginx.conf              # nginx: serves SPA + proxies /services and /config to backend
├── compose.yaml            # Docker Compose orchestration
├── Jenkinsfile             # CI/CD pipeline (Jenkins shared library)
├── config/
│   └── services.yaml       # Service definitions (gitignored, created from example on first run)
├── src/                    # React frontend (Vite)
│   └── components/
│       ├── AdminPanel.jsx  # Config management UI
│       ├── ServiceForm.jsx # Add / edit service form
│       ├── ServiceCard.jsx # Dashboard card
│       └── ActionPanel.jsx # Action button panel
└── backend/
    ├── Dockerfile          # Python 3.12-slim + uvicorn
    ├── main.py             # FastAPI app, auth, /services and /config endpoints
    ├── models.py           # Pydantic models: Service, Action, ActionResult
    ├── yaml_models.py      # Pydantic model for services.yaml
    ├── config_loader.py    # Loads, validates, and saves services.yaml
    ├── config_service.py   # Builds Service cards and dynamic action routes from YAML
    ├── monitoring.py       # Background HTTP and Docker health check loop
    ├── docker_client.py    # Docker socket wrapper: container status lookup
    ├── http_client.py      # Shared httpx client singleton
    ├── upstream.py         # Helper: call upstream service → ActionResult
    ├── entrypoint.sh       # Grants Docker socket access to appuser at startup
    └── services.example.yaml  # Annotated config reference
```

## Local Development

### Backend

```bash
cd backend
python3 -m venv env
source env/bin/activate
pip install -r requirements.txt
API_KEY=dev uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

### Frontend

```bash
npm install
npm run dev
```

The Vite dev server proxies `/services` and `/config` to `http://localhost:8001` automatically.

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
# Edit .env — set API_KEY at minimum
docker compose up -d --build
```

On first run, `config/services.yaml` is created from the example template. Edit it or use the Admin UI (⚙ icon in the top right) to add your services.

The dashboard will be available at `http://<host>:<FRONTEND_PORT>`.

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `API_KEY` | _(required)_ | Secret key sent as `X-API-Key` on every request |
| `FRONTEND_PORT` | `9902` | Host port for the dashboard |
| `SERVICES_CONFIG` | `/app/config/services.yaml` | Path to the service config file inside the container |

Additional variables (e.g. API keys, webhook URLs) can be defined in `.env` and referenced in `services.yaml` as `${MY_VAR}`.

## Service Configuration

Services are defined in `config/services.yaml`. You can edit the file directly or use the Admin UI. See `backend/services.example.yaml` for a full annotated reference.

### Minimal example

```yaml
- name: Grafana
  icon: bar-chart
  url: https://grafana.example.com
  monitor: true
  monitor-url: https://grafana.example.com/api/health
  monitor-expect-status: 200
```

### Docker health monitoring

```yaml
- name: Portainer
  icon: container
  url: https://portainer.example.com
  docker-container: portainer
  monitor: true
  use-docker-health: true
```

### Authenticated health check (e.g. Home Assistant)

```yaml
- name: Home Assistant
  icon: home
  url: http://homeassistant.local:8123
  monitor: true
  monitor-url: http://192.168.1.50:8123/api/
  monitor-headers:
    Authorization: Bearer eyJ...
  monitor-expect-status: 200
```

### Service with actions

```yaml
- name: My Service
  icon: server
  url: https://my-service.example.com
  action-url: http://my-service:8000
  action-timeout: 30
  action-headers:
    X-API-Key: ${MY_SERVICE_API_KEY}
  actions:
    - label: Restart
      icon: rotate-cw
      endpoint: /restart
      method: POST
      confirm: true
    - label: Open UI
      icon: external-link
      endpoint: https://my-service.example.com
      method: href
```

### Reaching non-Docker services on the same host

Services not running in Docker (e.g. Jenkins) are reachable from the backend container via the host's LAN IP or by adding `extra_hosts` to `compose.yaml`:

```yaml
apollo-server-dashboard-backend:
  extra_hosts:
    - "host.docker.internal:host-gateway"
```

Then use `http://host.docker.internal:<port>` as the monitor or action URL.

## Self-hosting

### Prerequisites

- Docker 20.10+
- Docker Compose v2+

### Quick start

1. Copy `.env.example` to `.env` and fill in the required variables (at minimum, set `API_KEY`):
   ```bash
   cp .env.example .env
   ```
2. Create the external Docker network if it doesn't exist yet:
   ```bash
   docker network create apollo-server-network
   ```
3. Start the stack:
   ```bash
   docker compose up -d
   ```

The dashboard will be available at `http://<host>:9902` (or the port you set in `FRONTEND_PORT`).

On first run, `config/services.yaml` is created from the example template. Edit it directly or use the Admin UI (⚙ icon) to add your services.

### Pinning a version

The default `compose.yaml` pulls the `latest` tag. To pin to a specific release, edit `compose.yaml` and replace `latest` with the version you want:

```yaml
image: ghcr.io/juliomoralesb/apollo-server-dashboard:1.2.3
image: ghcr.io/juliomoralesb/apollo-server-dashboard-backend:1.2.3
```

Available versions are listed on the [Releases](https://github.com/JulioMoralesB/apollo-server-dashboard/releases) page.

### Environment variable reference

| Variable | Default | Description |
|---|---|---|
| `API_KEY` | _(required)_ | Secret key sent as `X-API-Key` on every request |
| `FRONTEND_PORT` | `9902` | Host port for the dashboard |
| `SERVICES_CONFIG` | `/app/config/services.yaml` | Path to the service config file inside the container |

See `.env.example` for all available variables.

### Updating

```bash
docker compose pull
docker compose up -d
```

## License

MIT
