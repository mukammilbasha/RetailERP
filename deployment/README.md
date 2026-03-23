# RetailERP — One-Click Deployment System

> Fully automated deployment to IIS, Docker, AWS, Azure, and GCP across Dev / QA / UAT / Production environments.

---

## Quick Start

```bash
# One command to deploy anywhere:
bash deployment/scripts/deploy.sh --env dev --target docker

# Or run interactive:
bash deployment/scripts/deploy.sh
```

| Target | Command |
|--------|---------|
| **Docker** (local/server) | `bash deployment/scripts/deploy.sh --env dev --target docker` |
| **IIS** (Windows) | `powershell deployment/iis/deploy-iis.ps1 -Environment dev` |
| **AWS** (ECS Fargate) | `bash deployment/scripts/deploy.sh --env prod --target aws` |
| **Azure** (AKS) | `bash deployment/scripts/deploy.sh --env prod --target azure` |
| **GCP** (GKE) | `bash deployment/scripts/deploy.sh --env prod --target gcp` |

---

## Prerequisites

### All Targets
- Git (for version tagging)
- Docker 24+ with BuildKit

### Docker
```bash
docker --version      # 24+
docker compose version # 2.20+
```

### IIS (Windows)
```powershell
# Run once to set up IIS:
powershell -ExecutionPolicy Bypass deployment/iis/setup-iis.ps1

# .NET 8 Hosting Bundle must be installed:
# https://dotnet.microsoft.com/en-us/download/dotnet/8.0
```

### AWS
```bash
aws --version          # 2.x+
aws configure          # or set AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY
terraform --version    # 1.6+
```

### Azure
```bash
az --version           # 2.55+
az login               # or use service principal
kubectl version        # 1.28+
terraform --version    # 1.6+
```

### GCP
```bash
gcloud --version       # 455+
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
kubectl version        # 1.28+
terraform --version    # 1.6+
```

---

## Architecture Overview

```
                         ┌──────────────────────────────────┐
                         │          Load Balancer            │
                         │    (Nginx / ALB / AGIC / GFE)    │
                         └──────────────┬───────────────────┘
                                        │
                         ┌──────────────▼───────────────────┐
                         │          API Gateway :5000        │
                         │       (YARP reverse proxy)        │
                         └──┬──────┬──────┬──────┬──────────┘
                            │      │      │      │
               ┌────────────▼┐ ┌───▼──┐ ┌▼────┐ ┌▼──────────┐
               │ Auth :5001  │ │Prod  │ │Order│ │Billing    │
               │ Product:5002│ │:5005 │ │:5004│ │:5006      │
               │ Inventory   │ └──────┘ └─────┘ └───────────┘
               │ :5003       │
               └─────────────┘
                         │
              ┌──────────┴──────────┐
              │   SQL Server :1433   │   Redis :6379
              │   MQTT Broker :1883  │
              └─────────────────────┘
```

---

## Services

| Service | Port | Description |
|---------|------|-------------|
| API Gateway | 5000 | YARP reverse proxy + JWT validation |
| Auth API | 5001 | Authentication + JWT issuance |
| Product API | 5002 | Product catalog + pricing |
| Inventory API | 5003 | Stock management + warehouse |
| Order API | 5004 | POS orders + fulfillment |
| Production API | 5005 | Manufacturing + BOM |
| Billing API | 5006 | Invoicing + payments |
| Reporting API | 5007 | Analytics + dashboards |
| Frontend | 3003 | Next.js 15 web UI |
| SQL Server | 1434 | Primary database |
| Redis | 6380 | Cache + sessions |
| MQTT Broker | 1883 | POS device messaging |
| Prometheus | 9091 | Metrics collection |
| Grafana | 3002 | Monitoring dashboards |

---

## Environment Configuration

| Env | Auto-Deploy | Approval | Target Branch/Tag |
|-----|------------|----------|-------------------|
| Dev | ✅ Auto | None | `main` push |
| QA | ✅ Auto | None | After Dev succeeds |
| UAT | ❌ Manual | 1 reviewer | Release branch / tag |
| Prod | ❌ Manual | 2 reviewers + timer | `v*.*.*` tag only |

### Environment Variables

Copy and customize `.env` files:
```bash
cp deployment/docker/frontend/.env.development .env.local
```

Required environment variables (never commit):
```
SA_PASSWORD=RetailERP@2024!
JWT_SECRET=<32-char-secret>
GRAFANA_ADMIN_PASSWORD=<password>
SLACK_WEBHOOK_URL=<optional>
```

---

## Deployment Workflow

