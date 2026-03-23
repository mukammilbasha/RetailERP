# RetailERP - System Architecture

## System Overview

**EL CURIO RetailERP** is a multi-tenant retail distribution platform for footwear, bags, and belts manufacturing and distribution. It manages inventory, billing, analytics, and warehouse operations from a single platform.

## High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Next.js 15 Frontend<br/>React 19 + Tailwind CSS]
        MOBILE[Mobile App - Future]
    end

    subgraph "API Gateway Layer"
        GW[YARP API Gateway<br/>Rate Limiting / CORS / Routing<br/>Port 5000]
    end

    subgraph "Microservices Layer"
        AUTH[Auth Service<br/>JWT + RBAC<br/>Port 5001]
        PROD[Product Service<br/>Articles + Masters<br/>Port 5002]
        INV[Inventory Service<br/>Stock Ledger + Movements<br/>Port 5003]
        ORD[Order Service<br/>Customer Orders + Clients<br/>Port 5004]
        PRODUCTION[Production Service<br/>Production Orders<br/>Port 5005]
        BILL[Billing Service<br/>GST Invoicing<br/>Port 5006]
        RPT[Reporting Service<br/>Analytics + Reports<br/>Port 5007]
    end

    subgraph "Infrastructure Layer"
        REDIS[(Redis 7<br/>Distributed Cache)]
        SQL[(SQL Server 2022<br/>43 Tables / 9 Schemas)]
        MQ[RabbitMQ<br/>Event Bus]
    end

    subgraph "Observability"
        LOG[Serilog<br/>Structured Logging]
        PROM[Prometheus<br/>Metrics Scraping]
        GRAF[Grafana<br/>Dashboards]
    end

    WEB --> GW
    GW --> AUTH
    GW --> PROD
    GW --> INV
    GW --> ORD
    GW --> PRODUCTION
    GW --> BILL
    GW --> RPT

    AUTH --> SQL
    AUTH --> REDIS
    PROD --> SQL
    PROD --> REDIS
    INV --> SQL
    INV --> MQ
    PRODUCTION --> SQL
    PRODUCTION --> MQ
    ORD --> SQL
    ORD --> MQ
    BILL --> SQL
    RPT --> SQL
    RPT --> REDIS

    AUTH --> LOG
    LOG --> PROM
    PROM --> GRAF
```

## Service Communication Flow

```mermaid
sequenceDiagram
    participant C as Next.js Client
    participant GW as API Gateway (YARP)
    participant AUTH as Auth Service
    participant ORD as Order Service
    participant INV as Inventory Service
    participant BILL as Billing Service

    Note over C, BILL: Order-to-Invoice Flow

    C->>GW: POST /api/auth/login
    GW->>AUTH: Forward login request
    AUTH-->>GW: JWT + Refresh Token
    GW-->>C: Tokens returned

    C->>GW: POST /api/orders (Bearer JWT)
    GW->>ORD: Create Order (size-wise)
    ORD->>INV: Check Stock Availability
    INV-->>ORD: Stock per Size confirmed
    ORD-->>GW: Order created (DRAFT)
    GW-->>C: Order response

    C->>GW: POST /api/orders/{id}/confirm
    GW->>ORD: Confirm Order
    ORD->>INV: Reserve Stock
    INV-->>ORD: Stock Reserved
    ORD-->>GW: Order CONFIRMED
    GW-->>C: Confirmation

    C->>GW: POST /api/invoices
    GW->>BILL: Create Invoice from Order
    BILL->>BILL: Calculate GST (CGST/SGST/IGST)
    BILL-->>GW: Invoice created
    GW-->>C: Invoice with tax breakdown
```

## Clean Architecture (Per Service)

Each microservice follows Clean Architecture with four layers:

```mermaid
graph TB
    subgraph "Clean Architecture"
        API["API Layer<br/>(Controllers, Middleware, Filters)"]
        APP["Application Layer<br/>(Services, DTOs, Validators, Mappings)"]
        DOM["Domain Layer<br/>(Entities, Value Objects, Enums, Interfaces)"]
        INF["Infrastructure Layer<br/>(DbContext, Repositories, External Services, Caching)"]
    end

    API --> APP
    APP --> DOM
    INF --> DOM
    API --> INF

    style DOM fill:#f9f,stroke:#333,stroke-width:2px
    style APP fill:#bbf,stroke:#333
    style INF fill:#bfb,stroke:#333
    style API fill:#fbb,stroke:#333
