#Requires -Version 5.1
<#
.SYNOPSIS
    Build Next.js frontend as standalone and package for IIS deployment (PM2 + ARR).

.DESCRIPTION
    1. Runs `npm run build` in src/frontend (standalone output enabled)
    2. Copies .next/standalone + static + public into dist/
    3. Adds web.config, ecosystem.config.js, Install.ps1
    4. Optionally zips into retailerp-frontend-iis.zip

.PARAMETER ApiUrl    Backend gateway URL baked into the build.  Default: http://localhost:5000
.PARAMETER AppPort   Port PM2 Node.js process will listen on.   Default: 3000
.PARAMETER SitePort  IIS site port.                             Default: 3003
.PARAMETER OutputDir Where to write the built package.         Default: .\dist
.PARAMETER Pack      Also create a .zip of the dist folder.

.EXAMPLE
    .\Build.ps1
    .\Build.ps1 -ApiUrl http://192.168.1.100:5000 -Pack
    .\Build.ps1 -ApiUrl https://api.company.com   -Pack -OutputDir C:\Builds\frontend
#>
param(
    [string] $ApiUrl    = "http://localhost:5000",
    [int]    $AppPort   = 3000,
    [int]    $SitePort  = 3003,
    [string] $OutputDir = (Join-Path $PSScriptRoot "dist"),
    [switch] $Pack
)

$ErrorActionPreference = "Stop"
$ScriptDir    = $PSScriptRoot
$RepoRoot     = Resolve-Path (Join-Path $ScriptDir "..\..") | Select-Object -ExpandProperty Path
$FrontendDir  = Join-Path $RepoRoot "src\frontend"
$StandaloneDir = Join-Path $FrontendDir ".next\standalone"

function Write-Step { param($m) Write-Host "`n--- $m" -ForegroundColor Cyan }
function Write-OK   { param($m) Write-Host "  [OK] $m" -ForegroundColor Green }
function Write-Fail { param($m) Write-Host "  [XX] $m" -ForegroundColor Red; exit 1 }
function Write-Info { param($m) Write-Host "       $m" -ForegroundColor Gray }

Write-Host ""
Write-Host "  RetailERP Frontend - IIS Build (PM2 + ARR)" -ForegroundColor White
Write-Host "  API URL   : $ApiUrl" -ForegroundColor Gray
Write-Host "  App Port  : $AppPort  (PM2 / Node.js)" -ForegroundColor Gray
Write-Host "  Site Port : $SitePort (IIS)" -ForegroundColor Gray
Write-Host "  Output    : $OutputDir" -ForegroundColor Gray
Write-Host ""

# ── 1. Check Node / npm ────────────────────────────────────────────────────────
Write-Step "1/4  Checking prerequisites"

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) { Write-Fail "Node.js not found. Install from https://nodejs.org" }
Write-OK "Node.js: $(& node --version)"

$npmCmd = Get-Command npm -ErrorAction SilentlyContinue
if (-not $npmCmd) { Write-Fail "npm not found." }

if (-not (Test-Path $FrontendDir)) {
    Write-Fail "Frontend source not found: $FrontendDir"
}

# ── 2. npm install + next build ────────────────────────────────────────────────
Write-Step "2/4  Building Next.js (standalone)"

Push-Location $FrontendDir
try {
    # Install deps if node_modules missing
    if (-not (Test-Path (Join-Path $FrontendDir "node_modules"))) {
        Write-Info "Running npm ci..."
        npm ci 2>&1 | Select-Object -Last 3 | ForEach-Object { Write-Info $_ }
    }

    # Set build-time env vars
    $env:NEXT_PUBLIC_API_URL      = $ApiUrl
    $env:NEXT_TELEMETRY_DISABLED  = "1"
    $env:NODE_ENV                 = "production"

    Write-Info "Running npm run build..."
    npm run build 2>&1 | ForEach-Object { Write-Info $_ }
    if ($LASTEXITCODE -ne 0) { Write-Fail "npm run build failed" }

    Write-OK "Build complete"
} finally {
    Pop-Location
}

if (-not (Test-Path $StandaloneDir)) {
    Write-Fail "Standalone output not found at $StandaloneDir — check next.config output:'standalone'"
}

# ── 3. Assemble deployment package ────────────────────────────────────────────
Write-Step "3/4  Assembling deployment package → $OutputDir"

if (Test-Path $OutputDir) {
    Remove-Item $OutputDir -Recurse -Force
    Write-Info "Cleared previous dist"
}
New-Item -ItemType Directory $OutputDir -Force | Out-Null

# Core: copy entire standalone output (server.js + node_modules inside it)
Write-Info "Copying standalone runtime..."
Copy-Item -Path "$StandaloneDir\*" -Destination $OutputDir -Recurse -Force

# Static assets — must be at <deploy>/.next/static/
$staticSrc = Join-Path $FrontendDir ".next\static"
$staticDst = Join-Path $OutputDir   ".next\static"
if (Test-Path $staticSrc) {
    Copy-Item -Path $staticSrc -Destination $staticDst -Recurse -Force
    Write-Info "Copied .next/static"
} else { Write-Host "  [!!] No .next/static found — some assets may be missing" -ForegroundColor Yellow }

# Public folder
$publicSrc = Join-Path $FrontendDir "public"
$publicDst = Join-Path $OutputDir   "public"
if (Test-Path $publicSrc) {
    Copy-Item -Path $publicSrc -Destination $publicDst -Recurse -Force
    Write-Info "Copied public/"
}

