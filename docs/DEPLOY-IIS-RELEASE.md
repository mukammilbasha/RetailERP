# IIS — Release Pack Guide

Complete step-by-step walkthrough: build → package → transfer → install on any Windows Server.

---

## Overview

The IIS release workflow uses **two scripts**:

| Script | Where to run | Purpose |
|--------|-------------|---------|
| `deployment/iis/release-iis.ps1` | **Build machine** (dev laptop / CI) | Checks prereqs, builds all .NET services + Next.js, creates a self-contained ZIP |
| `deployment/iis/pack/Install.ps1` | **Target Windows Server** | Installs prereqs, deploys to IIS, runs health checks, auto-rollbacks on failure |

---

## Prerequisites

### Build Machine

| Requirement | Check |
|-------------|-------|
| Windows 10/11 or Windows Server 2019/2022 | `winver` |
| PowerShell 5.1+ (run as Administrator) | `$PSVersionTable.PSVersion` |
| .NET 8 SDK | `dotnet --version` |
| Node.js 20 LTS | `node --version` |
| Git | `git --version` |

> **Tip:** If .NET SDK or Node.js is missing, `release-iis.ps1` will download and install them automatically.

### Target Windows Server

| Requirement | Notes |
|-------------|-------|
| Windows Server 2019 or 2022 | 64-bit |
| PowerShell 5.1+ (run as Administrator) | Built-in on all versions |
| SQL Server 2019/2022 | Can be on a separate DB server |
| 4 GB RAM minimum | 8 GB+ recommended for production |
| Ports 5000–5007, 3003 open | Script creates firewall rules automatically |

> All other dependencies (.NET Hosting Bundle, Node.js, IIS features, iisnode, URL Rewrite) are **installed automatically** by `Install.ps1`.

---

## Step 1 — Run the Release Builder (Build Machine)

Open **PowerShell as Administrator**. You can run the script two ways:

**Option A — from the repo root (recommended):**

```powershell
cd E:\Claude_AI\RetailERP

powershell -ExecutionPolicy Bypass -File deployment\iis\release-iis.ps1 -Environment prod -Version v1.2.3
```

**Option B — from inside `deployment\iis\` using `.\`:**

```powershell
cd E:\Claude_AI\RetailERP\deployment\iis

powershell -ExecutionPolicy Bypass -File .\release-iis.ps1 -Environment prod -Version v1.2.3
```

> **Common mistake:** If you are already inside `deployment\iis\`, do **not** repeat the full path — use `.\release-iis.ps1`.

### Build + deploy to the same machine right now

```powershell
# From repo root:
powershell -ExecutionPolicy Bypass -File deployment\iis\release-iis.ps1 -Environment dev -DeployNow

# Or from deployment\iis\:
powershell -ExecutionPolicy Bypass -File .\release-iis.ps1 -Environment dev -DeployNow
```

### All parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `-Environment` | *(required)* | `dev` / `qa` / `uat` / `prod` |
| `-Version` | Latest git tag or short hash | Version label in the pack name |
| `-DeployNow` | off | Also deploy to local IIS after packing |
| `-PackOnly` | off | Build + pack, skip local deploy |
| `-SkipBuild` | off | Skip dotnet publish / npm build, repack existing `publish/` |
| `-SkipPrereqs` | off | Skip prerequisite installation |
| `-Force` | off | Overwrite existing pack without prompt |

### What happens during the build (5 phases)

```
PHASE 1 — Checks / installs prerequisites
         .NET 8 SDK, .NET 8 Hosting Bundle, Node.js, IIS features, iisnode, URL Rewrite

PHASE 2 — dotnet publish (Release, win-x64) for all 8 services
         gateway → auth → product → inventory → order → production → billing → reporting
         Output: publish/<service>/

PHASE 3 — Next.js build (standalone output)
         npm ci + next build + copies .next/standalone + public/ + .next/static/
         Output: publish/frontend/

PHASE 4 — Assemble release pack
         Copies services, frontend, configs, database scripts, installer scripts
         Writes manifest.json + README.md
         Creates ZIP archive