```
git push main
     │
     ▼
┌─────────┐    ┌────────┐    ┌────────┐    ┌──────────────┐
│  Build  │───▶│  Dev   │───▶│   QA   │───▶│ UAT (Manual) │
│  +Scan  │    │ (auto) │    │ (auto) │    │  Approval    │
└─────────┘    └────────┘    └────────┘    └──────┬───────┘
                                                   │
                                                   ▼
                                          ┌────────────────┐
                                          │ Prod (Manual)  │
                                          │ 2 Reviewers    │
                                          │ + Wait Timer   │
                                          └────────────────┘
```

---

## Rollback

```bash
# Interactive rollback:
bash deployment/scripts/rollback.sh --env prod --target docker

# Specific version:
bash deployment/scripts/rollback.sh --env prod --target aws --version v1.2.2

# Kubernetes rollback:
kubectl rollout undo deployment/gateway -n retailerp-prod

# IIS rollback (PowerShell):
powershell deployment/iis/rollback-iis.ps1 -Environment prod
```

---

## Health Checks

```bash
# Check all services:
bash deployment/scripts/health-check.sh --env dev --target docker

# JSON output for CI:
bash deployment/scripts/health-check.sh --env prod --json

# Individual endpoints:
curl http://localhost:5000/health    # Gateway
curl http://localhost:5001/health    # Auth
curl http://localhost:3003/api/health # Frontend
```

---

## Monitoring

| Dashboard | URL | Credentials |
|-----------|-----|-------------|
| Grafana | http://localhost:3002 | admin / `$GRAFANA_ADMIN_PASSWORD` |
| Prometheus | http://localhost:9091 | (no auth) |
| Alertmanager | http://localhost:9093 | (no auth) |

---

## Troubleshooting

| Issue | Diagnosis | Fix |
|-------|-----------|-----|
| Service won't start | `docker compose logs <service>` | Check connection string, DB ready |
| SQL Server unhealthy | `docker compose logs sqlserver` | SA password, port conflict |
| Frontend blank page | Check `NEXT_PUBLIC_API_URL` env | Point to gateway port 5000 |
| 401 Unauthorized | JWT secret mismatch | Ensure all services share same `Jwt__Secret` |
| Migrations fail | Check DB connectivity | Run `health-check.sh` first |
| Deploy locked | `rm /tmp/retailerp-deploy.lock` | Or use `--force` flag |
| IIS 503 | App pool stopped | `Start-WebAppPool -Name "RetailERP-Auth"` |
| High error rate | Grafana → RetailERP Overview | Check recent deployment, rollback if needed |

---

## File Structure

```
deployment/
├── README.md                          ← This file
├── ARCHITECTURE.md                    ← C4 diagrams + strategy
├── ADR.md                             ← Architecture decisions
├── ENVIRONMENT-MATRIX.md              ← Per-env config matrix
├── scripts/
│   ├── deploy.sh                      ← ONE-CLICK master deploy
│   ├── rollback.sh                    ← Rollback any environment
│   └── health-check.sh               ← All-service health check
├── docker/
│   ├── docker-compose.dev.yml         ← Dev overrides
│   ├── docker-compose.prod.yml        ← Prod overrides (replicas, limits)
│   ├── nginx/nginx.conf               ← Reverse proxy config
│   └── mosquitto/mosquitto.conf       ← MQTT broker config
├── kubernetes/
│   ├── namespace.yaml
│   ├── configmap.yaml
│   ├── secrets.yaml
│   ├── deployments/all-services.yaml  ← All services with HPA + PDB
│   └── ingress.yaml
├── iis/
│   ├── deploy-iis.ps1                 ← IIS deploy + health check
│   └── rollback-iis.ps1              ← IIS rollback from backup
├── aws/terraform/                     ← ECS Fargate + RDS + ALB
├── azure/
│   ├── bicep/main.bicep               ← AKS + Azure SQL + ACR + Key Vault
│   └── pipelines/azure-pipelines.yml ← Multi-stage Azure DevOps pipeline
├── gcp/terraform/                     ← GKE Autopilot + Cloud SQL
├── ci-cd/github-actions/
│   ├── deploy.yml                     ← Full pipeline with env gates
│   └── pr-check.yml                  ← PR validation (lint + build + scan)
├── monitoring/
│   ├── prometheus/prometheus.yml      ← Scrape all services
│   ├── prometheus/rules/              ← Alert rules
│   ├── alertmanager/alertmanager.yml  ← Slack + PagerDuty routing
│   └── grafana/provisioning/          ← Auto-provisioned datasources
└── tests/
    └── smoke/smoke-tests.sh           ← 12-point smoke test suite
```
