#Requires -RunAsAdministrator
# ============================================================
# RetailERP — IIS One-Click Deployment Script
# Usage: .\deploy-iis.ps1 -Environment prod -Version v1.2.3
# ============================================================
[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [ValidateSet('dev','qa','uat','prod')]
    [string]$Environment,

    [string]$Version = (git rev-parse --short HEAD 2>$null) ?? 'unknown',
    [string]$DeployRoot = 'C:\RetailERP',
    [string]$BackupRoot = 'C:\RetailERP\Backups',
    [string]$LogDir = 'C:\RetailERP\Logs',
    [switch]$SkipBackup,
    [switch]$SkipMigrations,
    [switch]$SkipHealthCheck
)

$ErrorActionPreference = 'Stop'
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$deployLog = "$LogDir\deploy-$timestamp.log"

# ── Helper functions ──────────────────────────────────────────
function Write-Log {
    param([string]$Message, [string]$Color = 'White')
    $entry = "[$(Get-Date -Format 'yyyy-MM-ddTHH:mm:ss')] $Message"
    Write-Host $entry -ForegroundColor $Color
    Add-Content -Path $deployLog -Value $entry -ErrorAction SilentlyContinue
}
function Write-Step([string]$msg) { Write-Log "`n=== $msg ===" 'Cyan' }
function Write-OK([string]$msg)   { Write-Log "  [OK] $msg" 'Green' }
function Write-Warn([string]$msg) { Write-Log "  [!!] $msg" 'Yellow' }
function Write-Fail([string]$msg) { Write-Log "  [XX] $msg" 'Red' }

# ── Service definitions ───────────────────────────────────────
$services = @(
    @{Name='Auth';        Port=5001; Dir='auth'},
    @{Name='Product';     Port=5002; Dir='product'},
    @{Name='Inventory';   Port=5003; Dir='inventory'},
    @{Name='Order';       Port=5004; Dir='order'},
    @{Name='Production';  Port=5005; Dir='production'},
    @{Name='Billing';     Port=5006; Dir='billing'},
    @{Name='Reporting';   Port=5007; Dir='reporting'},
    @{Name='Gateway';     Port=5000; Dir='gateway'}
)
$frontendPort = 3003

New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
Write-Log "============================================================"
Write-Log " RetailERP IIS Deployment Started"
Write-Log " Environment: $Environment | Version: $Version"
Write-Log " User: $env:USERNAME | Machine: $env:COMPUTERNAME"
Write-Log "============================================================"

# ── Step 1: Pre-flight ────────────────────────────────────────
Write-Step "Pre-flight Checks"

if (-not (Get-Module -ListAvailable -Name WebAdministration)) {
    Write-Fail "WebAdministration module not found — IIS not installed"
    exit 1
}
Import-Module WebAdministration
Write-OK "IIS/WebAdministration available"

$dotnetRuntime = & dotnet --version 2>$null
if (-not $dotnetRuntime) {
    Write-Fail ".NET runtime not found — install .NET 8 Hosting Bundle"
    exit 1
}
Write-OK ".NET runtime: $dotnetRuntime"

$publishRoot = Join-Path $PSScriptRoot "..\..\publish"
if (-not (Test-Path $publishRoot)) {
    Write-Fail "Publish output not found at $publishRoot — run 'dotnet publish' first"
    exit 1
}
Write-OK "Published artifacts found: $publishRoot"

# ── Step 2: Backup ────────────────────────────────────────────
Write-Step "Backup Current Deployment"

if (-not $SkipBackup) {
    $backupDir = "$BackupRoot\$timestamp"
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

    foreach ($svc in $services) {
        $svcDir = "$DeployRoot\Services\$($svc.Name)"
        if (Test-Path $svcDir) {
            $dest = "$backupDir\$($svc.Name)"
            Copy-Item -Path $svcDir -Destination $dest -Recurse -Force
            Write-OK "Backed up $($svc.Name)"
        }
    }
    # Backup frontend
    $frontendDir = "$DeployRoot\Frontend"
    if (Test-Path $frontendDir) {
        Copy-Item -Path $frontendDir -Destination "$backupDir\Frontend" -Recurse -Force
        Write-OK "Backed up Frontend"
    }
    # Store version info
    [PSCustomObject]@{Version=$Version; Timestamp=$timestamp; Environment=$Environment} |
        ConvertTo-Json | Set-Content "$backupDir\version.json"
    Write-OK "Backup complete: $backupDir"

    # Cleanup old backups (keep last 5)
    Get-ChildItem $BackupRoot -Directory | Sort-Object CreationTime -Descending |
        Select-Object -Skip 5 | Remove-Item -Recurse -Force
    Write-OK "Old backup cleanup done"
} else {
    Write-Warn "Backup skipped (--SkipBackup flag)"
}

