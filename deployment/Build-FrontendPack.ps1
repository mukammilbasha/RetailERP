#Requires -Version 5.1
<#
.SYNOPSIS
    Build and package the RetailERP Next.js frontend.
    Output folder : deployment\nextjs-iis-deployment\
    Uses PM2 + IIS ARR reverse proxy (no iisnode required).

.PARAMETER ApiUrl
    Gateway URL baked into the frontend at build time.
    Default: http://localhost:5000
    Client server example: http://192.168.1.100:5000

.PARAMETER SkipBuild
    Skip npm run build - use existing .next/standalone output.

.PARAMETER Version
    Version label. Default: 1.0.0

.PARAMETER Port
    Port PM2 runs the Next.js server on. Default: 3000

.EXAMPLE
    .\Build-FrontendPack.ps1
    .\Build-FrontendPack.ps1 -Version "1.0.1"
    .\Build-FrontendPack.ps1 -ApiUrl "http://192.168.1.100:5000"
    .\Build-FrontendPack.ps1 -SkipBuild
#>
param(
    [string] $ApiUrl  = "http://localhost:5000",
    [switch] $SkipBuild,
    [string] $Version = "1.0.0",
    [int]    $Port    = 3000
)

$ErrorActionPreference = "Stop"

$RepoRoot      = Split-Path -Parent $PSScriptRoot
$FrontendDir   = Join-Path $RepoRoot "src\frontend"
$StandaloneDir = Join-Path $FrontendDir ".next\standalone"
$StaticDir     = Join-Path $FrontendDir ".next\static"
$PublicDir     = Join-Path $FrontendDir "public"
$OutputDir     = Join-Path $PSScriptRoot "nextjs-iis-deployment"

function Write-Step { param($m) Write-Host "`n===  $m" -ForegroundColor Cyan }
function Write-OK   { param($m) Write-Host "  [OK] $m" -ForegroundColor Green }
function Write-Info { param($m) Write-Host "       $m" -ForegroundColor Gray }
function Write-Warn { param($m) Write-Host "  [!!] $m" -ForegroundColor Yellow }
function Write-Fail { param($m) Write-Host "  [XX] $m" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "  RetailERP -- Frontend Pack Builder (PM2 + IIS ARR)" -ForegroundColor Cyan
Write-Host "  Output  : $OutputDir"
Write-Host "  API URL : $ApiUrl"
Write-Host "  Version : $Version"
Write-Host "  Port    : $Port"
Write-Host ""

# ── 1. Build ───────────────────────────────────────────────────────────────────
Write-Step "1/4  Next.js build"

if (-not $SkipBuild) {
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Write-Fail "node.exe not found. Install Node.js 20 LTS." }
    if (-not (Get-Command npm  -ErrorAction SilentlyContinue)) { Write-Fail "npm not found." }
    Write-OK "Node $(& node --version)  /  npm $(& npm --version)"

    Push-Location $FrontendDir
    try {
        $env:NEXT_PUBLIC_API_URL     = $ApiUrl
        $env:NEXT_TELEMETRY_DISABLED = "1"

        Write-Info "npm ci ..."
        npm ci --prefer-offline 2>&1 | Select-Object -Last 2 | ForEach-Object { Write-Info $_ }
        if ($LASTEXITCODE -ne 0) { Write-Fail "npm ci failed" }

        Write-Info "npm run build  (NEXT_PUBLIC_API_URL=$ApiUrl) ..."
        npm run build 2>&1 | ForEach-Object { Write-Info $_ }
        if ($LASTEXITCODE -ne 0) { Write-Fail "npm run build failed" }
        Write-OK "Build complete"
    } finally { Pop-Location }
} else {
    if (-not (Test-Path (Join-Path $StandaloneDir "server.js"))) {
        Write-Fail "No standalone build at $StandaloneDir -- run without -SkipBuild first."
    }
    Write-OK "Using existing standalone build"
}

# ── 2. Assemble output folder ──────────────────────────────────────────────────
Write-Step "2/4  Assembling $OutputDir"

if (Test-Path $OutputDir) {
    Write-Warn "Removing previous output folder..."
    Remove-Item $OutputDir -Recurse -Force
}
New-Item -ItemType Directory $OutputDir -Force | Out-Null

# Standalone server (server.js + node_modules)
Write-Info "Copying standalone server..."
Copy-Item -Path "$StandaloneDir\*" -Destination $OutputDir -Recurse -Force

# .next/static  (CSS, JS chunks — required for standalone)
$staticDest = Join-Path $OutputDir ".next\static"
New-Item -ItemType Directory $staticDest -Force | Out-Null
Copy-Item -Path "$StaticDir\*" -Destination $staticDest -Recurse -Force
Write-OK ".next/static copied"

# public/
if (Test-Path $PublicDir) {
    $pubDest = Join-Path $OutputDir "public"
    New-Item -ItemType Directory $pubDest -Force | Out-Null
    Copy-Item -Path "$PublicDir\*" -Destination $pubDest -Recurse -Force
    Write-OK "public/ copied"
}

