#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Fast re-deploy: rebuild Next.js and hot-swap the running PM2 process.
    Run this on your BUILD machine after code changes; no need to reinstall deps.

.DESCRIPTION
    1. Runs Build.ps1 -Pack to create retailerp-frontend-iis.zip
    2. (Optional) Copies zip to remote server and triggers remote Install.ps1 -SkipDeps
    3. Or just rebuilds locally for manual copy

.PARAMETER ApiUrl     API gateway URL.  Default: http://localhost:5000
.PARAMETER RemoteHost RDP/WinRM target server (blank = local only).
.PARAMETER RemotePath Destination path on remote server.  Default: C:\RetailERP\Frontend-Deploy

.EXAMPLE
    .\Redeploy.ps1                           # local build only
    .\Redeploy.ps1 -RemoteHost 192.168.1.50  # build + remote push via WinRM
#>
param(
    [string] $ApiUrl     = "http://localhost:5000",
    [string] $RemoteHost = "",
    [string] $RemotePath = "C:\RetailERP\Frontend-Deploy"
)

$ErrorActionPreference = "Stop"
$ScriptDir = $PSScriptRoot

function Write-Step { param($m) Write-Host "`n--- $m" -ForegroundColor Cyan }
function Write-OK   { param($m) Write-Host "  [OK] $m" -ForegroundColor Green }
function Write-Info { param($m) Write-Host "       $m" -ForegroundColor Gray }

Write-Host ""
Write-Host "  RetailERP Frontend - Re-deploy" -ForegroundColor White
Write-Host ""

# Step 1: Build + pack
Write-Step "1/3  Building frontend package"
& "$ScriptDir\Build.ps1" -ApiUrl $ApiUrl -Pack
if ($LASTEXITCODE -ne 0) { Write-Host "[XX] Build failed" -ForegroundColor Red; exit 1 }

$zipPath = Join-Path $ScriptDir "retailerp-frontend-iis.zip"
Write-OK "Package ready: $zipPath"

# Step 2: Remote deploy (optional)
if ($RemoteHost) {
    Write-Step "2/3  Pushing to $RemoteHost via WinRM"

    $session = New-PSSession -ComputerName $RemoteHost -ErrorAction Stop

    # Create staging dir on remote
    Invoke-Command -Session $session -ScriptBlock {
        param($rp)
        New-Item -ItemType Directory $rp -Force | Out-Null
    } -ArgumentList $RemotePath

    # Copy zip
    Copy-Item -Path $zipPath -Destination "$RemotePath\retailerp-frontend-iis.zip" `
        -ToSession $session -Force
    Write-OK "Zip copied to remote"

    # Extract + install on remote
    Invoke-Command -Session $session -ScriptBlock {
        param($rp)
        $extractDir = Join-Path $rp "package"
        if (Test-Path $extractDir) { Remove-Item $extractDir -Recurse -Force }
        Expand-Archive (Join-Path $rp "retailerp-frontend-iis.zip") -DestinationPath $extractDir -Force
        # Run installer (skip deps since they're already installed)
        & "$extractDir\Install.ps1" -SkipDeps
    } -ArgumentList $RemotePath

    Remove-PSSession $session
    Write-OK "Remote deploy complete"
} else {
    Write-Step "2/3  Remote deploy skipped (no -RemoteHost specified)"
    Write-Info "To deploy manually: copy $zipPath to the IIS server and run Install.ps1"
}

# Step 3: Local PM2 reload (if running locally)
Write-Step "3/3  Reloading local PM2 (if running)"
$pm2 = Get-Command pm2 -ErrorAction SilentlyContinue
if ($pm2) {
    $running = pm2 list 2>&1 | Select-String "retailerp-frontend"
    if ($running) {
        pm2 reload retailerp-frontend 2>&1 | Out-Null
        Write-OK "PM2 reloaded (zero-downtime)"
    } else {
        Write-Info "PM2 app not running locally — skipped"
    }
} else { Write-Info "PM2 not found locally — skipped" }

Write-Host ""
Write-Host "  Re-deploy complete!" -ForegroundColor Green
Write-Host ""
