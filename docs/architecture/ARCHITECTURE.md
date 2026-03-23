# RetailERP - Enterprise Architecture Document

## System Overview

**EL CURIO RetailERP** is a multi-tenant retail distribution platform for footwear, bags, and belts manufacturing and distribution. It manages inventory, billing, analytics, and warehouse operations from a single platform.

## Architecture Diagram

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Next.js 15 Frontend]
        MOBILE[Mobile App - Future]
    end

    subgraph "API Gateway Layer"
        GW[YARP API Gateway<br/>Rate Limiting / Auth / Routing]
    end

    subgraph "Microservices Layer"
        AUTH[Auth Service<br/>JWT + RBAC]
        USER[User Service<br/>User Management]
        PROD[Product Service<br/>Article Master + Masters]
        INV[Inventory Service<br/>Stock Ledger + Movement]
        PRODUCTION[Production Service<br/>Production Orders]
        ORD[Order Service<br/>Customer Orders]
        BILL[Billing Service<br/>GST + Invoicing]
        WH[Warehouse Service<br/>Warehouse Management]
        RPT[Reporting Service<br/>Analytics + Reports]
    end

    subgraph "Infrastructure Layer"
        REDIS[(Redis Cache)]
        SQL[(SQL Server)]
        MQ[RabbitMQ<br/>Event Bus]
    end

    subgraph "Observability"
        LOG[Serilog]
        PROM[Prometheus]
        GRAF[Grafana]
    end

    WEB --> GW
    GW --> AUTH
    GW --> USER
    GW --> PROD
    GW --> INV
    GW --> PRODUCTION
    GW --> ORD
    GW --> BILL
    GW --> WH
    GW --> RPT

    AUTH --> SQL
    AUTH --> REDIS
    USER --> SQL
    PROD --> SQL
    PROD --> REDIS
    INV --> SQL
    INV --> MQ
    PRODUCTION --> SQL
    PRODUCTION --> MQ
    ORD --> SQL
    ORD --> MQ
    BILL --> SQL
    WH --> SQL
    WH --> MQ
    RPT --> SQL
    RPT --> REDIS

    AUTH --> LOG
    LOG --> PROM
    PROM --> GRAF
```

## Service Communication

```mermaid
sequenceDiagram
    participant C as Client
    participant GW as API Gateway
    participant AUTH as Auth Service
    participant ORD as Order Service
    participant INV as Inventory Service
    participant BILL as Billing Service

    C->>GW: Place Order
    GW->>AUTH: Validate JWT Token
    AUTH-->>GW: Token Valid
    GW->>ORD: Create Order
    ORD->>INV: Check Stock Availability
    INV-->>ORD: Stock Available
    ORD->>BILL: Generate Invoice
    BILL-->>ORD: Invoice Created
    ORD-->>GW: Order Confirmed
    GW-->>C: Order Response
```

## Database Schema Overview

```mermaid
erDiagram
    TENANT ||--o{ USER : has
    TENANT ||--o{ CLIENT : has
    CLIENT ||--o{ STORE : has
    STORE ||--o{ CUSTOMER_ORDER : places

    BRAND ||--o{ ARTICLE : categorizes
    SEGMENT ||--o{ SUB_SEGMENT : contains
    CATEGORY ||--o{ SUB_CATEGORY : contains
    SEASON ||--o{ ARTICLE : seasonal
    GROUP_MASTER ||--o{ ARTICLE : groups

    ARTICLE ||--o{ ARTICLE_SIZE : has_sizes
    ARTICLE ||--o{ PRODUCTION_ORDER : produces
    ARTICLE ||--o{ ORDER_LINE : ordered_in

    WAREHOUSE ||--o{ STOCK_LEDGER : tracks
    STOCK_LEDGER ||--o{ STOCK_MOVEMENT : records

    CUSTOMER_ORDER ||--o{ ORDER_LINE : contains
    CUSTOMER_ORDER ||--o{ INVOICE : generates
    INVOICE ||--o{ INVOICE_LINE : contains
    INVOICE ||--o{ PACKING_LIST : packed_in

    PRODUCTION_ORDER ||--o{ PRODUCTION_SIZE_RUN : sized
```

## Clean Architecture per Service

```
Service/
├── Domain/                    # Enterprise Business Rules
│   ├── Entities/
│   ├── ValueObjects/
│   ├── Enums/
│   └── Interfaces/
├── Application/               # Application Business Rules
│   ├── DTOs/
│   ├── Interfaces/
│   ├── Services/
│   ├── Validators/
│   └── Mappings/
├── Infrastructure/            # Frameworks & Drivers
│   ├── Data/
│   │   ├── Context/
│   │   ├── Repositories/
│   │   └── Configurations/
│   ├── Services/
│   └── Caching/
└── API/                       # Interface Adapters
    ├── Controllers/
    ├── Middleware/
    ├── Filters/
    └── Extensions/
```

## Technology Decisions

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Frontend | Next.js 15 + ShadCN | SSR, App Router, enterprise UI components |
| Backend | ASP.NET Core 8 | Performance, enterprise support, ecosystem |
| Database | SQL Server | ACID compliance, stored procs, enterprise features |
| Cache | Redis | Distributed cache for multi-instance deployment |
| Gateway | YARP | .NET native reverse proxy, high performance |
| Auth | JWT + RBAC | Stateless auth, fine-grained permissions |
| Messaging | RabbitMQ | Async inter-service communication |
| Containers | Docker + K8s | Orchestration, scaling, self-healing |
| CI/CD | GitHub Actions | Native GitHub integration |
| Logging | Serilog | Structured logging, multiple sinks |
| Metrics | Prometheus + Grafana | Industry standard observability |

## Security Architecture

- JWT tokens with refresh token rotation
- RBAC with permission matrix (Admin, Manager, Warehouse, Sales, Accounts)
- API rate limiting per tenant
- Input validation at all boundaries
- SQL injection prevention via parameterized queries
- Audit logging for all mutations
- HTTPS everywhere
- CORS restricted to known origins
