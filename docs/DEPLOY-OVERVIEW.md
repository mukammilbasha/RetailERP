# One-Click Deployment — Overview

RetailERP ships with a fully automated deployment system supporting **five targets** and **four environments**, with built-in rollback, health checks, and zero-downtime updates.

## Quick Start

```bash
# Interactive (guided menu):
bash deployment/scripts/deploy.sh

# Direct:
bash deployment/scripts/deploy.sh --env dev --target docker
bash deployment/scripts/deploy.sh --env prod --target aws
powershell deployment/iis/deploy-iis.ps1 -Environment dev
```

## Deployment Targets

| Target | Technology | Best For |
|--------|-----------|----------|
| [Docker](./DEPLOY-DOCKER) | Docker Compose | Local dev, single-server |
| [IIS](./DEPLOY-IIS) | Windows IIS + iisnode | Windows Server environments |
| [AWS](./DEPLOY-AWS) | ECS Fargate + RDS + ALB | AWS cloud production |
| [Azure](./DEPLOY-AZURE) | AKS + Azure SQL + ACR | Azure cloud production |
| [GCP](./DEPLOY-GCP) | GKE Autopilot + Cloud SQL | GCP cloud production |
| [Kubernetes](./DEPLOY-KUBERNETES) | Bare K8s manifests | Any K8s cluster |
| [CI/CD](./DEPLOY-CICD) | GitHub Actions / Azure DevOps | Automated pipelines |
| [Monitoring](./DEPLOY-MONITORING) | Prometheus + Grafana | Observability |

## Environments

| Env | Trigger | Gate | JWT Expiry |
|-----|---------|------|-----------|
| **Dev** | `main` push / manual | Auto | 8 hours |
| **QA** | After Dev passes | Auto | 4 hours |
| **UAT** | Release branch | 1 reviewer (24 h) | 2 hours |
| **Production** | `v*.*.*` tag | 2 reviewers (48 h) | 1 hour |

## Architecture

```
                    Load Balancer (Nginx / ALB / AGIC / GFE)
                              │
                    API Gateway :5000 (YARP)
                    ┌─────────┼──────────┐
              Auth  │  Product │ Inventory│  Order  Billing  Reporting
              :5001 │  :5002  │ :5003   │  :5004  :5006    :5007
                    └─────────┴──────────┘
                              │
               ┌──────────────┼──────────────┐
          SQL Server        Redis          MQTT Broker
          :1434/1433        :6380/6379     :1883 / 8883 (TLS)
```

## Service Port Reference

| Service | Port (Dev) | Port (Prod) | Health |
|---------|-----------|------------|--------|
| Frontend (Next.js) | 3003 | 443 | `/api/health` |
| API Gateway (YARP) | 5000 | 443/80 | `/health` |
| Auth API | 5001 | internal | `/health` |
| Product API | 5002 | internal | `/health` |
| Inventory API | 5003 | internal | `/health` |
| Order API | 5004 | internal | `/health` |
| Production API | 5005 | internal | `/health` |
| Billing API | 5006 | internal | `/health` |
| Reporting API | 5007 | internal | `/health` |
| SQL Server | 1434 | 1433 | TCP check |
| Redis | 6380 | 6379 | TCP check |
| MQTT Broker | 1883 | 8883 (TLS) | TCP check |
| Prometheus | 9091 | 9090 | `/` |
| Grafana | 3002 | internal | `/api/health` |

## Rollback

Any deployment can be rolled back in one command:

```bash
# Docker
bash deployment/scripts/rollback.sh --env prod --target docker

# Kubernetes / AWS / Azure / GCP
bash deployment/scripts/rollback.sh --env prod --target aws --version v1.2.1

# IIS (PowerShell)
powershell deployment/iis/rollback-iis.ps1 -Environment prod
```

## Health Check

```bash
# Full 12-point check (all services + infra):
bash deployment/scripts/health-check.sh --env dev --target docker

# Smoke tests (13 checks including JWT + WebSocket):
bash deployment/tests/smoke/smoke-tests.sh --env dev
```

## Secrets — Never Commit

| Variable | Used By |
|----------|---------|
| `SA_PASSWORD` | SQL Server SA account |
| `JWT_SECRET` | All API services (min 32 chars) |
| `GRAFANA_ADMIN_PASSWORD` | Grafana dashboard |
| `SLACK_WEBHOOK_URL` | Deploy notifications (optional) |

Use `#{TOKEN}#` placeholder syntax in config files — replaced at deploy time by CI/CD pipelines.
