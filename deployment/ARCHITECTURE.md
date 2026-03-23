# RetailERP — One-Click Deployment Architecture

**Version:** 1.0.0 | **Date:** 2026-03-24 | **Status:** Active

---

## C4 Context Diagram

```mermaid
C4Context
  title RetailERP System Context

  Person(cashier, "Cashier", "Processes sales at POS terminal")
  Person(manager, "Store Manager", "Manages inventory, orders, reporting")
  Person(admin, "System Admin", "Manages users, configuration")

  System(retailerp, "RetailERP", "Enterprise retail management platform")

  System_Ext(pos_terminal, "POS Terminals", "Hardware point-of-sale devices via MQTT")
  System_Ext(payment_gateway, "Payment Gateway", "Stripe/PayPal payment processing")
  System_Ext(email_service, "Email Service", "SendGrid transactional email")
  System_Ext(barcode_scanner, "Barcode Scanners", "USB/Bluetooth inventory scanners")

  Rel(cashier, retailerp, "Processes sales", "HTTPS/Browser")
  Rel(manager, retailerp, "Manages operations", "HTTPS/Browser")
  Rel(admin, retailerp, "Configures system", "HTTPS/Browser")
  Rel(pos_terminal, retailerp, "Sends transactions", "MQTT/TLS")
  Rel(retailerp, payment_gateway, "Processes payments", "HTTPS/REST")
  Rel(retailerp, email_service, "Sends notifications", "HTTPS/REST")
  Rel(barcode_scanner, retailerp, "Scans products", "WebSocket")
```

---

## C4 Container Diagram

```mermaid
C4Container
  title RetailERP Container Diagram

  Container(frontend, "Frontend", "Next.js 15", "React web UI — POS, inventory, reporting")
  Container(gateway, "API Gateway", "ASP.NET Core + YARP", "JWT validation, routing, rate limiting — port 5000")
  Container(auth, "Auth API", "ASP.NET Core 8", "Authentication, JWT issuance — port 5001")
  Container(product, "Product API", "ASP.NET Core 8", "Product catalog, SKUs, pricing — port 5002")
  Container(inventory, "Inventory API", "ASP.NET Core 8", "Stock, warehouses, movements — port 5003")
  Container(order, "Order API", "ASP.NET Core 8", "POS orders, fulfillment — port 5004")
  Container(production, "Production API", "ASP.NET Core 8", "Manufacturing, BOM — port 5005")
  Container(billing, "Billing API", "ASP.NET Core 8", "Invoicing, payments — port 5006")
  Container(reporting, "Reporting API", "ASP.NET Core 8", "Analytics, dashboards — port 5007")
  ContainerDb(sqlserver, "SQL Server", "MSSQL 2022", "Primary relational database")
  ContainerDb(redis, "Redis", "Redis 7", "Session cache, distributed locks")
  Container(mqtt, "MQTT Broker", "Mosquitto 2.0", "POS terminal events — port 1883/8883/9001")
  Container(prometheus, "Prometheus", "Prometheus", "Metrics collection — port 9091")
  Container(grafana, "Grafana", "Grafana", "Dashboards — port 3002")

  Rel(frontend, gateway, "API calls", "HTTPS")
  Rel(gateway, auth, "Auth check", "HTTP")
  Rel(gateway, product, "Routes to", "HTTP")
  Rel(gateway, inventory, "Routes to", "HTTP")
  Rel(gateway, order, "Routes to", "HTTP")
  Rel(gateway, billing, "Routes to", "HTTP")
  Rel(auth, sqlserver, "Reads/writes", "SQL")
  Rel(auth, redis, "Session cache", "Redis")
  Rel(order, mqtt, "Publishes events", "MQTT")
  Rel(inventory, sqlserver, "Reads/writes", "SQL")
  Rel(reporting, sqlserver, "Reads", "SQL")
  Rel(prometheus, gateway, "Scrapes /metrics", "HTTP")
  Rel(grafana, prometheus, "Queries", "PromQL")
```

---

## CI/CD Pipeline Flow

