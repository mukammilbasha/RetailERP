# RetailERP — WSL 2 Quick Start

Deploy the entire RetailERP platform on WSL 2 Ubuntu with a single command.

## One-Command Install

Open your WSL 2 terminal and run:

```bash
curl -fsSL https://raw.githubusercontent.com/mukammilbasha/RetailERP/main/deployment/wsl-deploy.sh | bash
```

Or if you have the repo cloned:

```bash
chmod +x ~/RetailERP/deployment/wsl-deploy.sh
~/RetailERP/deployment/wsl-deploy.sh
```

## What It Does

| Step | Action |
|------|--------|
| 1 | Installs Docker Engine + Compose plugin |
| 2 | Installs Git, curl, and other tools |
| 3 | Clones `mukammilbasha/RetailERP` to `~/RetailERP` |
| 4 | Pulls pre-built images from Docker Hub |
| 5 | Starts all 15 containers (DB, APIs, UI, monitoring) |
| 6 | Runs health checks on every service |
| 7 | Adds Docker auto-start to `~/.bashrc` |

## Service URLs (after deploy)

| Service | URL |
|---------|-----|
| Frontend UI | http://localhost:3003 |
| Docs UI | http://localhost:3100 |
| API Gateway | http://localhost:5000 |
| Swagger | http://localhost:5000/swagger |
| Auth API | http://localhost:5001 |
| Product API | http://localhost:5002 |
| Inventory API | http://localhost:5003 |
| Order API | http://localhost:5004 |
| Production API | http://localhost:5005 |
| Billing API | http://localhost:5006 |
| Reporting API | http://localhost:5007 |
| Grafana | http://localhost:3002 (admin/admin) |
| Prometheus | http://localhost:9091 |

## Access from Windows Browser

Find your WSL IP:
```bash
hostname -I | awk '{print $1}'
```
Then open `http://<WSL_IP>:3003` in your Windows browser.

## Requirements

- WSL 2 with Ubuntu 22.04 or 24.04
- At least 4 GB RAM allocated to WSL
- At least 10 GB disk space
- Internet access (to pull Docker images)

## Allocate RAM to WSL (if needed)

Create `C:\Users\<YourName>\.wslconfig`:
```ini
[wsl2]
memory=6GB
processors=4
swap=2GB
```
Then restart WSL: `wsl --shutdown`

## Useful Commands

```bash
# View all container statuses
docker ps

# View logs for a service
docker compose -C ~/RetailERP logs -f auth-api

# Stop everything
cd ~/RetailERP && docker compose down

# Restart everything
cd ~/RetailERP && docker compose up -d

# Update to latest images from Docker Hub
cd ~/RetailERP && docker compose pull && docker compose up -d

# Full reset (removes all data)
cd ~/RetailERP && docker compose down -v && docker compose up -d
```
