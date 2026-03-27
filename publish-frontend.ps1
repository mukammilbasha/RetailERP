#Requires -Version 5.1
<#
.SYNOPSIS
    Build and publish the RetailERP Next.js frontend.
    Output: publish\iis-frontend-pm2\RetailERP-v{version}-{yyyy-MM-dd}\

.PARAMETER ApiUrl
    Gateway URL baked into the frontend. Default: http://localhost:5000

.PARAMETER Version
    Version label. Default: 1.0.0

.PARAMETER SkipBuild
    Use existing .next/standalone - skip npm build.

.PARAMETER Port
    Port PM2 runs Next.js on. Default: 3003

.EXAMPLE
    .\publish-frontend.ps1
    .\publish-frontend.ps1 -Version "1.0.1"
    .\publish-frontend.ps1 -ApiUrl "http://192.168.1.100:5000"
    .\publish-frontend.ps1 -SkipBuild
#>
param(
    [string] $ApiUrl    = "http://localhost:5000",
    [string] $Version   = "1.0.0",
    [switch] $SkipBuild,
    [int]    $Port      = 3003
)

$ErrorActionPreference = "Stop"

$RepoRoot      = $PSScriptRoot
$FrontendDir   = Join-Path $RepoRoot "src\frontend"
$StandaloneDir = Join-Path $FrontendDir ".next\standalone"
$StaticDir     = Join-Path $FrontendDir ".next\static"
$PublicDir     = Join-Path $FrontendDir "public"
$BasePackDir   = Join-Path $RepoRoot "publish\iis-frontend-pm2"

$Date          = Get-Date -Format "yyyy-MM-dd"
$PackName      = "RetailERP-v$Version-$Date"
$OutputDir     = Join-Path $BasePackDir $PackName
$utf8NoBom     = New-Object System.Text.UTF8Encoding $false

function Write-Step { param($m) Write-Host "`n===  $m" -ForegroundColor Cyan }
function Write-OK   { param($m) Write-Host "  [OK] $m" -ForegroundColor Green }
function Write-Info { param($m) Write-Host "       $m" -ForegroundColor Gray }
function Write-Warn { param($m) Write-Host "  [!!] $m" -ForegroundColor Yellow }
function Write-Fail { param($m) Write-Host "  [XX] $m" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "  RetailERP -- Frontend Publish (PM2 + IIS ARR)" -ForegroundColor Cyan
Write-Host "  Pack    : $PackName"
Write-Host "  Output  : $OutputDir"
Write-Host "  API URL : $ApiUrl"
Write-Host "  Port    : $Port"
Write-Host "  Date    : $Date"
Write-Host ""

# ── 1. Build ───────────────────────────────────────────────────────────────────
Write-Step "1/5  Next.js Build"

if (-not $SkipBuild) {
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Write-Fail "node.exe not found - install Node.js 20 LTS" }
    if (-not (Get-Command npm  -ErrorAction SilentlyContinue)) { Write-Fail "npm not found" }
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
        Write-Fail "No standalone build at $StandaloneDir - run without -SkipBuild first"
    }
    Write-OK "Using existing standalone build"
}

# ── 2. Create dated output folder ─────────────────────────────────────────────
Write-Step "2/5  Creating $PackName"

if (Test-Path $OutputDir) {
    Write-Warn "Folder already exists - overwriting"
    Remove-Item $OutputDir -Recurse -Force
}
New-Item -ItemType Directory $OutputDir -Force | Out-Null
$AppDir = Join-Path $OutputDir "app"
New-Item -ItemType Directory $AppDir -Force | Out-Null

# ── 3. Copy build output into app\ ────────────────────────────────────────────
Write-Step "3/5  Copying standalone build -> app\"

Write-Info "server.js + node_modules ..."
Copy-Item -Path "$StandaloneDir\*" -Destination $AppDir -Recurse -Force

Write-Info ".next\static ..."
$staticDest = Join-Path $AppDir ".next\static"
New-Item -ItemType Directory $staticDest -Force | Out-Null
Copy-Item -Path "$StaticDir\*" -Destination $staticDest -Recurse -Force
Write-OK ".next\static copied"