# ── Step 3: Stop app pools ────────────────────────────────────
Write-Step "Stopping IIS Application Pools"

foreach ($svc in $services) {
    $poolName = "RetailERP-$($svc.Name)"
    if (Test-Path "IIS:\AppPools\$poolName") {
        if ((Get-WebAppPoolState -Name $poolName).Value -eq 'Started') {
            Stop-WebAppPool -Name $poolName
            Write-OK "Stopped pool: $poolName"
        }
    }
}
if (Test-Path "IIS:\AppPools\RetailERP-Frontend") {
    if ((Get-WebAppPoolState -Name "RetailERP-Frontend").Value -eq 'Started') {
        Stop-WebAppPool -Name "RetailERP-Frontend"
        Write-OK "Stopped pool: RetailERP-Frontend"
    }
}
Start-Sleep -Seconds 3

# ── Step 4: Deploy services ───────────────────────────────────
Write-Step "Deploying Services"

foreach ($svc in $services) {
    $destDir = "$DeployRoot\Services\$($svc.Name)"
    $sourceDir = "$publishRoot\$($svc.Dir)"

    if (-not (Test-Path $sourceDir)) {
        Write-Warn "Published output not found for $($svc.Name): $sourceDir — skipping"
        continue
    }

    New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    # Remove old files (except Logs subfolder)
    Get-ChildItem $destDir -Exclude 'Logs' | Remove-Item -Recurse -Force
    Copy-Item -Path "$sourceDir\*" -Destination $destDir -Recurse -Force

    # Apply environment-specific config
    $envConfig = "$PSScriptRoot\..\config\appsettings.$Environment.json"
    if (Test-Path $envConfig) {
        # Merge with service-level appsettings (environment config overrides)
        Copy-Item $envConfig "$destDir\appsettings.$Environment.json" -Force
    }

    Write-OK "Deployed $($svc.Name) → $destDir"
}

# Deploy frontend
$frontendSource = "$publishRoot\frontend"
if (Test-Path $frontendSource) {
    $frontendDest = "$DeployRoot\Frontend"
    New-Item -ItemType Directory -Path $frontendDest -Force | Out-Null
    Get-ChildItem $frontendDest -Exclude 'Logs' | Remove-Item -Recurse -Force
    Copy-Item -Path "$frontendSource\*" -Destination $frontendDest -Recurse -Force
    Write-OK "Deployed Frontend → $frontendDest"
}

# ── Step 5: Run migrations ────────────────────────────────────
Write-Step "Running Database Migrations"

if (-not $SkipMigrations) {
    $connStr = switch ($Environment) {
        'dev'  { "Server=localhost,1434;Database=RetailERP;User Id=sa;Password=RetailERP@2024!;TrustServerCertificate=true" }
        'qa'   { $env:RETAILERP_QA_CONNECTION }
        'uat'  { $env:RETAILERP_UAT_CONNECTION }
        'prod' { $env:RETAILERP_PROD_CONNECTION }
    }

    foreach ($svc in $services | Where-Object {$_.Dir -ne 'gateway'}) {
        $migrationTool = "$publishRoot\$($svc.Dir)\RetailERP.$($svc.Name).dll"
        if (Test-Path $migrationTool) {
            Write-Log "  Running migrations for $($svc.Name)..."
            & dotnet ef database update `
                --project "$PSScriptRoot\..\..\src\$($svc.Dir)\RetailERP.$($svc.Name).csproj" `
                --connection "$connStr" 2>&1 | Tee-Object -Variable migOutput
            if ($LASTEXITCODE -ne 0) {
                Write-Fail "Migration failed for $($svc.Name)"
                Write-Fail $migOutput
                # Trigger rollback
                Write-Warn "Initiating rollback due to migration failure..."
                & "$PSScriptRoot\rollback-iis.ps1" -Environment $Environment -Version "backup-$timestamp"
                exit 1
            }
            Write-OK "Migrations complete: $($svc.Name)"
        }
    }
}

# ── Step 6: Start app pools ───────────────────────────────────
Write-Step "Starting IIS Application Pools and Sites"

