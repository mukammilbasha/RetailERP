# IIS Deployment (Windows Server)

Deploy RetailERP on Windows Server using IIS with .NET 8 hosting and iisnode for the Next.js frontend.

## Prerequisites

- Windows Server 2019/2022 or Windows 10/11 Pro
- PowerShell 5.1+
- Administrator privileges
- SQL Server 2019/2022 (or SQL Server on Docker)

## One-Time IIS Setup

Run once per server to install all IIS features, Node.js, iisnode, and URL Rewrite:

```powershell
# Sets up IIS features, Node.js 20, iisnode, URL Rewrite, app pools, firewall rules
powershell -ExecutionPolicy Bypass deployment/iis/setup-iisnode.ps1
```

What it installs:
- IIS Web Server role + ASP.NET features
- Node.js 20 LTS
- iisnode MSI handler
- URL Rewrite 2.1 module
- App pools (no managed runtime) for each service
- Windows Firewall rules for ports 5000–5007, 3003

## Deploying

```powershell
# Deploy to dev environment (interactive confirmation)
powershell deployment/iis/deploy-iis.ps1 -Environment dev

# Deploy to production (non-interactive for CI)
powershell deployment/iis/deploy-iis.ps1 -Environment prod -NonInteractive
```

The script:
1. **Pre-flight** — verifies WebAdministration module, .NET 8 runtime, published output
2. **Backup** — copies current site to timestamped folder (keeps last 5 backups)
3. **Stop** — stops app pools for all services
4. **Deploy** — copies published artifacts from `publish/` to site roots
5. **Configure** — applies environment-specific `appsettings.{Env}.json`
6. **Migrate** — runs EF Core database migrations
7. **Start** — creates (if needed) and starts IIS sites + app pools
8. **Verify** — polls each `/health` endpoint; auto-rollbacks if any fail

## IIS Sites Created

| Site Name | Port | App Pool | Backend |
|-----------|------|----------|---------|
| RetailERP-Gateway | 5000 | RetailERP-Gateway | .NET 8 |
| RetailERP-Auth | 5001 | RetailERP-Auth | .NET 8 |
| RetailERP-Product | 5002 | RetailERP-Product | .NET 8 |
| RetailERP-Inventory | 5003 | RetailERP-Inventory | .NET 8 |
| RetailERP-Order | 5004 | RetailERP-Order | .NET 8 |
| RetailERP-Billing | 5006 | RetailERP-Billing | .NET 8 |
| RetailERP-Reporting | 5007 | RetailERP-Reporting | .NET 8 |
| RetailERP-Frontend | 3003 | RetailERP-Frontend | iisnode (Next.js) |

## Frontend Configuration

`deployment/iis/frontend-web.config` configures iisnode:

```xml
<!-- Routes everything through iisnode → server.js (Next.js standalone) -->
<!-- Static files served directly by IIS (bypasses Node) -->
<!-- Security headers: X-Frame-Options DENY, CSP, HSTS -->
<!-- 50 MB request size limit -->
```

## Rollback

```powershell
# List available backups and choose one to restore
powershell deployment/iis/rollback-iis.ps1 -Environment prod

# Non-interactive (picks most recent backup)
powershell deployment/iis/rollback-iis.ps1 -Environment prod -NonInteractive
```

Backups are stored at: `C:\RetailERP\backups\{service}-{timestamp}\`

## Publishing .NET Services

Before deploying, publish each service:

```powershell
dotnet publish src/services/Auth/RetailERP.Auth.API \
  -c Release -r win-x64 --self-contained false \
  -o publish/auth-api

dotnet publish src/services/Product/RetailERP.Product.API \
  -c Release -r win-x64 --self-contained false \
  -o publish/product-api

# ... repeat for each service
```

## Publishing Next.js Frontend

```powershell
powershell deployment/scripts/build-frontend.ps1 -Environment prod
# Outputs to publish/frontend/ using Next.js standalone mode
```

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| HTTP 503 Service Unavailable | App pool stopped | `Start-WebAppPool -Name "RetailERP-Auth"` |
| HTTP 500.19 | web.config syntax error | Check Event Viewer → Windows Logs → Application |
| iisnode 0x6d HRESULT | Node.js not found | Verify Node path in iisnode.yml, restart IIS |
| EF Core migration fails | DB connection error | Check `ConnectionStrings__DefaultConnection` in appsettings |
| Port already in use | Conflicting binding | `netstat -ano \| findstr ":5001"` then kill process |
