# RetailERP - EL CURIO Retail Distribution Platform

> A multi-tenant retail enterprise resource planning (ERP) platform for footwear, bags, and belts manufacturing and distribution. Manages inventory, billing, analytics, and warehouse operations from a single platform.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15, React 19, TypeScript, Tailwind CSS, ShadCN UI, Zustand |
| **Backend** | ASP.NET Core 8 (.NET 7 runtime), C#, Clean Architecture |
| **API Gateway** | YARP Reverse Proxy with rate limiting |
| **Database** | SQL Server 2022, 43 tables across 9 schemas |
| **Cache** | Redis 7 |
| **Messaging** | RabbitMQ (event bus) |
| **Auth** | JWT + RBAC with refresh token rotation |
| **Containers** | Docker, Docker Compose, Kubernetes |
| **Observability** | Serilog, Prometheus, Grafana |
| **CI/CD** | GitHub Actions |

## Architecture at a Glance

```
Frontend (Next.js 15)  -->  YARP API Gateway  -->  9 Microservices  -->  SQL Server
                                |                                         |
                                +-- Rate Limiting                    Redis Cache
                                +-- CORS                             RabbitMQ
```

### Microservices

| Service | Port | Responsibility |
|---------|------|---------------|
| Auth Service | 5001 | Authentication, user management, RBAC |
| Product Service | 5002 | Articles, master data (brands, categories, sizes) |
| Inventory Service | 5003 | Stock ledger, movements, adjustments |
| Order Service | 5004 | Customer orders, clients, stores |
| Production Service | 5005 | Production orders, size runs |
| Billing Service | 5006 | Invoices (GST), packing lists, delivery notes |
| Reporting Service | 5007 | Sales, inventory, production, GST reports |
| Warehouse Service | - | Warehouse management (embedded in Inventory) |
| API Gateway | 5000 | YARP reverse proxy, rate limiting, CORS |

## Quick Start

### Docker Compose (Recommended)

```bash
# Clone and start all services
git clone <repo-url>
cd RetailERP

# Start everything (database, services, frontend)
docker-compose up -d

# Database is auto-initialized by the db-init container
# Frontend: http://localhost:3003
# API Gateway: http://localhost:5000
```

### Local Development

```bash
# Backend (run each service individually)
cd src/services/auth/RetailERP.Auth.API
dotnet run

# Frontend
cd src/frontend
npm install
npm run dev
# Available at http://localhost:3000
```

### Default Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@elcurio.com | Admin@123 |
| Warehouse | warehouse@elcurio.com | Admin@123 |
| Accounts | accounts@elcurio.com | Admin@123 |
| Viewer | viewer@elcurio.com | Admin@123 |

## Documentation Index

| Document | Description |
|----------|-------------|
| [Architecture](./ARCHITECTURE.md) | System architecture, design patterns, Mermaid diagrams |
| [API Reference](./API.md) | All REST API endpoints across microservices |
| [Database](./DATABASE.md) | 43 tables, 9 schemas, ER diagrams |
| [Frontend Components](./COMPONENTS.md) | 38 pages, component hierarchy, theming |
| [Deployment](./DEPLOYMENT.md) | Docker, Kubernetes, environment variables |
| [Development Guide](./DEVELOPMENT.md) | Local setup, conventions, testing |
| [User Manual](./USER-MANUAL.md) | End-user guide with workflows |
| [Changelog](./CHANGELOG.md) | Feature history |

## Project Structure

```
RetailERP/
├── src/
│   ├── frontend/                  # Next.js 15 frontend
│   │   └── src/
│   │       ├── app/               # App Router pages (38 pages)
│   │       ├── components/        # Reusable UI components
│   │       ├── lib/               # API client, utilities
│   │       └── store/             # Zustand state management
│   ├── services/                  # .NET microservices
│   │   ├── auth/                  # Auth Service (4 projects)
│   │   ├── product/               # Product Service
│   │   ├── inventory/             # Inventory Service
│   │   ├── order/                 # Order Service
│   │   ├── production/            # Production Service
│   │   ├── billing/               # Billing Service
│   │   ├── reporting/             # Reporting Service
│   │   ├── warehouse/             # Warehouse Service
│   │   └── gateway/               # YARP API Gateway
│   └── shared/                    # Shared libraries
│       ├── RetailERP.Shared.Contracts/
│       ├── RetailERP.Shared.Domain/
│       └── RetailERP.Shared.Infrastructure/
├── database/                      # SQL Server scripts
│   ├── schemas/                   # Schema creation
│   ├── tables/                    # Table definitions (43 tables)
│   ├── indexes/                   # Index definitions
│   ├── stored-procedures/         # Stored procedures
│   └── seed-data/                 # Initial data
├── docker/                        # Dockerfiles
├── k8s/                           # Kubernetes manifests
├── docs/                          # Documentation
└── docker-compose.yml             # Full-stack compose
```

## Key Features

- **Multi-Tenant Architecture** -- Tenant isolation at database level via TenantId on every table
- **Size-Wise Operations** -- Orders and production orders track quantities per Euro/UK/US size
- **GST-Compliant Billing** -- Automatic CGST/SGST/IGST calculation based on inter-state/intra-state transactions
- **Indian State Compliance** -- Full state code mapping for GST reporting
- **Role-Based Access Control** -- Granular permissions per module (View, Add, Edit, Delete)
- **Dark/Light Theme** -- 5 color themes (Blue, Indigo, Emerald, Purple, Orange) with system detection
- **PWA Support** -- Service worker registration for offline capability
- **Real-Time Dashboard** -- Charts for sales analytics, inventory distribution, production pipeline

## License

Proprietary -- EL CURIO Retail Distribution Platform
