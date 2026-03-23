# Monitoring & Observability

RetailERP includes a complete observability stack: Prometheus metrics, Grafana dashboards, Alertmanager routing, and structured JSON health endpoints.

## Stack Overview

| Component | Purpose | Port (dev) |
|-----------|---------|-----------|
| **Prometheus** | Metrics collection + alerting rules | 9091 |
| **Grafana** | Dashboards + visualization | 3002 |
| **Alertmanager** | Alert routing (Slack, PagerDuty) | 9093 |
| **ASP.NET Health Checks** | `/health`, `/health/ready`, `/health/live` | per service |

## Starting the Monitoring Stack

```bash
# Included in the main Docker Compose — starts automatically:
docker compose up -d prometheus grafana alertmanager

# Access Grafana:  http://localhost:3002  (admin / $GRAFANA_ADMIN_PASSWORD)
# Access Prometheus: http://localhost:9091
```

## Prometheus Scrape Targets

`deployment/monitoring/prometheus/prometheus.yml` scrapes:

| Target | Port | Path |
|--------|------|------|
| All 8 API services | 5000–5007 | `/metrics` |
| SQL Server exporter | 9399 | `/metrics` |
| Redis exporter | 9121 | `/metrics` |
| NGINX | 9113 | `/metrics` |
| Node exporter | 9100 | `/metrics` |
| cAdvisor | 8080 | `/metrics` |

## Alert Rules

`deployment/monitoring/prometheus/rules/retailerp-alerts.yml` defines 15+ rules across 5 groups:

### Availability
| Alert | Condition | Severity |
|-------|-----------|----------|
| ServiceDown | Critical service unreachable for > 1 min | critical |
| NonCriticalServiceDown | Non-critical service down > 5 min | warning |

### Error Rate
| Alert | Condition | Severity |
|-------|-----------|----------|
| HighErrorRate | > 1% HTTP 5xx over 5 min | critical |
| ElevatedErrorRate | > 0.5% HTTP 5xx over 10 min | warning |

### Latency
| Alert | Condition | Severity |
|-------|-----------|----------|
| HighP95Latency | P95 > 500 ms | warning |
| HighP99Latency | P99 > 2 s | critical |

### Resources
| Alert | Condition | Severity |
|-------|-----------|----------|
| HighCPU | CPU > 80% for 5 min | warning |
| HighMemory | Memory > 85% for 5 min | warning |
| PodCrashLooping | CrashLoopBackOff detected | critical |

### Database
| Alert | Condition | Severity |
|-------|-----------|----------|
| SQLServerDown | SQL Server exporter unreachable | critical |
| HighDBConnections | > 400 active connections | warning |

### Disk
| Alert | Condition | Severity |
|-------|-----------|----------|
| DiskLow | < 20% free | warning |
| DiskCritical | < 10% free | critical |

## Alertmanager Routing

`deployment/monitoring/alertmanager/alertmanager.yml`:

```
critical alerts → PagerDuty + Slack #alerts-critical
warning alerts  → Slack #alerts-warning
```

Inhibit rules suppress `warning` when `critical` fires for the same service (prevents alert storms).

### Configure Channels

```yaml
# In alertmanager.yml — replace placeholders:
slack_api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK'
pagerduty_url: 'https://events.pagerduty.com/v2/enqueue'
service_key: 'YOUR_PAGERDUTY_KEY'
```

## ASP.NET Health Checks

`deployment/backend/HealthCheckExtensions.cs` — add to any .NET service:

```csharp
// In Program.cs:
builder.Services.AddRetailERPHealthChecks();
app.MapRetailERPHealthChecks();
```

Endpoints:

| Endpoint | Auth | Checks |
|----------|------|--------|
| `/health/live` | None | Process alive |
| `/health/ready` | None | DB + Redis reachable |
| `/health` | None | All checks (degraded/unhealthy) |
| `/health/detailed` | Bearer JWT | Full report with timing |

Example response:
```json
{
  "status": "Healthy",
  "duration": "00:00:00.042",
  "checks": [
    { "name": "sqlserver", "status": "Healthy", "duration": "00:00:00.038" },
    { "name": "redis",     "status": "Healthy", "duration": "00:00:00.003" },
    { "name": "disk",      "status": "Healthy", "duration": "00:00:00.001" },
    { "name": "memory",    "status": "Healthy", "duration": "00:00:00.000" }
  ]
}
```

## Grafana Dashboards

Grafana is auto-provisioned via `deployment/monitoring/grafana/provisioning/`:
- **Datasource**: Prometheus (auto-configured at startup)
- **Dashboard folder**: `RetailERP` (auto-imported)

Import additional community dashboards:
- .NET Runtime metrics: Dashboard ID `13261`
- SQL Server: Dashboard ID `9386`
- Redis: Dashboard ID `11835`
- NGINX: Dashboard ID `9614`

## Logging

All .NET services use **Serilog** with structured JSON output:

```json
{
  "Timestamp": "2026-03-24T10:00:00.000Z",
  "Level": "Information",
  "MessageTemplate": "HTTP {Method} {Path} responded {StatusCode} in {Elapsed}ms",
  "Properties": { "Method": "GET", "Path": "/health", "StatusCode": 200, "Elapsed": 2.3 }
}
```

For centralized logging, configure Serilog sinks in `appsettings.json`:
- **Azure**: Application Insights sink
- **AWS**: CloudWatch Logs sink
- **Self-hosted**: Seq or Elasticsearch (ELK)