if (Test-Path $PublicDir) {
    Write-Info "public\ ..."
    $pubDest = Join-Path $AppDir "public"
    New-Item -ItemType Directory $pubDest -Force | Out-Null
    Copy-Item -Path "$PublicDir\*" -Destination $pubDest -Recurse -Force
    Write-OK "public\ copied"
}

New-Item -ItemType Directory (Join-Path $OutputDir "logs") -Force | Out-Null

# ── 4. Write config files ──────────────────────────────────────────────────────
Write-Step "4/5  Writing config files"

# ecosystem.config.js
$ecoContent = @"
// RetailERP Frontend - PM2 ecosystem config
// Generated: $Date  |  Version: $Version  |  API: $ApiUrl
module.exports = {
  apps: [
    {
      name        : 'retailerp-frontend',
      script      : 'server.js',
      cwd         : './app',
      instances   : 1,
      exec_mode   : 'fork',
      watch       : false,
      autorestart : true,
      max_restarts: 10,
      max_memory_restart: '512M',
      env: {
        NODE_ENV              : 'production',
        PORT                  : $Port,
        HOSTNAME              : '127.0.0.1',
        NEXT_TELEMETRY_DISABLED: '1',
        NEXT_PUBLIC_API_URL   : '$ApiUrl'
      },
      error_file  : './logs/pm2-error.log',
      out_file    : './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    }
  ]
}
"@
[System.IO.File]::WriteAllText((Join-Path $OutputDir "ecosystem.config.js"), $ecoContent, $utf8NoBom)
Write-OK "ecosystem.config.js  (PORT=$Port)"

# web.config  - IIS ARR reverse proxy (UTF-8 no BOM)
$wcLines = @(
    '<?xml version="1.0" encoding="utf-8"?>',
    '<!-- RetailERP Frontend - IIS ARR Reverse Proxy to PM2 (' + $PackName + ') -->',
    '<configuration>',
    '  <system.webServer>',
    '    <rewrite>',
    '      <rules>',
    '        <rule name="RetailERP Frontend PM2" stopProcessing="true">',
    '          <match url="(.*)" />',
    '          <action type="Rewrite" url="http://127.0.0.1:' + $Port + '/{R:1}" />',
    '          <serverVariables>',
    '            <set name="HTTP_X_FORWARDED_HOST"  value="{HTTP_HOST}" />',
    '            <set name="HTTP_X_FORWARDED_PROTO" value="http" />',
    '          </serverVariables>',
    '        </rule>',
    '      </rules>',
    '    </rewrite>',
    '    <httpErrors existingResponse="PassThrough" />',
    '    <httpProtocol>',
    '      <customHeaders>',
    '        <remove name="X-Powered-By" />',
    '        <add name="X-Frame-Options"        value="SAMEORIGIN" />',
    '        <add name="X-Content-Type-Options" value="nosniff" />',
    '        <add name="X-XSS-Protection"       value="1; mode=block" />',
    '        <add name="Referrer-Policy"        value="strict-origin-when-cross-origin" />',
    '      </customHeaders>',
    '    </httpProtocol>',
    '    <security>',
    '      <requestFiltering removeServerHeader="true">',
    '        <requestLimits maxAllowedContentLength="52428800" />',
    '      </requestFiltering>',
    '    </security>',
    '  </system.webServer>',
    '</configuration>'
)
[System.IO.File]::WriteAllText((Join-Path $OutputDir "web.config"), ($wcLines -join [Environment]::NewLine), $utf8NoBom)
Write-OK "web.config  (ARR proxy -> 127.0.0.1:$Port)"

# start.ps1
$startContent = "# RetailERP Frontend - Start PM2`npm2 start ecosystem.config.js`npm2 save`nWrite-Host 'Started: http://localhost:$Port' -ForegroundColor Green"
[System.IO.File]::WriteAllText((Join-Path $OutputDir "start.ps1"), $startContent, $utf8NoBom)

# stop.ps1
$stopContent = "# RetailERP Frontend - Stop PM2`npm2 stop retailerp-frontend`nWrite-Host 'Stopped.' -ForegroundColor Yellow"
[System.IO.File]::WriteAllText((Join-Path $OutputDir "stop.ps1"), $stopContent, $utf8NoBom)

# Copy install.ps1 from base pack
$basePack = Join-Path $BasePackDir "install.ps1"
if (Test-Path $basePack) {
    Copy-Item $basePack (Join-Path $OutputDir "install.ps1") -Force
    Write-OK "install.ps1 included"
}

# manifest.json
$manifest = [ordered]@{
    name        = "RetailERP Frontend"
    version     = $Version
    date        = $Date
    builtAt     = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
    apiUrl      = $ApiUrl
    port        = $Port
    packName    = $PackName
    runtime     = "PM2 + IIS ARR"
}
$manifest | ConvertTo-Json | ForEach-Object {
    [System.IO.File]::WriteAllText((Join-Path $OutputDir "manifest.json"), $_, $utf8NoBom)
}
Write-OK "manifest.json"

# README.md
$readmeContent = "# RetailERP Frontend - $PackName`n`n" +
    "| Field   | Value |`n|---------|-------|`n" +
    "| Version | $Version |`n| Date    | $Date |`n" +
    "| API URL | $ApiUrl |`n| Port    | $Port |`n" +
    "| Runtime | PM2 + IIS ARR Reverse Proxy |`n`n" +
    "## Quick Install`n`n" +
    "Run as Administrator:`n`n" +
    "    powershell -ExecutionPolicy Bypass -File .\install.ps1`n`n" +
    "    # Custom IP:`n" +
    "    powershell -ExecutionPolicy Bypass -File .\install.ps1 -ApiUrl `"http://192.168.1.100:5000`"`n`n" +
    "## How it works`n`n" +
    "    Browser -> IIS :80 -> ARR proxy -> PM2 (Node.js :$Port) -> Next.js`n`n" +
    "## PM2 Commands`n`n" +
    "    pm2 list`n" +
    "    pm2 logs retailerp-frontend`n" +
    "    pm2 restart retailerp-frontend`n" +
    "    pm2 stop retailerp-frontend`n`n" +
    "## Login`n`n" +
    "    Email    : admin@elcurio.com`n" +
    "    Password : Admin@123`n"
[System.IO.File]::WriteAllText((Join-Path $OutputDir "README.md"), $readmeContent, $utf8NoBom)
Write-OK "README.md"

# ── 5. Summary ─────────────────────────────────────────────────────────────────
Write-Step "5/5  Summary"

$sizeMB = [math]::Round((Get-ChildItem $OutputDir -Recurse | Measure-Object Length -Sum).Sum / 1MB, 1)
Write-OK "$PackName  ->  $sizeMB MB"

# List all published builds (datewise)
Write-Host ""
Write-Host "  Published builds in publish\iis-frontend-pm2\:" -ForegroundColor Cyan
Get-ChildItem $BasePackDir -Directory | Sort-Object Name | ForEach-Object {
    $isLatest = $_.Name -eq $PackName
    $marker   = if ($isLatest) { " <-- latest" } else { "" }
    $sz = [math]::Round((Get-ChildItem $_.FullName -Recurse -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum / 1MB, 1)
    Write-Host ("  {0,-40} {1,6} MB{2}" -f $_.Name, $sz, $marker) -ForegroundColor $(if ($isLatest) { "Green" } else { "Gray" })
}

Write-Host ""
Write-Host "  ============================================================" -ForegroundColor Green
Write-Host "  Pack ready: $OutputDir" -ForegroundColor Green
Write-Host ""
Write-Host "  Deploy on server (as Administrator):" -ForegroundColor Cyan
Write-Host "    powershell -ExecutionPolicy Bypass -File .\install.ps1"
Write-Host "  ============================================================" -ForegroundColor Green
Write-Host ""