PHASE 5 — (optional) Deploy locally when -DeployNow is set
```

---

## Step 2 — Verify the Release Pack

After the build completes, find your pack here:

```
deployment\iis\release\
├── RetailERP-v1.2.3-iis-prod\        ← extracted folder
│   ├── Install.ps1                    ← run this on the target server
│   ├── Rollback.ps1                   ← rollback to last backup
│   ├── Uninstall.ps1                  ← clean removal
│   ├── manifest.json                  ← version + service list
│   ├── README.md                      ← quick instructions
│   ├── services\
│   │   ├── gateway\                   ← .NET published output
│   │   ├── auth\
│   │   ├── product\
│   │   ├── inventory\
│   │   ├── order\
│   │   ├── production\
│   │   ├── billing\
│   │   └── reporting\
│   ├── frontend\                      ← Next.js standalone
│   ├── config\
│   │   ├── appsettings.Dev.json
│   │   ├── appsettings.QA.json
│   │   ├── appsettings.UAT.json
│   │   └── appsettings.Production.json
│   └── database\                      ← SQL scripts (idempotent)
└── RetailERP-v1.2.3-iis-prod.zip     ← distribute this file
```

Open `manifest.json` to confirm the build metadata:

```json
{
  "product": "RetailERP",
  "version": "v1.2.3",
  "environment": "prod",
  "builtAt": "2026-03-24T09:00:00Z",
  "builtBy": "username"
}
```

---

## Step 3 — Transfer the ZIP to the Target Server

Copy `RetailERP-v1.2.3-iis-prod.zip` to the Windows Server using any method:

```powershell
# Option A — PowerShell remote copy
Copy-Item "deployment\iis\release\RetailERP-v1.2.3-iis-prod.zip" `
  -Destination "\\SERVER\C$\deploy\" `
  -Force

# Option B — SCP (if OpenSSH is installed)
scp deployment\iis\release\RetailERP-v1.2.3-iis-prod.zip administrator@SERVER:/C:/deploy/

# Option C — Azure Blob / S3 / shared drive — copy the ZIP any way you prefer
```

---

## Step 4 — Extract and Install on the Target Server

Log in to the **Windows Server** and open **PowerShell as Administrator**.

```powershell
# Extract the ZIP
Expand-Archive -Path "C:\deploy\RetailERP-v1.2.3-iis-prod.zip" `
               -DestinationPath "C:\deploy\RetailERP-v1.2.3-iis-prod" `
               -Force

# Navigate into the pack
Set-Location "C:\deploy\RetailERP-v1.2.3-iis-prod"

# Run the installer
powershell -ExecutionPolicy Bypass -File Install.ps1 -Environment prod
```

### Non-interactive install (CI / automated pipelines)

```powershell
powershell -ExecutionPolicy Bypass -File Install.ps1 `
  -Environment prod `
  -NonInteractive `
  -SkipDatabase        # omit if this is a fresh server
```

### What Install.ps1 does (8 steps)

```
STEP 1  Prerequisites
        Downloads and installs (if missing):
        • .NET 8 Hosting Bundle
        • Node.js 20 LTS
        • IIS Web Server role + ASP.NET features
        • iisnode handler
        • URL Rewrite 2.1

STEP 2  Backup
        Copies current C:\RetailERP\Services\ and Frontend\
        to C:\RetailERP\Backups\<timestamp>\
        Keeps the last 5 backups automatically

STEP 3  Stop app pools
        Gracefully stops all 9 IIS application pools

STEP 4  Copy files
        Copies services + frontend from the pack to C:\RetailERP\
        Applies environment-specific appsettings.<env>.json
        Sets IIS AppPool read+execute permissions

STEP 5  Database
        Creates the RetailERP database if it does not exist
        Runs all SQL scripts in database\ folder (idempotent)

STEP 6  Configure IIS
        Creates / reconfigures app pools (no managed runtime, AlwaysRunning)
        Creates / updates sites on the correct ports
        Sets ASPNETCORE_ENVIRONMENT + ASPNETCORE_URLS on each pool
        Adds Windows Firewall rules for all service ports

STEP 7  Start services
        Runs iisreset, then starts all 9 app pools and sites

STEP 8  Health checks
        Waits 20 seconds, then checks /health on every service
        Auto-rollbacks to the last backup if any service fails
```

---

## Step 5 — Verify the Installation

After the installer finishes, confirm all services are responding:

```powershell
# Quick health check — all services
$ports = @{Gateway=5000;Auth=5001;Product=5002;Inventory=5003;
           Order=5004;Production=5005;Billing=5006;Reporting=5007}

foreach ($svc in $ports.GetEnumerator()) {
    $url = "http://localhost:$($svc.Value)/health"
    try {
        $r = Invoke-WebRequest -Uri $url -TimeoutSec 5 -UseBasicParsing
        Write-Host "  [OK] $($svc.Key) → HTTP $($r.StatusCode)" -ForegroundColor Green
    } catch {
        Write-Host "  [!!] $($svc.Key) → UNREACHABLE" -ForegroundColor Red
    }
}

# Frontend
Invoke-WebRequest -Uri "http://localhost:3003/" -UseBasicParsing | Select-Object StatusCode
```

