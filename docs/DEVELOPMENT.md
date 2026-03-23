# RetailERP - Developer Guide

## Local Development Setup

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| .NET SDK | 8.0+ | Backend microservices |
| Node.js | 20+ | Frontend build and dev server |
| SQL Server | 2022 | Database (or Docker) |
| Redis | 7+ | Caching (or Docker) |
| Docker Desktop | 4.x+ | Infrastructure services |
| Git | Latest | Version control |
| IDE | VS Code / Visual Studio / Rider | Development |

### Step 1: Clone the Repository

```bash
git clone <repo-url>
cd RetailERP
```

### Step 2: Start Infrastructure

The easiest way to get SQL Server and Redis running:

```bash
# Start only infrastructure (SQL Server + Redis)
docker-compose up -d sqlserver redis db-init

# Wait for db-init to complete (check logs)
docker-compose logs -f db-init
```

### Step 3: Run Backend Services

Each microservice can be run independently. Open separate terminals for each:

```bash
# Auth Service (Port 5001)
cd src/services/auth/RetailERP.Auth.API
dotnet run

# Product Service (Port 5002)
cd src/services/product/RetailERP.Product.API
dotnet run

# Inventory Service (Port 5003)
cd src/services/inventory/RetailERP.Inventory.API
dotnet run

# Order Service (Port 5004)
cd src/services/order/RetailERP.Order.API
dotnet run

# Production Service (Port 5005)
cd src/services/production/RetailERP.Production.API
dotnet run

# Billing Service (Port 5006)
cd src/services/billing/RetailERP.Billing.API
dotnet run

# Reporting Service (Port 5007)
cd src/services/reporting/RetailERP.Reporting.API
dotnet run

# API Gateway (Port 5000)
cd src/services/gateway
dotnet run
```

Or start the full backend via Docker and just run the frontend locally:

```bash
docker-compose up -d  # starts everything including backend
```

### Step 4: Run Frontend

```bash
cd src/frontend
npm install
npm run dev
# Open http://localhost:3000
```

### Step 5: Login

Use the default admin credentials:
- **Email**: admin@elcurio.com
- **Password**: Admin@123

## Project Structure

```
RetailERP/
├── RetailERP.sln                  # .NET solution file
├── CLAUDE.md                      # AI assistant configuration
├── docker-compose.yml             # Full-stack Docker Compose
├── database/                      # SQL Server scripts
├── docker/                        # Dockerfiles
├── k8s/                           # Kubernetes manifests
├── docs/                          # Documentation
├── scripts/                       # Utility scripts
└── src/
    ├── frontend/                  # Next.js 15 application
    ├── services/                  # .NET microservices (9 services)
    └── shared/                    # Shared .NET libraries
```

### Shared Libraries

| Library | Purpose |
|---------|---------|
| `RetailERP.Shared.Contracts` | DTOs, request/response types, API contracts |
| `RetailERP.Shared.Domain` | Base entity classes, common value objects |
| `RetailERP.Shared.Infrastructure` | Base repository, EF Core configurations, middleware |

## Code Conventions

### Backend (.NET / C#)

| Convention | Rule |
|-----------|------|
| Architecture | Clean Architecture (4 layers per service) |
| Naming | PascalCase for public members, _camelCase for private fields |
| DTOs | Record types where possible |
| Validation | FluentValidation in Application layer |
| ORM | Entity Framework Core for CRUD, Dapper for reports |
| Async | All database operations are async with CancellationToken |
| DI | Constructor injection, register in Extension methods |
| Logging | Serilog with structured logging |
| Error Handling | Global exception middleware |
| API Response | Wrap all responses in `ApiResponse<T>` |
| Tenant Isolation | Extract TenantId from JWT claims in every controller |

**Controller Pattern:**
```csharp
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ExampleController : ControllerBase
{
    private Guid TenantId => Guid.Parse(User.FindFirst("tenantId")?.Value
        ?? throw new UnauthorizedAccessException());
    private Guid UserId => Guid.Parse(User.FindFirst("sub")?.Value
        ?? throw new UnauthorizedAccessException());
}
```

### Frontend (TypeScript / React)

| Convention | Rule |
|-----------|------|
| Framework | Next.js 15 App Router |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS utility classes |
| State | Zustand stores (auth-store, theme-store) |
| HTTP | Axios with interceptors (`lib/api.ts`) |
| Components | Functional components with hooks |
| Naming | PascalCase for components, camelCase for functions/variables |
| Pages | `"use client"` directive for interactive pages |
| Icons | Lucide React |
| Formatting | Utility functions in `lib/utils.ts` |

**Page Pattern:**
```typescript
"use client";

import { useState, useEffect, useCallback } from "react";
import api, { type ApiResponse } from "@/lib/api";
import { DataTable, type Column } from "@/components/ui/data-table";

export default function ExamplePage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get<ApiResponse<any>>("/api/example");
      if (res.success) setData(res.data);
    } catch { /* handle error */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (/* JSX */);
}
```

### Database (SQL Server)