```mermaid
flowchart LR
  subgraph build["Build (Parallel)"]
    B1[Build Auth API] & B2[Build Product API] & B3[Build Inventory] &
    B4[Build Order API] & B5[Build Billing API] & B6[Build Gateway] & B7[Build Frontend]
  end

  subgraph scan["Security Scan"]
    S1[Trivy Container Scan]
    S2[CodeQL SAST]
    S3[Dependency Audit]
  end

  subgraph dev["Dev (Auto)"]
    D1[kubectl apply] --> D2[Wait for rollout] --> D3[Smoke Tests ✓]
  end

  subgraph qa["QA (Auto)"]
    Q1[kubectl apply] --> Q2[Smoke Tests ✓]
  end

  subgraph uat["UAT (Manual Approval)"]
    UA[👤 Reviewer Approval] --> U1[kubectl apply] --> U2[Smoke Tests ✓]
  end

  subgraph prod["Production (2 Reviewers + Timer)"]
    PA[👤👤 Approval + ⏱ Timer] --> P1[Rolling Deploy] --> P2[Smoke Tests]
    P2 -->|pass| P3[Tag as :stable]
    P2 -->|fail| P4[Auto Rollback 🔄]
  end

  build --> scan --> dev --> qa --> uat --> prod
```

---

## Zero-Downtime Blue/Green Strategy (Production)

```mermaid
sequenceDiagram
  participant CI as CI/CD Pipeline
  participant K8S as Kubernetes
  participant LB as Load Balancer
  participant Health as Health Checker

  CI->>K8S: Deploy new version (maxSurge=1, maxUnavailable=0)
  K8S->>K8S: Start new pod (green)
  K8S->>Health: Wait for readinessProbe OK
  Health-->>K8S: ✓ Ready
  K8S->>LB: Add green pod to service
  K8S->>LB: Remove old pod (blue)
  K8S->>K8S: Terminate old pod
  CI->>Health: Run smoke tests against production
  alt Tests Pass
    Health-->>CI: ✓ All 12 checks passed
    CI->>K8S: Tag image as :stable
    CI->>CI: Notify Slack ✅
  else Tests Fail
    Health-->>CI: ✗ Failures detected
    CI->>K8S: kubectl rollout undo all deployments
    K8S->>LB: Restore old pods
    CI->>CI: Notify Slack 🔴
  end
```

---

## Service Dependency Map

```mermaid
graph TD
  FE[Frontend :3003] --> GW[API Gateway :5000]
  GW --> AUTH[Auth API :5001]
  GW --> PROD[Product API :5002]
  GW --> INV[Inventory API :5003]
  GW --> ORD[Order API :5004]
  GW --> MFGR[Production API :5005]
  GW --> BILL[Billing API :5006]
  GW --> RPT[Reporting API :5007]

  AUTH --> SQL[(SQL Server)]
  AUTH --> REDIS[(Redis)]
  PROD --> SQL
  INV --> SQL
  ORD --> SQL
  ORD --> MQTT{MQTT Broker}
  MFGR --> SQL
  BILL --> SQL
  RPT --> SQL

  MQTT -.->|events| POS[POS Terminals]
  MQTT -.->|ws| FE

  PROM[Prometheus] -.->|scrape| GW & AUTH & PROD & INV & ORD & BILL
  GRAFANA[Grafana] -.->|PromQL| PROM
```

---

## Rollback Decision Flowchart

```mermaid
flowchart TD
  A[Deployment Triggered] --> B[Smoke Tests Run]
  B --> C{All Critical Tests Pass?}

  C -->|Yes| D[Deployment Successful ✅]
  C -->|No| E{Which failures?}

  E -->|Health endpoint down| F[Service crash → check logs]
  E -->|DB connectivity| G[Migration failed → DB rollback]
  E -->|Auth fails| H[JWT config mismatch]

  F --> I{Can auto-fix?}
  G --> I
  H --> I

  I -->|No| J[Auto-rollback: kubectl rollout undo]
  J --> K[Verify rollback health]
  K --> L{Healthy after rollback?}
  L -->|Yes| M[Alert: Rollback Successful ⚠]
  L -->|No| N[CRITICAL: Manual intervention required 🔴]
  N --> O[Page on-call via PagerDuty]
```

---

## Network Topology

```mermaid
graph TB
  subgraph internet["Internet"]
    USER[Users / Browsers]
    POS[POS Terminals]
  end

  subgraph dmz["DMZ / Public Subnet"]
    LB[Load Balancer / NGINX]
    WAF[WAF / Cloud Armor]
  end

  subgraph private["Private Subnet"]
    GW[API Gateway]
    APIS[Microservices]
    MQTT_B[MQTT Broker]
  end

  subgraph data["Data Subnet"]
    SQL[(SQL Server)]
    REDIS[(Redis)]
  end

  USER -->|HTTPS 443| WAF
  POS -->|MQTT/TLS 8883| LB
  WAF --> LB
  LB -->|HTTP 8080| GW
  LB -->|MQTT| MQTT_B
  GW --> APIS
  APIS --> SQL
  APIS --> REDIS
  MQTT_B --> APIS
```