# Logs folder
New-Item -ItemType Directory (Join-Path $OutputDir "logs") -Force | Out-Null

# Write web.config (ARR reverse proxy) with correct app port
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
$webConfig = @"
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>

    <!-- ARR Reverse Proxy: forward all traffic to PM2-managed Node.js -->
    <rewrite>
      <rules>
        <rule name="RetailERP-Frontend" stopProcessing="true">
          <match url="(.*)" />
          <action type="Rewrite" url="http://127.0.0.1:$AppPort/{R:1}" />
          <serverVariables>
            <set name="HTTP_X_FORWARDED_HOST"  value="{HTTP_HOST}" />
            <set name="HTTP_X_FORWARDED_PROTO" value="http" />
            <set name="HTTP_X_REAL_IP"         value="{REMOTE_ADDR}" />
          </serverVariables>
        </rule>
      </rules>
    </rewrite>

    <!-- Pass Node.js error responses through unchanged -->
    <httpErrors existingResponse="PassThrough" />

    <!-- Let Node.js handle all static files too (Next.js does it well) -->
    <staticContent>
      <clear />
    </staticContent>

    <!-- Security headers -->
    <httpProtocol>
      <customHeaders>
        <remove name="X-Powered-By" />
        <add name="X-Frame-Options"          value="SAMEORIGIN" />
        <add name="X-Content-Type-Options"   value="nosniff" />
        <add name="X-XSS-Protection"         value="1; mode=block" />
        <add name="Referrer-Policy"          value="strict-origin-when-cross-origin" />
        <add name="Permissions-Policy"       value="camera=(), microphone=(), geolocation=()" />
      </customHeaders>
    </httpProtocol>

    <security>
      <requestFiltering removeServerHeader="true">
        <requestLimits maxAllowedContentLength="52428800" />
      </requestFiltering>
    </security>

  </system.webServer>
</configuration>
"@
[System.IO.File]::WriteAllText((Join-Path $OutputDir "web.config"), $webConfig, $utf8NoBom)
Write-Info "web.config written (ARR → 127.0.0.1:$AppPort)"

# Write ecosystem.config.js
$ecosystem = @"
// PM2 ecosystem config for RetailERP Frontend
// Usage: pm2 start ecosystem.config.js
//        pm2 save && pm2 startup
module.exports = {
  apps: [
    {
      name             : 'retailerp-frontend',
      script           : 'server.js',
      cwd              : __dirname,
      instances        : 1,
      exec_mode        : 'fork',
      watch            : false,
      autorestart      : true,
      max_memory_restart: '512M',
      env: {
        NODE_ENV                : 'production',
        PORT                    : $AppPort,
        HOSTNAME                : '127.0.0.1',
        NEXT_TELEMETRY_DISABLED : '1',
        NEXT_PUBLIC_API_URL     : '$ApiUrl'
      },
      error_file       : './logs/pm2-error.log',
      out_file         : './logs/pm2-out.log',
      log_date_format  : 'YYYY-MM-DD HH:mm:ss'
    }
  ]
}
"@
[System.IO.File]::WriteAllText((Join-Path $OutputDir "ecosystem.config.js"), $ecosystem, $utf8NoBom)
Write-Info "ecosystem.config.js written (PORT=$AppPort)"

# Copy Install.ps1 into the package
Copy-Item (Join-Path $ScriptDir "Install.ps1") (Join-Path $OutputDir "Install.ps1") -Force

# Write a README
$readme = @"
RetailERP Frontend - IIS Deployment Package
============================================

Built: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
API  : $ApiUrl
App  : Node.js on port $AppPort (managed by PM2)
IIS  : port $SitePort (ARR reverse proxy)

QUICK INSTALL (run as Administrator on the target IIS server)
-------------------------------------------------------------
  powershell -ExecutionPolicy Bypass -File .\Install.ps1

CUSTOM OPTIONS
  .\Install.ps1 -SitePort 80
  .\Install.ps1 -SitePort 443 -ApiUrl https://api.example.com
  .\Install.ps1 -DeployPath D:\Sites\RetailERP-Frontend

USEFUL PM2 COMMANDS (after install)
  pm2 list
  pm2 logs retailerp-frontend
  pm2 restart retailerp-frontend
  pm2 status

LOGINS (after database is seeded)
  admin@elcurio.com    / Admin@123
"@
[System.IO.File]::WriteAllText((Join-Path $OutputDir "README.txt"), $readme, $utf8NoBom)

Write-OK "Package assembled: $OutputDir"

# ── 4. Create ZIP ─────────────────────────────────────────────────────────────
if ($Pack) {
    Write-Step "4/4  Creating ZIP package"

    $zipPath = Join-Path $ScriptDir "retailerp-frontend-iis.zip"
    if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
    Compress-Archive -Path "$OutputDir\*" -DestinationPath $zipPath -CompressionLevel Optimal
    $size = [math]::Round((Get-Item $zipPath).Length / 1MB, 1)
    Write-OK "ZIP created: $zipPath  ($size MB)"
} else {
    Write-Step "4/4  Skipped ZIP (use -Pack to create retailerp-frontend-iis.zip)"
}

Write-Host ""
Write-Host "  =============================================" -ForegroundColor Green
Write-Host "  Build complete!" -ForegroundColor Green
Write-Host "  Package  : $OutputDir" -ForegroundColor White
Write-Host "  Install  : copy dist\ to IIS server and run Install.ps1" -ForegroundColor White
Write-Host "  =============================================" -ForegroundColor Green
Write-Host ""
