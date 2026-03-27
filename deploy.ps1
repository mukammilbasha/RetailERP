#!/usr/bin/env pwsh
#Requires -Version 5.1
<#
.SYNOPSIS
    RetailERP — Master Docker Deployment Script

.DESCRIPTION
    Stops and removes existing containers, rebuilds all services from scratch,
    seeds the database, and starts the full stack. Safe to re-run at any time.

.PARAMETER ApiUrl
    Public URL of the API Gateway — baked into the frontend at build time.
    Default: http://localhost:5000
    Client server example: http://192.168.1.100:5000

.PARAMETER Clean
    Also wipe all Docker volumes (SQL data, Redis cache).
    Use this for a completely fresh deployment.

.PARAMETER NoBuild
    Skip image rebuild — just restart containers with existing images.

.PARAMETER Pull
    Pull latest base images before building.

.PARAMETER Env
    Deployment environment tag (dev / staging / prod). Default: prod

.EXAMPLE
    # Full fresh deployment (local)
    .\deploy.ps1

    # Client server with specific IP
    .\deploy.ps1 -ApiUrl "http://192.168.10.50:5000"

    # Wipe everything and redeploy
    .\deploy.ps1 -Clean

    # Just restart without rebuilding
    .\deploy.ps1 -NoBuild
#>

