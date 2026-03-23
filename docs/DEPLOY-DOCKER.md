# Docker Deployment

Docker Compose is the recommended deployment method for local development and single-server production.

## Prerequisites

```bash
docker --version        # 24+
docker compose version  # 2.20+
```

## Development

```bash
# Start full stack (dev overrides: debug ports, hot reload, mailhog, adminer)
docker compose -f docker-compose.yml -f deployment/docker/docker-compose.dev.yml up -d

# Or use the one-click script:
bash deployment/scripts/deploy.sh --env dev --target docker
```

Dev-only extras enabled by `docker-compose.dev.yml`:
- **Mailhog** on `:8025` — catches outbound emails
- **Adminer** on `:8080` — SQL Server web UI
- Debug ports `5100x` for each API (attach VS debugger)
- Hot-reload volume mounts for frontend (`src/frontend/`)

## Production

```bash
bash deployment/scripts/deploy.sh --env prod --target docker
```

`docker-compose.prod.yml` adds:
- **Replicas**: auth-api × 3, order-api × 3, all others × 2
- **Memory/CPU limits** per service
- `restart: always` on every container
- JSON file log rotation (10 MB × 5 files)
- Production SQL Server edition

## Common Commands

```bash
# View all service status
docker compose ps

# Tail logs for a specific service
docker compose logs -f auth-api

# Rebuild and restart one service
docker compose up -d --build product-api

# Execute a SQL query against the database
docker exec -it retailerp-sqlserver /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P "RetailERP@2024!" -C -d RetailERP -Q "SELECT 1"

# Full reset (removes volumes — destroys data)
docker compose down -v
```

## Nginx Reverse Proxy

`deployment/docker/nginx/nginx.conf` routes all traffic:

| Path | Upstream | Notes |
|------|----------|-------|
| `/` | Frontend :3003 | Long-cache for `/_next/static/` |
| `/api/auth/*` | Auth API :5001 | Rate limit: 30 req/min |
| `/api/*` | Gateway :5000 | Rate limit: 100 req/min |
| `/api/invoices/*` | Billing API :5006 | Rate limit: 20 req/min |
| `/ws` | Gateway :5000 | WebSocket upgrade |

## MQTT Broker

`deployment/docker/mosquitto/mosquitto.conf`:
- Port 1883 — plain MQTT
- Port 8883 — TLS MQTT (production)
- Port 9001 — MQTT over WebSocket
- Password-file authentication
- Persistence enabled

## Environment Files

| File | Used When |
|------|-----------|
| `deployment/docker/frontend/.env.development` | `docker compose ... dev` |
| `deployment/docker/frontend/.env.qa` | QA environment |
| `deployment/docker/frontend/.env.uat` | UAT environment |
| `deployment/docker/frontend/.env.production` | Production |

Key frontend variables:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_WS_URL=ws://localhost:5000/ws
NEXT_PUBLIC_APP_ENV=development
```

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| SQL Server unhealthy | SA password policy / port conflict | Check `MSSQL_SA_PASSWORD`, verify port 1434 free |
| Frontend blank | Wrong `NEXT_PUBLIC_API_URL` | Must point to gateway `:5000` |
| 401 on all requests | JWT secret mismatch | All services must share same `Jwt__Secret` |
| DB migrations fail | SQL Server not ready | Run `health-check.sh` first; wait for healthy status |
| Deploy lock exists | Previous deploy crashed | `rm /tmp/retailerp-deploy.lock` or use `--force` |
