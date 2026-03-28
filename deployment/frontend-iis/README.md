# RetailERP Frontend — IIS Deployment (PM2 + ARR)

## Architecture

```
Browser
  │
  ▼ HTTP :3003
IIS Website  (RetailERP-Frontend)
  │  web.config — ARR URL Rewrite rule
  ▼ HTTP 127.0.0.1:3000
PM2 Process  (retailerp-frontend)
  │  ecosystem.config.js
  ▼
Node.js — Next.js Standalone Server
  │  server.js  +  .next/  +  public/
  ▼
API Gateway :5000
```

**Why PM2 + ARR instead of iisnode?**

| | iisnode | PM2 + ARR |
|---|---|---|
| IIS manages Node process | Yes | No (PM2 does) |
| Process clustering / reload | Limited | Full (pm2 reload = zero downtime) |
| Logs | iisnode pipe logs | PM2 log files |
| Windows service auto-start | Via IIS | Via pm2-startup |
| Debug / restart | IIS Manager | `pm2 restart` |
| Recommended for Next.js standalone | No | **Yes** |

---

## Files

| File | Purpose |
|------|---------|
| `Build.ps1` | Build Next.js and assemble deployment package |
| `Install.ps1` | One-click install on IIS server |
| `Redeploy.ps1` | Rebuild + hot-swap running PM2 process |

---

## Workflow

### On your build machine

```powershell
# Build and create zip package
.\Build.ps1 -Pack

# With custom API URL
.\Build.ps1 -ApiUrl http://192.168.1.100:5000 -Pack
```

Output: `dist\` folder + `retailerp-frontend-iis.zip`

### On the IIS server (first time)

```powershell
# Extract the zip, then run as Administrator:
powershell -ExecutionPolicy Bypass -File .\Install.ps1

# Custom port / API
.\Install.ps1 -SitePort 80 -ApiUrl http://api.company.com:5000
```

### Re-deploy (code changes)

```powershell
# Fast: rebuild + reload PM2 (zero-downtime)
.\Redeploy.ps1

# Push to remote server via WinRM
.\Redeploy.ps1 -RemoteHost 192.168.1.50 -ApiUrl http://192.168.1.50:5000
```

---

## PM2 Commands (on IIS server)

```powershell
pm2 list                          # show all apps + status
pm2 logs retailerp-frontend       # live log tail
pm2 logs retailerp-frontend --lines 100  # last 100 lines
pm2 restart retailerp-frontend    # restart (brief downtime)
pm2 reload retailerp-frontend     # graceful reload (zero-downtime)
pm2 stop retailerp-frontend       # stop
pm2 delete retailerp-frontend     # remove from PM2
pm2 monit                         # live dashboard
```

---

## Parameters

### Build.ps1

| Param | Default | Description |
|-------|---------|-------------|
| `-ApiUrl` | `http://localhost:5000` | Backend gateway URL |
| `-AppPort` | `3000` | PM2 Node.js internal port |
| `-SitePort` | `3003` | IIS site HTTP port |
| `-OutputDir` | `.\dist` | Build output directory |
| `-Pack` | off | Create retailerp-frontend-iis.zip |

### Install.ps1

| Param | Default | Description |
|-------|---------|-------------|
| `-SiteName` | `RetailERP-Frontend` | IIS website name |
| `-SitePort` | `3003` | IIS HTTP port |
| `-AppPort` | `3000` | PM2 Node.js port |
| `-DeployPath` | `C:\RetailERP\Frontend` | Install directory |
| `-ApiUrl` | `http://localhost:5000` | API gateway URL |
| `-SkipDeps` | off | Skip IIS/Node/PM2 install (re-deploy only) |

---

## Requirements (target IIS server)

- Windows Server 2016+ or Windows 10/11
- IIS (installed automatically by Install.ps1)
- Internet access during first install (downloads Node, URL Rewrite, ARR)
- PowerShell 5.1+ running as Administrator

## Default Login

```
URL:      http://localhost:3003
Username: admin@elcurio.com
Password: Admin@123
```