# logs dir
New-Item -ItemType Directory (Join-Path $OutputDir "logs") -Force | Out-Null

# ── 3. Config files ────────────────────────────────────────────────────────────
Write-Step "3/4  Writing config files"

$utf8NoBom = New-Object System.Text.UTF8Encoding $false

# ecosystem.config.js  (PM2)
$ecosystem = @"
// PM2 ecosystem config for RetailERP Frontend
// Usage:
//   pm2 start ecosystem.config.js
//   pm2 save
//   pm2 startup
module.exports = {
  apps: [
    {
      name        : 'retailerp-frontend',
      script      : 'server.js',
      cwd         : __dirname,
      instances   : 1,
      exec_mode   : 'fork',
      watch       : false,
      autorestart : true,
      max_memory_restart: '512M',
      env: {
        NODE_ENV             : 'production',
        PORT                 : $Port,
        HOSTNAME             : '127.0.0.1',
        NEXT_TELEMETRY_DISABLED: '1',
        NEXT_PUBLIC_API_URL  : '$ApiUrl'
      },
      error_file  : './logs/pm2-error.log',
      out_file    : './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    }
  ]
}
"@
[System.IO.File]::WriteAllText((Join-Path $OutputDir "ecosystem.config.js"), $ecosystem, $utf8NoBom)
Write-OK "ecosystem.config.js"

# web.config  (IIS ARR reverse proxy to PM2, UTF-8 no BOM)
$webConfig = @"
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>

    <!-- ARR reverse proxy: forward all requests to PM2 Next.js server -->
    <rewrite>
      <rules>
        <rule name="RetailERP Frontend PM2" stopProcessing="true">
          <match url="(.*)" />
          <action type="Rewrite" url="http://127.0.0.1:$Port/{R:1}" />
          <serverVariables>
            <set name="HTTP_X_FORWARDED_HOST" value="{HTTP_HOST}" />
            <set name="HTTP_X_FORWARDED_PROTO" value="http" />
          </serverVariables>
        </rule>
      </rules>
    </rewrite>

    <!-- Pass error responses from Node directly to browser -->
    <httpErrors existingResponse="PassThrough" />

    <!-- Disable IIS static file handling (Node serves everything) -->
    <staticContent>
      <clear />
    </staticContent>

  </system.webServer>
</configuration>
"@
[System.IO.File]::WriteAllText((Join-Path $OutputDir "web.config"), $webConfig, $utf8NoBom)
Write-OK "web.config (IIS ARR proxy -> 127.0.0.1:$Port)"

# README.txt
$readme = @"
RetailERP - Next.js Frontend (PM2 + IIS ARR)
=============================================
Version : $Version
Built   : $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
API URL : $ApiUrl
Port    : $Port

QUICK INSTALL (Windows Server, run as Administrator)
----------------------------------------------------
  powershell -ExecutionPolicy Bypass -File .\Install-Frontend.ps1

  # Custom port or IP:
  powershell -ExecutionPolicy Bypass -File .\Install-Frontend.ps1 -SitePort 3003 -ApiUrl "http://192.168.1.100:5000"

HOW IT WORKS
------------
  PM2 runs:  node server.js  (Next.js standalone, port $Port)
  IIS ARR proxies:  http://localhost:3003  ->  http://127.0.0.1:$Port

PM2 COMMANDS (after install)
----------------------------
  pm2 list                      # show running apps
  pm2 logs retailerp-frontend   # live logs
  pm2 restart retailerp-frontend
  pm2 stop    retailerp-frontend

LOGIN
-----
  Email    : admin@elcurio.com
  Password : Admin@123
"@
[System.IO.File]::WriteAllText((Join-Path $OutputDir "README.txt"), $readme, $utf8NoBom)
Write-OK "README.txt"

# Copy Install-Frontend.ps1 from deployment folder
$installSrc = Join-Path $PSScriptRoot "Install-Frontend.ps1"
if (Test-Path $installSrc) {
    Copy-Item $installSrc (Join-Path $OutputDir "Install-Frontend.ps1") -Force
    Write-OK "Install-Frontend.ps1 included"
} else {
    Write-Warn "Install-Frontend.ps1 not found at $installSrc"
}

# ── 4. Summary ─────────────────────────────────────────────────────────────────
Write-Step "4/4  Done"

$items = Get-ChildItem $OutputDir | Measure-Object
$sizeMB = [math]::Round((Get-ChildItem $OutputDir -Recurse | Measure-Object Length -Sum).Sum / 1MB, 1)
Write-OK "$($items.Count) top-level items  /  $sizeMB MB total"

Write-Host ""
Write-Host "  ============================================================" -ForegroundColor Green
Write-Host "  Pack ready:  $OutputDir" -ForegroundColor Green
Write-Host "  Size     :  $sizeMB MB" -ForegroundColor Green
Write-Host ""
Write-Host "  Copy folder to server, then run as Administrator:" -ForegroundColor Cyan
Write-Host "    powershell -ExecutionPolicy Bypass -File .\Install-Frontend.ps1"
Write-Host "  ============================================================" -ForegroundColor Green
Write-Host ""