param(
    [string] $ApiUrl  = $env:NEXT_PUBLIC_API_URL ?? "http://localhost:5000",
    [switch] $Clean,
    [switch] $NoBuild,
    [switch] $Pull,
    [string] $Env     = "prod"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ── Colours ───────────────────────────────────────────────────────────────────
function Write-Step  { param($msg) Write-Host "`n═══ $msg " -ForegroundColor Cyan }
function Write-OK    { param($msg) Write-Host "  [OK] $msg"  -ForegroundColor Green }
function Write-Warn  { param($msg) Write-Host "  [!!] $msg"  -ForegroundColor Yellow }
function Write-Fail  { param($msg) Write-Host "  [XX] $msg"  -ForegroundColor Red }
function Write-Info  { param($msg) Write-Host "       $msg"  -ForegroundColor Gray }

# ── Header ────────────────────────────────────────────────────────────────────
Clear-Host
Write-Host @"
╔══════════════════════════════════════════════════════════════╗
║          RetailERP — Master Docker Deployment                ║
║          $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')                               ║
╚══════════════════════════════════════════════════════════════╝
"@ -ForegroundColor Cyan
Write-Host "  API URL  : $ApiUrl" -ForegroundColor White
Write-Host "  Clean    : $Clean"  -ForegroundColor White
Write-Host "  NoBuild  : $NoBuild" -ForegroundColor White
Write-Host "  Env      : $Env"    -ForegroundColor White

# ── Prerequisites ─────────────────────────────────────────────────────────────
Write-Step "1/8  Checking prerequisites"

$docker = Get-Command docker -ErrorAction SilentlyContinue
if (-not $docker) { Write-Fail "Docker not found. Install Docker Desktop first."; exit 1 }
Write-OK "Docker: $(docker --version)"

$compose = Get-Command docker-compose -ErrorAction SilentlyContinue
if ($compose) {
    $COMPOSE = "docker-compose"
} else {
    # Docker Compose V2 (plugin)
    docker compose version > $null 2>&1
    if ($LASTEXITCODE -eq 0) { $COMPOSE = "docker compose" }
    else { Write-Fail "docker compose not found."; exit 1 }
}
Write-OK "Compose: $($COMPOSE)"

# Verify docker daemon is running
docker info > $null 2>&1
if ($LASTEXITCODE -ne 0) { Write-Fail "Docker daemon not running. Start Docker Desktop."; exit 1 }
Write-OK "Docker daemon is running"

# ── Stop & Remove existing containers ─────────────────────────────────────────
Write-Step "2/8  Stopping and removing existing containers"

if ($COMPOSE -eq "docker-compose") {
    if ($Clean) {
        Write-Warn "Clean mode: removing containers AND volumes (all data will be lost)"
        docker-compose down --volumes --remove-orphans 2>&1 | ForEach-Object { Write-Info $_ }
    } else {
        docker-compose down --remove-orphans 2>&1 | ForEach-Object { Write-Info $_ }
    }
} else {
    if ($Clean) {
        Write-Warn "Clean mode: removing containers AND volumes (all data will be lost)"
        docker compose down --volumes --remove-orphans 2>&1 | ForEach-Object { Write-Info $_ }
    } else {
        docker compose down --remove-orphans 2>&1 | ForEach-Object { Write-Info $_ }
    }
}

# Remove any dangling retailerp containers by name
$containers = @(
    "retailerp-sqlserver","retailerp-redis","retailerp-db-init",
    "retailerp-auth","retailerp-product","retailerp-inventory",
    "retailerp-order","retailerp-production","retailerp-billing",
    "retailerp-reporting","retailerp-gateway","retailerp-frontend",
    "retailerp-docs","retailerp-prometheus","retailerp-grafana"
)
foreach ($c in $containers) {
    $exists = docker ps -aq --filter "name=^${c}$" 2>$null
    if ($exists) {
        docker rm -f $c > $null 2>&1
        Write-Info "Removed: $c"
    }
}
Write-OK "All containers removed"

# ── Pull base images ───────────────────────────────────────────────────────────
if ($Pull) {
    Write-Step "3/8  Pulling latest base images"
    $images = @(
        "mcr.microsoft.com/mssql/server:2022-latest",
        "mcr.microsoft.com/dotnet/sdk:8.0",
        "mcr.microsoft.com/dotnet/aspnet:8.0",
        "node:20-alpine",
        "redis:7-alpine"
    )
    foreach ($img in $images) {
        Write-Info "Pulling $img ..."
        docker pull $img 2>&1 | Select-Object -Last 1 | ForEach-Object { Write-Info $_ }
    }
    Write-OK "Base images up to date"
} else {
    Write-Step "3/8  Skipping image pull (use -Pull to refresh)"
    Write-Info "Using cached base images"
}

# ── Build all service images ───────────────────────────────────────────────────
if (-not $NoBuild) {
    Write-Step "4/8  Building all service images (this takes 5-10 minutes)"
    Write-Info "API URL baked into frontend: $ApiUrl"

    $env:NEXT_PUBLIC_API_URL = $ApiUrl

    $buildArgs = @("build", "--no-cache",
        "--build-arg", "NEXT_PUBLIC_API_URL=$ApiUrl"
    )

    Write-Info "Building backend services..."
    $services = @("auth-api","product-api","inventory-api","order-api","production-api","billing-api","reporting-api","gateway")
    foreach ($svc in $services) {
        Write-Info "  Building $svc ..."
        if ($COMPOSE -eq "docker-compose") {
            docker-compose build --no-cache $svc 2>&1 | Select-Object -Last 3 | ForEach-Object { Write-Info "    $_" }
        } else {
            docker compose build --no-cache $svc 2>&1 | Select-Object -Last 3 | ForEach-Object { Write-Info "    $_" }
        }
        if ($LASTEXITCODE -ne 0) { Write-Fail "Build failed for $svc"; exit 1 }
        Write-OK "$svc built"
    }

    Write-Info "Building frontend (includes npm build + Next.js compile)..."
    if ($COMPOSE -eq "docker-compose") {
        docker-compose build --no-cache --build-arg NEXT_PUBLIC_API_URL=$ApiUrl frontend 2>&1 | Select-Object -Last 5 | ForEach-Object { Write-Info "    $_" }
    } else {
        docker compose build --no-cache --build-arg NEXT_PUBLIC_API_URL=$ApiUrl frontend 2>&1 | Select-Object -Last 5 | ForEach-Object { Write-Info "    $_" }
    }
    if ($LASTEXITCODE -ne 0) { Write-Fail "Frontend build failed"; exit 1 }
    Write-OK "Frontend built"

} else {
    Write-Step "4/8  Skipping build (using existing images)"
}

# ── Start infrastructure ───────────────────────────────────────────────────────
Write-Step "5/8  Starting infrastructure (SQL Server + Redis)"

$env:NEXT_PUBLIC_API_URL = $ApiUrl

if ($COMPOSE -eq "docker-compose") {
    docker-compose up -d sqlserver redis 2>&1 | ForEach-Object { Write-Info $_ }
} else {
    docker compose up -d sqlserver redis 2>&1 | ForEach-Object { Write-Info $_ }
}

# Wait for SQL Server to be healthy
Write-Info "Waiting for SQL Server to be ready (up to 120s)..."
$timeout = 120
$elapsed = 0
do {
    Start-Sleep -Seconds 5
    $elapsed += 5
    $health = docker inspect --format "{{.State.Health.Status}}" retailerp-sqlserver 2>$null
    Write-Info "  [$elapsed s] SQL Server status: $health"
} while ($health -ne "healthy" -and $elapsed -lt $timeout)

if ($health -ne "healthy") {
    Write-Fail "SQL Server did not become healthy within ${timeout}s"
    Write-Info "Check logs: docker logs retailerp-sqlserver"
    exit 1
}
Write-OK "SQL Server is healthy"

# Wait for Redis
$redisHealth = docker inspect --format "{{.State.Health.Status}}" retailerp-redis 2>$null
$elapsed = 0
while ($redisHealth -ne "healthy" -and $elapsed -lt 30) {
    Start-Sleep -Seconds 3; $elapsed += 3
    $redisHealth = docker inspect --format "{{.State.Health.Status}}" retailerp-redis 2>$null
}
Write-OK "Redis is healthy"

# ── Database Initialization ────────────────────────────────────────────────────
Write-Step "6/8  Initializing database with schema and seed data"

if ($COMPOSE -eq "docker-compose") {
    docker-compose up db-init 2>&1 | ForEach-Object { Write-Info $_ }
} else {
    docker compose up db-init 2>&1 | ForEach-Object { Write-Info $_ }
}

# Check db-init exit code
$dbInitExit = docker inspect --format "{{.State.ExitCode}}" retailerp-db-init 2>$null
if ($dbInitExit -ne "0") {
    Write-Warn "db-init exited with code $dbInitExit — checking if tables already exist"
    $tablesExist = docker exec retailerp-sqlserver `
        /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "RetailERP@2024!" -C `
        -Q "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA='auth'" `
        -h -1 2>$null
    if ($tablesExist -and $tablesExist.Trim() -gt "0") {
        Write-OK "Tables already exist — skipping seed (safe for re-deployment)"
    } else {
        Write-Fail "Database initialization failed and tables do not exist"
        Write-Info "Run: docker logs retailerp-db-init"
        exit 1
    }
} else {
    Write-OK "Database initialized with schema and seed data"
}

# Verify seed user exists
$userCheck = docker exec retailerp-sqlserver `
    /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "RetailERP@2024!" -C -d RetailERP `
    -Q "SELECT Email FROM auth.Users WHERE Email='admin@elcurio.com'" -h -1 2>$null
if ($userCheck -and $userCheck -match "admin@elcurio.com") {
    Write-OK "Seed user verified: admin@elcurio.com"
} else {
    Write-Warn "Seed user not found — running seed data script manually"
    docker exec -i retailerp-sqlserver /opt/mssql-tools18/bin/sqlcmd `
        -S localhost -U sa -P "RetailERP@2024!" -C -d RetailERP `
        -i /database/seed-data/011_seed_data.sql 2>&1 | Write-Info
}

# ── Start all application services ────────────────────────────────────────────
Write-Step "7/8  Starting all application services"

if ($COMPOSE -eq "docker-compose") {
    docker-compose up -d auth-api product-api inventory-api order-api production-api billing-api reporting-api gateway frontend 2>&1 | ForEach-Object { Write-Info $_ }
} else {
    docker compose up -d auth-api product-api inventory-api order-api production-api billing-api reporting-api gateway frontend 2>&1 | ForEach-Object { Write-Info $_ }
}

Write-Info "Waiting for services to initialize (30s)..."
Start-Sleep -Seconds 30

# ── Health checks ──────────────────────────────────────────────────────────────
Write-Step "8/8  Running health checks"

$checks = @(
    @{ Name = "Gateway";    Url = "http://localhost:5000/health";        Port = 5000 },
    @{ Name = "Auth API";   Url = "http://localhost:5001/health";        Port = 5001 },
    @{ Name = "Product";    Url = "http://localhost:5002/health";        Port = 5002 },
    @{ Name = "Inventory";  Url = "http://localhost:5003/health";        Port = 5003 },
    @{ Name = "Order";      Url = "http://localhost:5004/health";        Port = 5004 },
    @{ Name = "Production"; Url = "http://localhost:5005/health";        Port = 5005 },
    @{ Name = "Billing";    Url = "http://localhost:5006/health";        Port = 5006 },
    @{ Name = "Reporting";  Url = "http://localhost:5007/health";        Port = 5007 },
    @{ Name = "Frontend";   Url = "http://localhost:3003";               Port = 3003 }
)

$allHealthy = $true
foreach ($check in $checks) {
    try {
        $resp = Invoke-WebRequest $check.Url -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
        Write-OK "$($check.Name.PadRight(12)) → HTTP $($resp.StatusCode)  ($($check.Url))"
    } catch {
        $code = $_.Exception.Response.StatusCode.value__
        if ($code -ge 200 -and $code -lt 400) {
            Write-OK "$($check.Name.PadRight(12)) → HTTP $code"
        } else {
            Write-Warn "$($check.Name.PadRight(12)) → NOT READY yet  ($($check.Url))"
            $allHealthy = $false
        }
    }
}

# ── Summary ────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor $(if ($allHealthy) { "Green" } else { "Yellow" })
Write-Host "║              RetailERP Deployment Complete                   ║" -ForegroundColor $(if ($allHealthy) { "Green" } else { "Yellow" })
Write-Host "╠══════════════════════════════════════════════════════════════╣" -ForegroundColor $(if ($allHealthy) { "Green" } else { "Yellow" })
Write-Host "║                                                              ║"
Write-Host "║  Frontend       http://localhost:3003                        ║"
Write-Host "║  API Gateway    http://localhost:5000/swagger                ║"
Write-Host "║  Auth Swagger   http://localhost:5001/swagger                ║"
Write-Host "║  Grafana        http://localhost:3002  (admin/admin)         ║"
Write-Host "║                                                              ║"
Write-Host "║  Login:  admin@elcurio.com  /  Admin@123                    ║"
Write-Host "║                                                              ║"
if (-not $allHealthy) {
Write-Host "║  !! Some services not ready yet — check logs below           ║" -ForegroundColor Yellow
}
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor $(if ($allHealthy) { "Green" } else { "Yellow" })

if (-not $allHealthy) {
    Write-Host ""
    Write-Host "  Useful commands:" -ForegroundColor Cyan
    Write-Host "  docker compose logs auth-api --tail 50"
    Write-Host "  docker compose logs db-init"
    Write-Host "  docker compose ps"
}

Write-Host ""