### Expected service URLs

| Service | URL |
|---------|-----|
| Gateway | `http://SERVER:5000/health` |
| Auth | `http://SERVER:5001/health` |
| Product | `http://SERVER:5002/health` |
| Inventory | `http://SERVER:5003/health` |
| Order | `http://SERVER:5004/health` |
| Production | `http://SERVER:5005/health` |
| Billing | `http://SERVER:5006/health` |
| Reporting | `http://SERVER:5007/health` |
| Frontend | `http://SERVER:3003/` |

---

## Step 6 — Check IIS Manager

1. Open **IIS Manager** (`inetmgr`)
2. Under **Sites** you should see 9 sites: `RetailERP-Gateway`, `RetailERP-Auth`, ... , `RetailERP-Frontend`
3. All sites should show **Started** (green play icon)
4. Under **Application Pools** each pool should show **Started** with **No Managed Code** pipeline

To start a stopped pool manually:

```powershell
Import-Module WebAdministration
Start-WebAppPool -Name "RetailERP-Auth"
Start-Website    -Name "RetailERP-Auth"
```

---

## Rollback

If something goes wrong after install, roll back to the previous backup:

```powershell
# Interactive — lists available backups and prompts to choose
powershell -ExecutionPolicy Bypass -File Rollback.ps1 -Environment prod

# Non-interactive — automatically restores the most recent backup
powershell -ExecutionPolicy Bypass -File Rollback.ps1 -Environment prod -Auto
```

Backups are stored at `C:\RetailERP\Backups\<timestamp>\`.

---

## Uninstall

To completely remove RetailERP from IIS:

```powershell
# Remove sites + app pools + firewall rules (keeps files)
powershell -ExecutionPolicy Bypass -File Uninstall.ps1

# Remove everything including C:\RetailERP\ files
powershell -ExecutionPolicy Bypass -File Uninstall.ps1 -RemoveFiles
```

---

## Logs

| File | Contents |
|------|----------|
| `C:\RetailERP\Logs\deploy-<timestamp>.log` | Full install log |
| `C:\RetailERP\Logs\deployments.json` | Audit trail of all deployments |
| `C:\RetailERP\Services\<Name>\Logs\` | ASP.NET Core stdout logs per service |
| Windows Event Viewer → Application | IIS / .NET runtime errors |

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| App pool stops immediately | .NET Hosting Bundle not applied | Run `iisreset` after install |
| HTTP 503 on all ports | App pool crashed on start | Check Event Viewer → Application for CLR errors |
| HTTP 500.30 | Wrong `ASPNETCORE_ENVIRONMENT` | Verify env var on app pool in IIS Manager |
| SQL Server connection refused | Wrong connection string | Check `appsettings.prod.json` → `ConnectionStrings.Default` |
| Frontend shows blank page | `NEXT_PUBLIC_API_URL` mismatch | Must point to Gateway `:5000` |
| iisnode handler not found | iisnode not installed or IIS not restarted | Run `iisreset`, verify `C:\Program Files\iisnode\iisnode.dll` |
| 401 Unauthorized on all API calls | JWT secret mismatch across services | All services must share the same `Jwt__Secret` value |
| Deploy fails health check + rollback | Service startup timeout | Increase `Start-Sleep` in Install.ps1 Step 7 for slow hardware |
| `Access is denied` on install | Not running as Administrator | Right-click PowerShell → Run as Administrator |

---

## Environment Variables Reference

Set these as App Pool environment variables in IIS (or in `appsettings.<env>.json`):

| Variable | Example | Service |
|----------|---------|---------|
| `ASPNETCORE_ENVIRONMENT` | `Production` | All APIs |
| `ASPNETCORE_URLS` | `http://+:5001` | All APIs (auto-set by installer) |
| `ConnectionStrings__Default` | `Server=...` | All APIs |
| `Jwt__Secret` | *(32+ char secret)* | Auth + Gateway |
| `RETAILERP_PROD_CONNECTION` | `Server=...;Database=...` | Read by Install.ps1 |
| `NODE_ENV` | `production` | Frontend |
| `PORT` | `3003` | Frontend |

For production, set `RETAILERP_PROD_CONNECTION` as a **machine-level** environment variable on the server **before** running `Install.ps1`:

```powershell
[Environment]::SetEnvironmentVariable(
  "RETAILERP_PROD_CONNECTION",
  "Server=SQL-SERVER;Database=RetailERP;User Id=retailerp;Password=SECRET;TrustServerCertificate=true",
  "Machine"
)
```