foreach ($svc in $services) {
    $poolName = "RetailERP-$($svc.Name)"
    $siteName = "RetailERP-$($svc.Name)"
    $destDir   = "$DeployRoot\Services\$($svc.Name)"

    # Create pool if missing
    if (-not (Test-Path "IIS:\AppPools\$poolName")) {
        New-WebAppPool -Name $poolName
        Set-ItemProperty "IIS:\AppPools\$poolName" -Name managedRuntimeVersion -Value ""
        Set-ItemProperty "IIS:\AppPools\$poolName" -Name processModel.identityType -Value "ApplicationPoolIdentity"
        Set-ItemProperty "IIS:\AppPools\$poolName" -Name startMode -Value "AlwaysRunning"
        Write-OK "Created pool: $poolName"
    }

    # Create site if missing
    if (-not (Get-Website -Name $siteName -ErrorAction SilentlyContinue)) {
        New-Website -Name $siteName -Port $svc.Port -PhysicalPath $destDir -ApplicationPool $poolName
        Write-OK "Created site: $siteName on port $($svc.Port)"
    } else {
        Set-ItemProperty "IIS:\Sites\$siteName" -Name physicalPath -Value $destDir
    }

    # Set ASPNETCORE_ENVIRONMENT
    $pool = Get-Item "IIS:\AppPools\$poolName"
    if ($null -eq ($pool.processModel.environmentVariables | Where-Object {$_.Name -eq 'ASPNETCORE_ENVIRONMENT'})) {
        $pool.processModel.environmentVariables.add("ASPNETCORE_ENVIRONMENT", $Environment) | Out-Null
        $pool | Set-Item
    }

    Start-WebAppPool -Name $poolName
    Start-Website -Name $siteName -ErrorAction SilentlyContinue
    Write-OK "Started: $siteName"
}

# Start frontend
$frontendPool = "RetailERP-Frontend"
if (-not (Test-Path "IIS:\AppPools\$frontendPool")) {
    New-WebAppPool -Name $frontendPool
    Set-ItemProperty "IIS:\AppPools\$frontendPool" -Name managedRuntimeVersion -Value ""
}
if (-not (Get-Website -Name "RetailERP-Frontend" -ErrorAction SilentlyContinue)) {
    New-Website -Name "RetailERP-Frontend" -Port $frontendPort `
        -PhysicalPath "$DeployRoot\Frontend" -ApplicationPool $frontendPool
}
Start-WebAppPool -Name $frontendPool
Write-OK "Started Frontend on port $frontendPort"

# ── Step 7: Health checks ─────────────────────────────────────
Write-Step "Post-Deployment Health Checks"

if (-not $SkipHealthCheck) {
    Start-Sleep -Seconds 15
    $allHealthy = $true

    foreach ($svc in $services) {
        $url = "http://localhost:$($svc.Port)/health"
        try {
            $response = Invoke-WebRequest -Uri $url -TimeoutSec 10 -UseBasicParsing
            if ($response.StatusCode -eq 200) {
                Write-OK "$($svc.Name) health check passed ($url)"
            } else {
                Write-Fail "$($svc.Name) returned HTTP $($response.StatusCode)"
                $allHealthy = $false
            }
        } catch {
            Write-Fail "$($svc.Name) health check failed: $_"
            $allHealthy = $false
        }
    }

    if (-not $allHealthy) {
        Write-Fail "One or more services failed health checks — rolling back"
        & "$PSScriptRoot\rollback-iis.ps1" -Environment $Environment -Version "backup-$timestamp" -Auto
        exit 1
    }
}

# ── Done ─────────────────────────────────────────────────────
Write-Log ""
Write-Log "============================================================" 'Green'
Write-Log " RetailERP Deployment SUCCESSFUL" 'Green'
Write-Log " Version: $Version | Environment: $Environment" 'Green'
Write-Log "============================================================" 'Green'
Write-Log " Audit log: $deployLog"

# Write to master deployment log
$auditEntry = [PSCustomObject]@{
    Timestamp   = $timestamp
    Version     = $Version
    Environment = $Environment
    Target      = 'IIS'
    User        = $env:USERNAME
    Status      = 'SUCCESS'
}
$masterLog = "$LogDir\deployments.json"
$history = if (Test-Path $masterLog) { Get-Content $masterLog | ConvertFrom-Json } else { @() }
$history = @($history) + $auditEntry
$history | ConvertTo-Json | Set-Content $masterLog
