# ================================================================
#  RetailERP Frontend — IIS Install Script
#  Run as Administrator
#  Usage: powershell -ExecutionPolicy Bypass -File .\Install.ps1
# ================================================================
param(
    [string]$SiteName   = "RetailERP-Frontend",
    [string]$AppPool    = "RetailERP-Frontend",
    [string]$Port       = "3003",
    [string]$InstallDir = "C:\inetpub\retailerp\frontend"
)

$ErrorActionPreference = "Stop"

function Write-Step { param($msg) Write-Host "`n  [ $msg ]" -ForegroundColor Cyan }
function Write-OK   { param($msg) Write-Host "  + $msg" -ForegroundColor Green }
function Write-Warn { param($msg) Write-Host "  ! $msg" -ForegroundColor Yellow }

Write-Host ""
Write-Host "  =================================================" -ForegroundColor Cyan
Write-Host "    RetailERP Frontend — IIS Setup" -ForegroundColor Cyan
Write-Host "  =================================================" -ForegroundColor Cyan
Write-Host "  Site     : $SiteName"
Write-Host "  Port     : $Port"
Write-Host "  Directory: $InstallDir"

# ── Admin check ──────────────────────────────────────────────
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]"Administrator")) {
    Write-Host "`n  ERROR: Run this script as Administrator" -ForegroundColor Red
    exit 1
}

# ── Import WebAdministration ──────────────────────────────────
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

# ── Check URL Rewrite ─────────────────────────────────────────
$rewriteDll = "$env:SystemRoot\System32\inetsrv\rewrite.dll"
if (-not (Test-Path $rewriteDll)) {
    Write-Warn "URL Rewrite not found. Download manually from:"
    Write-Warn "https://www.iis.net/downloads/microsoft/url-rewrite"
    Write-Host "`n  Press Enter after installing URL Rewrite..." -ForegroundColor Yellow
    Read-Host
}

# ── Create install directory ──────────────────────────────────
Write-Step "Copying application files"
if (Test-Path $InstallDir) {
    Write-Warn "Directory exists — backing up to ${InstallDir}.bak"
    if (Test-Path "${InstallDir}.bak") { Remove-Item "${InstallDir}.bak" -Recurse -Force }
    Rename-Item $InstallDir "${InstallDir}.bak"
}
New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
Copy-Item -Path "$PSScriptRoot\*" -Destination $InstallDir -Recurse -Force
Write-OK "Files copied to $InstallDir"

# Create logs folder
New-Item -ItemType Directory -Path "$InstallDir\logs\iisnode" -Force | Out-Null

# ── App Pool ──────────────────────────────────────────────────
Write-Step "Creating Application Pool: $AppPool"
if (Get-WebAppPoolState -Name $AppPool -ErrorAction SilentlyContinue) {
    Write-Warn "App Pool exists — reconfiguring"
    Set-ItemProperty "IIS:\AppPools\$AppPool" processModel.userName -Value "ApplicationPoolIdentity"
} else {
    New-WebAppPool -Name $AppPool | Out-Null
}
Set-ItemProperty "IIS:\AppPools\$AppPool" managedRuntimeVersion -Value ""
Set-ItemProperty "IIS:\AppPools\$AppPool" startMode              -Value "AlwaysRunning"
Set-ItemProperty "IIS:\AppPools\$AppPool" processModel.idleTimeout -Value "00:00:00"
Set-ItemProperty "IIS:\AppPools\$AppPool" recycling.periodicRestart.time -Value "00:00:00"
Write-OK "App Pool configured"

# ── IIS Site ──────────────────────────────────────────────────
Write-Step "Creating IIS Site: $SiteName"
if (Get-Website -Name $SiteName -ErrorAction SilentlyContinue) {
    Write-Warn "Site exists — removing old site"
    Remove-Website -Name $SiteName
}
New-Website -Name $SiteName -Port $Port -PhysicalPath $InstallDir -ApplicationPool $AppPool | Out-Null
Write-OK "IIS Site created on port $Port"

# ── Set permissions ───────────────────────────────────────────
Write-Step "Setting permissions"
$acl = Get-Acl $InstallDir
$rule = New-Object System.Security.AccessControl.FileSystemAccessRule(
    "IIS AppPool\$AppPool", "FullControl", "ContainerInherit,ObjectInherit", "None", "Allow")
$acl.SetAccessRule($rule)
Set-Acl $InstallDir $acl
Write-OK "Permissions set for IIS AppPool\$AppPool"

# ── Start site ────────────────────────────────────────────────
Write-Step "Starting site"
Start-WebAppPool -Name $AppPool
Start-Website -Name $SiteName
Write-OK "Site started"

# ── Done ──────────────────────────────────────────────────────
Write-Host ""
Write-Host "  =================================================" -ForegroundColor Green
Write-Host "    Frontend installed successfully!" -ForegroundColor Green
Write-Host "  =================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  URL    : http://localhost:$Port" -ForegroundColor Yellow
Write-Host "  Folder : $InstallDir" -ForegroundColor White
Write-Host "  Logs   : $InstallDir\logs\iisnode" -ForegroundColor White
Write-Host ""
Start-Process "http://localhost:$Port"