| Convention | Rule |
|-----------|------|
| Schemas | Logical grouping (auth, master, product, sales, etc.) |
| Primary Keys | `UNIQUEIDENTIFIER` with `NEWSEQUENTIALID()` |
| Naming | PascalCase table and column names |
| Soft Delete | `IsActive BIT DEFAULT 1` flag |
| Timestamps | `CreatedAt DATETIME2(7)` with `SYSUTCDATETIME()` |
| Audit | `CreatedBy UNIQUEIDENTIFIER` on mutable entities |
| Tenant | `TenantId UNIQUEIDENTIFIER` on every business table |
| Constraints | Named constraints with prefixes (PK_, FK_, UQ_, CK_) |

## Common Development Tasks

### Adding a New Master Data Entity

1. **Database**: Add table to `database/tables/003_master_tables.sql`
2. **Domain**: Create entity in `RetailERP.{Service}.Domain/Entities/`
3. **Application**: Create DTO, service interface, and service implementation
4. **Infrastructure**: Add `DbSet<T>` to DbContext, add EF configuration
5. **API**: Create controller with CRUD endpoints
6. **Shared**: Add DTOs to `RetailERP.Shared.Contracts`
7. **Frontend**: Create page at `app/dashboard/masters/{entity}/page.tsx`
8. **Sidebar**: Add navigation entry in `components/layout/sidebar.tsx`
9. **Permissions**: Add module to seed data

### Adding a New API Endpoint

1. Add method to the service interface in Application layer
2. Implement the method in Application/Services
3. Add controller action in API/Controllers
4. Test via Swagger or curl
5. Update API documentation

### Adding a New Frontend Page

1. Create directory under `app/dashboard/{module}/`
2. Create `page.tsx` with `"use client"` directive
3. Use `DataTable` component for list views
4. Use `Modal` component for create/edit forms
5. Add route to sidebar navigation in `components/layout/sidebar.tsx`

### Adding a New Report

1. Add SQL query to `ReportsController.cs`
2. Create report DTO class
3. Add new tab to `app/dashboard/reports/page.tsx`
4. Add CSV export column definitions

### Modifying the Database

1. Add/modify SQL in the appropriate table file
2. If modifying existing tables, create a migration script
3. Update the EF Core entity and configuration
4. Update seed data if needed
5. Re-run the affected SQL scripts

## Testing Strategy

### Backend Testing

| Level | Framework | Location |
|-------|-----------|----------|
| Unit Tests | xUnit + Moq | `tests/unit/` |
| Integration Tests | xUnit + TestServer | `tests/integration/` |
| API Tests | Postman / curl | Manual / collections |

**Testing Guidelines:**
- Test behavior, not implementation details
- Use in-memory database for unit tests
- Use real SQL Server for integration tests
- Mock external dependencies (Redis, RabbitMQ)
- Test happy paths and error cases
- Validate tenant isolation in every test

### Frontend Testing

| Level | Framework | Description |
|-------|-----------|-------------|
| Component Tests | React Testing Library | UI component behavior |
| Integration | Cypress / Playwright | End-to-end user flows |
| Type Checking | TypeScript Compiler | Compile-time type safety |

### Manual Testing Checklist

- [ ] Login with different roles (Admin, Warehouse, Viewer)
- [ ] CRUD operations on all master data entities
- [ ] Create an order with size-wise quantities
- [ ] Check stock availability before ordering
- [ ] Create and finalize an invoice
- [ ] Generate packing list for an invoice
- [ ] Run all report types with date filters
- [ ] Test theme switching (all 5 themes, dark/light)
- [ ] Test sidebar collapse/expand
- [ ] Test mobile responsive layout
- [ ] Verify permission restrictions per role

## Debugging

### Backend

```bash
# Run with detailed logging
ASPNETCORE_ENVIRONMENT=Development dotnet run

# View SQL queries (add to appsettings.Development.json)
{
  "Logging": {
    "LogLevel": {
      "Microsoft.EntityFrameworkCore.Database.Command": "Information"
    }
  }
}
```

### Frontend

```bash
# Development server with hot reload
npm run dev

# Build for production (catches type errors)
npm run build

# Environment variable debugging
echo $NEXT_PUBLIC_API_URL
```

### Database

```bash
# Connect to SQL Server in Docker
docker exec -it retailerp-sqlserver /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P "RetailERP@2024!" -C -d RetailERP

# Useful queries
SELECT COUNT(*) FROM auth.Users;
SELECT * FROM audit.AuditLog ORDER BY Timestamp DESC;
SELECT * FROM inventory.StockMovements ORDER BY MovementDate DESC;
```

## Git Workflow

1. Create feature branch from `main`: `git checkout -b feature/your-feature`
2. Make changes following code conventions
3. Test locally
4. Commit with descriptive message
5. Push and create pull request
6. Code review
7. Merge to `main`

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| SQL Server won't start | Check Docker memory allocation (needs 2GB+). Verify password meets complexity requirements. |
| 401 Unauthorized | Check JWT token expiry. Verify `Jwt__Secret` matches across services. |
| CORS errors | Verify frontend URL is in gateway CORS config (`Cors__Origins__*`). |
| Port conflicts | Change port mappings in `docker-compose.yml`. |
| Frontend can't reach API | Check `NEXT_PUBLIC_API_URL` is set correctly. Ensure gateway is running. |
| Database schema errors | Run SQL scripts in correct order. Check for existing objects. |
| Redis connection failed | Verify Redis container is healthy. Check port mapping. |
