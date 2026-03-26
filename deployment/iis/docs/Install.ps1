# ================================================================
#  RetailERP Docs — IIS Install Script
#  Run as Administrator
#  Usage: powershell -ExecutionPolicy Bypass -File .\Install.ps1
# ================================================================
param(
    [string]$SiteName   = "RetailERP-Docs",
    [string]$AppPool    = "RetailERP-Docs",
    [string]$Port       = "3100",
    [string]$InstallDir = "C:\inetpub\retailerp\docs"
)

$ErrorActionPreference = "Stop"

function Write-Step { param($msg) Write-Host "`n  [ $msg ]" -ForegroundColor Cyan }
function Write-OK   { param($msg) Write-Host "  + $msg" -ForegroundColor Green }
function Write-Warn { param($msg) Write-Host "  ! $msg" -ForegroundColor Yellow }

Write-Host ""
Write-Host "  =================================================" -ForegroundColor Cyan
Write-Host "    RetailERP Docs — IIS Setup" -ForegroundColor Cyan
Write-Host "  =================================================" -ForegroundColor Cyan
Write-Host "  Site     : $SiteName"
Write-Host "  Port     : $Port"
Write-Host "  Directory: $InstallDir"

# ── Admin check ──────────────────────────────────────────────
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]"Administrator")) {
    Write-Host "`n  ERROR: Run this script as Administrator" -ForegroundColor Red
    exit 1
}

Import-Module WebAdministration -ErrorAction Stop

# ── Check Node.js ─────────────────────────────────────────────
Write-Step "Checking prerequisites"
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Write-Warn "Node.js not found. Downloading LTS..."
    $nodeUrl = "https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi"
    $nodeMsi = "$env:TEMP\node-install.msi"
    Invoke-WebRequest -Uri $nodeUrl -OutFile $nodeMsi
    Start-Process msiexec -ArgumentList "/i `"$nodeMsi`" /quiet" -Wait
    $env:PATH += ";C:\Program Files\nodejs"
} else {
    Write-OK "Node.js: $($node.Version)"
}

# ── Check iisnode ─────────────────────────────────────────────
$iisnodeDll = "C:\Program Files\iisnode\iisnode.dll"
if (-not (Test-Path $iisnodeDll)) {
    Write-Warn "iisnode not found. Downloading..."
    $iisnodeUrl = "https://github.com/Azure/iisnode/releases/download/v0.2.26/iisnode-full-v0.2.26-x64.msi"
    $iisnodeMsi = "$env:TEMP\iisnode-install.msi"
    Invoke-WebRequest -Uri $iisnodeUrl -OutFile $iisnodeMsi
    Start-Process msiexec -ArgumentList "/i `"$iisnodeMsi`" /quiet" -Wait
    Write-OK "iisnode installed"
} else {
    Write-OK "iisnode: found"
}

# ── Copy files ────────────────────────────────────────────────
Write-Step "Copying application files"
if (Test-Path $InstallDir) {
    Write-Warn "Directory exists — backing up"
    if (Test-Path "${InstallDir}.bak") { Remove-Item "${InstallDir}.bak" -Recurse -Force }
    Rename-Item $InstallDir "${InstallDir}.bak"
}
New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
Copy-Item -Path "$PSScriptRoot\*" -Destination $InstallDir -Recurse -Force
New-Item -ItemType Directory -Path "$InstallDir\logs\iisnode" -Force | Out-Null
Write-OK "Files copied to $InstallDir"

# ── App Pool ──────────────────────────────────────────────────
Write-Step "Creating Application Pool: $AppPool"
if (Get-WebAppPoolState -Name $AppPool -ErrorAction SilentlyContinue) {
    Write-Warn "App Pool exists — reconfiguring"
} else {
    New-WebAppPool -Name $AppPool | Out-Null
}
Set-ItemProperty "IIS:\AppPools\$AppPool" managedRuntimeVersion -Value ""
Set-ItemProperty "IIS:\AppPools\$AppPool" startMode              -Value "AlwaysRunning"
Set-ItemProperty "IIS:\AppPools\$AppPool" processModel.idleTimeout -Value "00:00:00"
Write-OK "App Pool configured"

# ── IIS Site ──────────────────────────────────────────────────
Write-Step "Creating IIS Site: $SiteName"
if (Get-Website -Name $SiteName -ErrorAction SilentlyContinue) {
    Remove-Website -Name $SiteName
}
New-Website -Name $SiteName -Port $Port -PhysicalPath $InstallDir -ApplicationPool $AppPool | Out-Null
Write-OK "IIS Site created on port $Port"

# ── Permissions ───────────────────────────────────────────────
Write-Step "Setting permissions"
$acl = Get-Acl $InstallDir
$rule = New-Object System.Security.AccessControl.FileSystemAccessRule(
    "IIS AppPool\$AppPool", "FullControl", "ContainerInherit,ObjectInherit", "None", "Allow")
$acl.SetAccessRule($rule)
Set-Acl $InstallDir $acl
Write-OK "Permissions set"

# ── Start ─────────────────────────────────────────────────────
Write-Step "Starting site"
Start-WebAppPool -Name $AppPool
Start-Website -Name $SiteName
Write-OK "Site started"

Write-Host ""
Write-Host "  =================================================" -ForegroundColor Green
Write-Host "    Docs installed successfully!" -ForegroundColor Green
Write-Host "  =================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  URL    : http://localhost:$Port" -ForegroundColor Yellow
Write-Host "  Folder : $InstallDir" -ForegroundColor White
Write-Host ""
Start-Process "http://localhost:$Port"
