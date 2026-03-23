#Requires -RunAsAdministrator
# ============================================================
# RetailERP — IIS Rollback Script
# Usage: .\rollback-iis.ps1 -Environment prod [-Version backup-20260324-120000]
# ============================================================
[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [ValidateSet('dev','qa','uat','prod')]
    [string]$Environment,

    [string]$Version = "",           # If empty, lists available backups
    [string]$DeployRoot = 'C:\RetailERP',
    [string]$BackupRoot = 'C:\RetailERP\Backups',
    [switch]$Auto                    # Skip confirmation prompt
)

$ErrorActionPreference = 'Stop'
Import-Module WebAdministration

function Write-Log([string]$msg, [string]$color = 'White') { Write-Host $msg -ForegroundColor $color }

$services = @('Auth','Product','Inventory','Order','Production','Billing','Reporting','Gateway')

# ── List available backups ────────────────────────────────────
$backups = Get-ChildItem $BackupRoot -Directory | Sort-Object CreationTime -Descending
if ($backups.Count -eq 0) {
    Write-Log "No backups found in $BackupRoot" 'Red'
    exit 1
}

if ([string]::IsNullOrEmpty($Version)) {
    Write-Log "`nAvailable backups:" 'Cyan'
    $i = 1
    foreach ($b in $backups | Select-Object -First 5) {
        $versionFile = "$($b.FullName)\version.json"
        $vInfo = if (Test-Path $versionFile) { (Get-Content $versionFile | ConvertFrom-Json) } else { $null }
        Write-Log "  $i) $($b.Name)  (version: $($vInfo.Version), env: $($vInfo.Environment))"
        $i++
    }
    if (-not $Auto) {
        $choice = Read-Host "Select backup number to restore (1-5)"
        $selected = $backups | Select-Object -First 5 | Select-Object -Index ([int]$choice - 1)
        $Version = $selected.Name
    } else {
        # Auto: pick most recent backup
        $Version = $backups[0].Name
        Write-Log "Auto-rollback: using most recent backup: $Version" 'Yellow'
    }
}

$backupDir = "$BackupRoot\$Version"
if (-not (Test-Path $backupDir)) {
    Write-Log "Backup not found: $backupDir" 'Red'
    exit 1
}

# ── Confirmation ──────────────────────────────────────────────
if (-not $Auto) {
    Write-Log "`nRolling back RetailERP $Environment from: $backupDir" 'Yellow'
    $confirm = Read-Host "Confirm? (yes/no)"
    if ($confirm -ne 'yes') { Write-Log "Rollback aborted."; exit 0 }
}

Write-Log "`nStarting rollback..." 'Yellow'

# ── Stop app pools ────────────────────────────────────────────
foreach ($svc in $services) {
    $poolName = "RetailERP-$svc"
    if (Test-Path "IIS:\AppPools\$poolName") {
        if ((Get-WebAppPoolState -Name $poolName).Value -eq 'Started') {
            Stop-WebAppPool -Name $poolName
        }
    }
}
Stop-WebAppPool -Name "RetailERP-Frontend" -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3

# ── Restore files ─────────────────────────────────────────────
foreach ($svc in $services) {
    $srcDir  = "$backupDir\$svc"
    $destDir = "$DeployRoot\Services\$svc"
    if (Test-Path $srcDir) {
        if (Test-Path $destDir) { Remove-Item $destDir -Recurse -Force }
        Copy-Item -Path $srcDir -Destination $destDir -Recurse -Force
        Write-Log "  [OK] Restored: $svc" 'Green'
    }
}
$frontendBackup = "$backupDir\Frontend"
if (Test-Path $frontendBackup) {
    $frontendDest = "$DeployRoot\Frontend"
    if (Test-Path $frontendDest) { Remove-Item $frontendDest -Recurse -Force }
    Copy-Item -Path $frontendBackup -Destination $frontendDest -Recurse -Force
    Write-Log "  [OK] Restored: Frontend" 'Green'
}

# ── Start app pools ───────────────────────────────────────────
foreach ($svc in $services) {
    $poolName = "RetailERP-$svc"
    if (Test-Path "IIS:\AppPools\$poolName") {
        Start-WebAppPool -Name $poolName
        Write-Log "  [OK] Started: $poolName" 'Green'
    }
}
Start-WebAppPool -Name "RetailERP-Frontend" -ErrorAction SilentlyContinue

# ── Health check ──────────────────────────────────────────────
Write-Log "`nVerifying rollback health..." 'Yellow'
Start-Sleep -Seconds 15
$ports = @{Auth=5001; Product=5002; Inventory=5003; Order=5004; Production=5005; Billing=5006; Reporting=5007; Gateway=5000}
$healthy = $true
foreach ($svc in $services) {
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:$($ports[$svc])/health" -TimeoutSec 8 -UseBasicParsing
        if ($r.StatusCode -eq 200) { Write-Log "  [OK] $svc" 'Green' }
        else { Write-Log "  [!!] $svc HTTP $($r.StatusCode)" 'Yellow'; $healthy = $false }
    } catch {
        Write-Log "  [XX] $svc UNREACHABLE" 'Red'; $healthy = $false
    }
}

if ($healthy) {
    Write-Log "`nRollback SUCCESSFUL — all services healthy" 'Green'
} else {
    Write-Log "`nRollback complete but some services still unhealthy — manual intervention required" 'Red'
    exit 1
}