```

### Directory Structure per Service

```
Service/
├── RetailERP.{Service}.Domain/           # Enterprise Business Rules
│   ├── Entities/                          # Domain entities
│   └── (no external dependencies)
├── RetailERP.{Service}.Application/      # Application Business Rules
│   ├── DTOs/                              # Data transfer objects
│   ├── Interfaces/                        # Service contracts
│   ├── Services/                          # Business logic
│   ├── Validators/                        # FluentValidation rules
│   └── Mappings/                          # Entity-to-DTO mappings
├── RetailERP.{Service}.Infrastructure/   # Frameworks & Drivers
│   ├── Data/
│   │   ├── Context/                       # EF Core DbContext
│   │   ├── Repositories/                  # Repository implementations
│   │   └── Configurations/                # EF entity configurations
│   ├── Services/                          # External service implementations
│   └── Caching/                           # Redis cache layer
└── RetailERP.{Service}.API/              # Interface Adapters
    ├── Controllers/                       # REST API controllers
    ├── Middleware/                         # Custom middleware
    ├── Filters/                           # Action/exception filters
    ├── Extensions/                        # DI registration extensions
    └── Program.cs                         # Application entry point
```

## Database Schema Architecture

```mermaid
erDiagram
    TENANTS ||--o{ USERS : has
    TENANTS ||--o{ CLIENTS : has
    TENANTS ||--o{ BRANDS : has
    TENANTS ||--o{ ARTICLES : has
    TENANTS ||--o{ WAREHOUSES : has

    CLIENTS ||--o{ STORES : has
    STORES ||--o{ CUSTOMER_ORDERS : places
    STORES ||--o{ CUSTOMER_MASTER_ENTRIES : "billing details"

    BRANDS ||--o{ ARTICLES : categorizes
    SEGMENTS ||--o{ SUB_SEGMENTS : contains
    CATEGORIES ||--o{ SUB_CATEGORIES : contains
    SEASONS ||--o{ ARTICLES : seasonal
    GROUPS ||--o{ ARTICLES : groups
    GENDERS ||--o{ ARTICLES : "targets"

    ARTICLES ||--o{ ARTICLE_SIZES : has_sizes
    ARTICLES ||--o{ ARTICLE_IMAGES : has_images
    ARTICLES ||--o{ FOOTWEAR_DETAILS : "footwear spec"
    ARTICLES ||--o{ LEATHER_GOODS_DETAILS : "leather spec"
    ARTICLES ||--o{ PRODUCTION_ORDERS : produces
    ARTICLES ||--o{ ORDER_LINES : ordered_in
    ARTICLES ||--o{ STOCK_LEDGER : tracked_in

    WAREHOUSES ||--o{ STOCK_LEDGER : tracks
    STOCK_LEDGER ||--o{ STOCK_MOVEMENTS : records

    CUSTOMER_ORDERS ||--o{ ORDER_LINES : contains
    CUSTOMER_ORDERS ||--o{ INVOICES : generates

    PRODUCTION_ORDERS ||--o{ PRODUCTION_SIZE_RUNS : sized

    INVOICES ||--o{ INVOICE_LINES : contains
    INVOICES ||--o{ PACKING_LISTS : packed_in
    INVOICES ||--o{ DELIVERY_NOTES : delivered_via

    PACKING_LISTS ||--o{ PACKING_LIST_LINES : contains

    ROLES ||--o{ ROLE_PERMISSIONS : has
    PERMISSIONS ||--o{ ROLE_PERMISSIONS : granted_to
    USERS ||--o{ REFRESH_TOKENS : authenticates
```

## Multi-Tenant Architecture

Every entity in the system is scoped by `TenantId`:

```mermaid
graph LR
    subgraph "Tenant A (Company Alpha)"
        A_USERS[Users]
        A_ARTICLES[Articles]
        A_ORDERS[Orders]
        A_STOCK[Stock]
    end

    subgraph "Tenant B (Company Beta)"
        B_USERS[Users]
        B_ARTICLES[Articles]
        B_ORDERS[Orders]
        B_STOCK[Stock]
    end

    subgraph "Shared Database"
        DB[(SQL Server<br/>TenantId on every row)]
    end

    A_USERS --> DB
    A_ARTICLES --> DB
    B_USERS --> DB
    B_ARTICLES --> DB
```

**Tenant isolation is enforced at:**
1. **Database level** -- `TenantId` column and unique constraints per tenant
2. **API level** -- `TenantId` extracted from JWT claims on every request
3. **Query level** -- All queries filter by `TenantId`

## API Gateway Architecture

The YARP gateway provides:

```mermaid
graph LR
    CLIENT[Client Request] --> RL[Rate Limiter<br/>100 req/min per IP]
    RL --> CORS[CORS Policy<br/>AllowFrontend]
    CORS --> PROXY[YARP Reverse Proxy]
    PROXY --> AUTH_SVC[Auth Service /api/auth/*]
    PROXY --> PROD_SVC[Product Service /api/articles/*]
    PROXY --> INV_SVC[Inventory Service /api/stock/*]
    PROXY --> ORD_SVC[Order Service /api/orders/*]
    PROXY --> PROD_ORD_SVC[Production Service /api/productionorders/*]
    PROXY --> BILL_SVC[Billing Service /api/invoices/*]
    PROXY --> RPT_SVC[Reporting Service /api/reports/*]
```

Key features:
- **Rate limiting**: 100 requests per minute per IP (fixed window)
- **CORS**: Configured origins (frontend URLs)
- **No gateway-level auth**: Each service validates JWT independently
- **Health check**: `/health` endpoint
- **Metrics**: Prometheus `/metrics` endpoint

## Authentication & Authorization Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant GW as Gateway
    participant AUTH as Auth Service

    U->>FE: Enter email/password
    FE->>GW: POST /api/auth/login
    GW->>AUTH: Forward
    AUTH->>AUTH: Validate credentials (BCrypt)
    AUTH->>AUTH: Generate JWT (sub, tenantId, role)
    AUTH->>AUTH: Generate Refresh Token
    AUTH-->>GW: { accessToken, refreshToken, user }
    GW-->>FE: Tokens
    FE->>FE: Store in localStorage

    Note over FE: Subsequent API calls
    FE->>GW: GET /api/articles (Authorization: Bearer <JWT>)
    GW->>GW: Proxy to Product Service
    Note over GW: Product Service validates JWT

    Note over FE: Token expired
    FE->>GW: POST /api/auth/refresh { refreshToken }
    GW->>AUTH: Forward
    AUTH->>AUTH: Validate & rotate refresh token
    AUTH-->>GW: New access + refresh tokens
    GW-->>FE: New tokens
```

### JWT Claims Structure

| Claim | Description |
|-------|-------------|
| `sub` | User ID (GUID) |
| `tenantId` | Tenant ID (GUID) |
| `email` | User email |
| `tenantName` | Company name |
| `role` | User role (Admin, Manager, Warehouse, Sales, Accounts, Viewer) |

### RBAC Permission Matrix

| Permission | Admin | Manager | Warehouse | Sales | Accounts | Viewer |
|-----------|-------|---------|-----------|-------|----------|--------|
| Dashboard | View | View | View | View | View | View |
| Users | CRUD | View | - | - | - | - |
| Roles | CRUD | View | - | - | - | - |
| Articles | CRUD | CRUD | View | View | View | View |
| Stock | CRUD | CRUD | CRUD | View | View | View |
| Orders | CRUD | CRUD | View | CRUD | View | View |
| Invoices | CRUD | CRUD | View | View | CRUD | View |
| Reports | View | View | View | View | View | View |

## Technology Decisions

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Frontend | Next.js 15 + ShadCN | SSR-capable, App Router, enterprise UI components |
| Backend | ASP.NET Core 8 | High performance, enterprise support, mature ecosystem |
| Database | SQL Server 2022 | ACID compliance, stored procedures, enterprise features |
| Cache | Redis 7 | Distributed cache for multi-instance deployment |
| Gateway | YARP | .NET native reverse proxy, configuration-driven routing |
| Auth | JWT + RBAC | Stateless authentication, fine-grained permissions |
| Messaging | RabbitMQ | Asynchronous inter-service communication |
| Containers | Docker + K8s | Orchestration, scaling, self-healing |
| CI/CD | GitHub Actions | Native GitHub integration |
| Logging | Serilog | Structured logging, multiple sinks |
| Metrics | Prometheus + Grafana | Industry standard observability stack |
| State Mgmt | Zustand | Lightweight, TypeScript-first state management |

## Security Architecture

| Concern | Implementation |
|---------|---------------|
| Authentication | JWT tokens with refresh token rotation |
| Authorization | RBAC with per-module permission matrix (View/Add/Edit/Delete) |
| API Rate Limiting | 100 requests/min per IP via YARP gateway |
| Input Validation | FluentValidation on all API boundaries |
| SQL Injection | Entity Framework parameterized queries + Dapper parameterized queries |
| Audit Logging | `audit.AuditLog` table records all mutations with old/new values |
| Transport | HTTPS everywhere |
| CORS | Restricted to known frontend origins |
| Password Storage | BCrypt hashing |
| Token Storage | Access token in localStorage, refresh token with rotation |
| Tenant Isolation | TenantId on every row, enforced at query level |

## Design Patterns Used

| Pattern | Where |
|---------|-------|
| Clean Architecture | Every microservice (4 layers) |
| Repository Pattern | Infrastructure layer data access |
| Unit of Work | EF Core DbContext per request |
| CQRS (partial) | Reporting service uses Dapper for reads, EF Core for writes elsewhere |
| API Gateway | YARP reverse proxy as single entry point |
| Observer/Event Bus | RabbitMQ for inter-service events |
| Strategy Pattern | GST calculation (IGST vs CGST+SGST based on inter-state flag) |
| Factory Pattern | JWT token generation |
| Singleton | Redis cache connections, Serilog logger |
