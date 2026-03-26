# RetailERP — Setup & Deployment Guide

> Deploy the full RetailERP platform (15 containers) on any machine in minutes.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Quick Start (All OS)](#2-quick-start-all-os)
3. [Windows Setup](#3-windows-setup)
4. [Linux / Ubuntu Setup](#4-linux--ubuntu-setup)
5. [WSL 2 Setup (One Command)](#5-wsl-2-setup-one-command)
6. [macOS Setup](#6-macos-setup)
7. [Service URLs & Ports](#7-service-urls--ports)
8. [Default Credentials](#8-default-credentials)
9. [Useful Commands](#9-useful-commands)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Prerequisites

| Tool | Minimum Version | Check |
|------|----------------|-------|
| Docker | 24.x | `docker --version` |
| Docker Compose | v2.x (plugin) | `docker compose version` |
| Git | 2.x | `git --version` |
| RAM | 4 GB (8 GB recommended) | |
| Disk | 10 GB free | |

---

## 2. Quick Start (All OS)

### Option A — Pull from Docker Hub (Fastest, no source code needed)

```bash
# 1. Clone only the compose file
git clone https://github.com/mukammilbasha/RetailERP.git
cd RetailERP

# 2. Pull all pre-built images and start
docker compose -f docker-compose.hub.yml up -d

# 3. Open the app
# Frontend → http://localhost:3003
# Docs     → http://localhost:3100
```

### Option B — Build from Source

```bash
# 1. Clone the full source
git clone https://github.com/mukammilbasha/RetailERP.git
cd RetailERP

# 2. Build and start everything
docker compose up -d --build

# 3. Wait ~3 minutes for first build, then open:
# Frontend → http://localhost:3003
```

---

## 3. Windows Setup

### Step 1 — Install Docker Desktop

1. Download from https://www.docker.com/products/docker-desktop
2. Run the installer — enable **WSL 2 backend** when prompted
3. Restart your PC
4. Open Docker Desktop and wait for the whale icon to stop animating

### Step 2 — Install Git

Download from https://git-scm.com/download/win and install with defaults.

### Step 3 — Deploy

Open **PowerShell** or **Git Bash** and run:

```powershell
git clone https://github.com/mukammilbasha/RetailERP.git
cd RetailERP
docker compose up -d
```

### Step 4 — Open the App

Open your browser to http://localhost:3003

---

## 4. Linux / Ubuntu Setup

### Step 1 — Install Docker Engine

```bash
# Remove old versions
sudo apt-get remove docker docker-engine docker.io containerd runc 2>/dev/null || true

# Install dependencies
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg lsb-release

# Add Docker GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add your user to docker group (no sudo needed)
sudo usermod -aG docker $USER
newgrp docker
```

### Step 2 — Install Git

```bash
sudo apt-get install -y git
```

### Step 3 — Deploy

```bash
git clone https://github.com/mukammilbasha/RetailERP.git
cd RetailERP
docker compose up -d
```

### Step 4 — Open the App

```
http://<your-server-ip>:3003
```

---

## 5. WSL 2 Setup (One Command)

Run this single command in your WSL 2 terminal — it does everything automatically:

```bash
curl -fsSL https://raw.githubusercontent.com/mukammilbasha/RetailERP/main/deployment/wsl-deploy.sh | bash
```

**What it installs automatically:**
- Docker Engine + Compose plugin
- Git, curl, and tools
- Clones the repository to `~/RetailERP`
- Pulls pre-built images from Docker Hub
- Starts all 15 containers
- Configures Docker auto-start on WSL launch

**Allocate more RAM to WSL** (recommended — create `C:\Users\<YourName>\.wslconfig`):

```ini
[wsl2]
memory=6GB
processors=4
swap=2GB
```

Then restart: `wsl --shutdown`

---

## 6. macOS Setup

### Step 1 — Install Docker Desktop for Mac

Download from https://www.docker.com/products/docker-desktop (choose Apple Silicon or Intel).

### Step 2 — Install Git

```bash
xcode-select --install
# or via Homebrew:
brew install git
```

### Step 3 — Deploy

```bash
git clone https://github.com/mukammilbasha/RetailERP.git
cd RetailERP
docker compose up -d
```

---

## 7. Service URLs & Ports

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:3003 | Main ERP application |
| **Docs UI** | http://localhost:3100 | Documentation portal |
| **API Gateway** | http://localhost:5000 | Unified API entry point |
| **Swagger UI** | http://localhost:5000/swagger | Interactive API docs |
| **Auth API** | http://localhost:5001 | Authentication service |
| **Product API** | http://localhost:5002 | Product management |
| **Inventory API** | http://localhost:5003 | Inventory management |
| **Order API** | http://localhost:5004 | Order management |
| **Production API** | http://localhost:5005 | Production management |
| **Billing API** | http://localhost:5006 | Billing management |
| **Reporting API** | http://localhost:5007 | Reports & analytics |
| **Grafana** | http://localhost:3002 | Monitoring dashboards |
| **Prometheus** | http://localhost:9091 | Metrics |
| **SQL Server** | localhost:1434 | Database (SSMS/DBeaver) |
| **Redis** | localhost:6380 | Cache |

---

## 8. Default Credentials

| Service | Username | Password |
|---------|----------|----------|
| ERP Login (Super Admin) | `admin@retailerp.com` | `Admin@123` |
| ERP Login (Manager) | `manager@retailerp.com` | `Manager@123` |
| ERP Login (Staff) | `staff@retailerp.com` | `Staff@123` |
| SQL Server | `sa` | `RetailERP@2024!` |
| Grafana | `admin` | `admin` |

> ⚠️ Change all passwords before exposing to a network.

---

## 9. Useful Commands

```bash
# Check all container statuses
docker ps

# View logs for a service
docker compose logs -f frontend
docker compose logs -f auth-api

# Restart a single service
docker compose restart frontend

# Stop everything (keeps data)
docker compose down

# Stop and delete all data
docker compose down -v

# Rebuild and restart a single service
docker compose up -d --build auth-api

# Pull latest images and restart
docker compose pull && docker compose up -d

# Open a shell inside a container
docker exec -it retailerp-frontend sh
docker exec -it retailerp-sqlserver bash

# Connect to SQL Server from terminal
docker exec -it retailerp-sqlserver \
  /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "RetailERP@2024!" -C
```

---

## 10. Troubleshooting

### Containers keep restarting

```bash
# Check logs for errors
docker compose logs auth-api
docker compose logs sqlserver
```

### SQL Server unhealthy

SQL Server takes 30–60 seconds on first start. Wait and check:

```bash
docker inspect retailerp-sqlserver --format='{{.State.Health.Status}}'
```

### Port already in use

Find and kill the conflicting process:

```bash
# Linux/Mac
sudo lsof -i :3003
sudo kill -9 <PID>

# Windows (PowerShell)
netstat -ano | findstr :3003
taskkill /PID <PID> /F
```

Or change the port in `docker-compose.yml`:
```yaml
ports:
  - "3010:3000"   # change 3003 to any free port
```

### Frontend shows blank page

```bash
docker compose restart frontend
# Wait 30 seconds then refresh browser
```

### Out of memory

Increase Docker memory limit:
- **Docker Desktop**: Settings → Resources → Memory → set to 6 GB
- **WSL 2**: Edit `~/.wslconfig` → `memory=6GB`

### Reset everything (fresh start)

```bash
docker compose down -v --remove-orphans
docker system prune -f
docker compose up -d
```

---

## Architecture Overview

```
Browser
  └── Frontend (3003)
        └── API Gateway (5000)
              ├── Auth API     (5001)
              ├── Product API  (5002)
              ├── Inventory API(5003)
              ├── Order API    (5004)
              ├── Production   (5005)
              ├── Billing API  (5006)
              └── Reporting    (5007)
                    └── SQL Server (1434) + Redis (6380)

Monitoring: Prometheus (9091) → Grafana (3002)
```

---

## Support

- GitHub: https://github.com/mukammilbasha/RetailERP
- Issues: https://github.com/mukammilbasha/RetailERP/issues
- Docker Hub: https://hub.docker.com/r/mukammilbasha/retailerp
