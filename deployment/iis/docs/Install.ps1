# ================================================================
#  RetailERP Docs -- IIS Install Script
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

Write-Host ""
Write-Host "  =================================================" -ForegroundColor Cyan
Write-Host "    RetailERP Docs -- IIS Setup" -ForegroundColor Cyan
Write-Host "  =================================================" -ForegroundColor Cyan
Write-Host "  Site     : $SiteName"
Write-Host "  Port     : $Port"
Write-Host "  Directory: $InstallDir"
Write-Host ""

# -- Admin check --
$identity = [System.Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object System.Security.Principal.WindowsPrincipal($identity)
$adminRole = [System.Security.Principal.WindowsBuiltInRole]::Administrator
if (-not $principal.IsInRole($adminRole)) {
    Write-Host "  ERROR: Please run this script as Administrator." -ForegroundColor Red
    exit 1
}
Write-Host "  + Running as Administrator" -ForegroundColor Green

# -- Import IIS module --
Import-Module WebAdministration -ErrorAction Stop
Write-Host "  + WebAdministration module loaded" -ForegroundColor Green

# -- Check Node.js --
Write-Host ""
Write-Host "  [ Checking prerequisites ]" -ForegroundColor Cyan
$node = Get-Command node -ErrorAction SilentlyContinue
if ($node -eq $null) {
    Write-Host "  ! Node.js not found. Downloading LTS..." -ForegroundColor Yellow
    $nodeUrl = "https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi"
    $nodeMsi = "$env:TEMP\node-install.msi"
    Invoke-WebRequest -Uri $nodeUrl -OutFile $nodeMsi
    Start-Process -FilePath "msiexec" -ArgumentList "/i `"$nodeMsi`" /quiet" -Wait
    $env:PATH = $env:PATH + ";C:\Program Files\nodejs"
    Write-Host "  + Node.js installed" -ForegroundColor Green
} else {
    Write-Host "  + Node.js found" -ForegroundColor Green
}

# -- Check iisnode --
$iisnodePath = "C:\Program Files\iisnode\iisnode.dll"
if (-not (Test-Path $iisnodePath)) {
    Write-Host "  ! iisnode not found. Downloading..." -ForegroundColor Yellow
    $iisnodeUrl = "https://github.com/Azure/iisnode/releases/download/v0.2.26/iisnode-full-v0.2.26-x64.msi"
    $iisnodeMsi = "$env:TEMP\iisnode-install.msi"
    Invoke-WebRequest -Uri $iisnodeUrl -OutFile $iisnodeMsi
    Start-Process -FilePath "msiexec" -ArgumentList "/i `"$iisnodeMsi`" /quiet" -Wait
    Write-Host "  + iisnode installed" -ForegroundColor Green
} else {
    Write-Host "  + iisnode found" -ForegroundColor Green
}

# -- Check URL Rewrite --
$rewritePath = "$env:SystemRoot\System32\inetsrv\rewrite.dll"
if (-not (Test-Path $rewritePath)) {
    Write-Host "  ! URL Rewrite module not found." -ForegroundColor Yellow
    Write-Host "    Download from: https://www.iis.net/downloads/microsoft/url-rewrite" -ForegroundColor Yellow
    Write-Host "    Press Enter after installing URL Rewrite..." -ForegroundColor Yellow
    Read-Host
}

# -- Copy files --
Write-Host ""
Write-Host "  [ Copying application files ]" -ForegroundColor Cyan
if (Test-Path $InstallDir) {
    Write-Host "  ! Directory exists, backing up..." -ForegroundColor Yellow
    $backupDir = $InstallDir + ".bak"
    if (Test-Path $backupDir) {
        Remove-Item $backupDir -Recurse -Force
    }
    Rename-Item -Path $InstallDir -NewName $backupDir
}
New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
Copy-Item -Path "$PSScriptRoot\*" -Destination $InstallDir -Recurse -Force
New-Item -ItemType Directory -Path "$InstallDir\logs\iisnode" -Force | Out-Null
Write-Host "  + Files copied to $InstallDir" -ForegroundColor Green

# -- App Pool --
Write-Host ""
Write-Host "  [ Creating Application Pool: $AppPool ]" -ForegroundColor Cyan
$poolExists = Get-WebAppPoolState -Name $AppPool -ErrorAction SilentlyContinue
if ($poolExists -ne $null) {
    Write-Host "  ! App Pool exists, reconfiguring..." -ForegroundColor Yellow
} else {
    New-WebAppPool -Name $AppPool | Out-Null
}
Set-ItemProperty -Path "IIS:\AppPools\$AppPool" -Name "managedRuntimeVersion" -Value ""
Set-ItemProperty -Path "IIS:\AppPools\$AppPool" -Name "startMode" -Value "AlwaysRunning"
Set-ItemProperty -Path "IIS:\AppPools\$AppPool" -Name "processModel.idleTimeout" -Value ([TimeSpan]::Zero)
Write-Host "  + App Pool configured" -ForegroundColor Green

# -- IIS Site --
Write-Host ""
Write-Host "  [ Creating IIS Site: $SiteName ]" -ForegroundColor Cyan
$siteExists = Get-Website -Name $SiteName -ErrorAction SilentlyContinue
if ($siteExists -ne $null) {
    Write-Host "  ! Site exists, removing..." -ForegroundColor Yellow
    Remove-Website -Name $SiteName
}
New-Website -Name $SiteName -Port $Port -PhysicalPath $InstallDir -ApplicationPool $AppPool | Out-Null
Write-Host "  + IIS Site created on port $Port" -ForegroundColor Green

# -- Permissions --
Write-Host ""
Write-Host "  [ Setting permissions ]" -ForegroundColor Cyan
$acl = Get-Acl -Path $InstallDir
$identity2 = "IIS AppPool\$AppPool"
$rights = [System.Security.AccessControl.FileSystemRights]::FullControl
$inheritance = [System.Security.AccessControl.InheritanceFlags]"ContainerInherit,ObjectInherit"
$propagation = [System.Security.AccessControl.PropagationFlags]::None
$type = [System.Security.AccessControl.AccessControlType]::Allow
$rule = New-Object System.Security.AccessControl.FileSystemAccessRule($identity2, $rights, $inheritance, $propagation, $type)
$acl.SetAccessRule($rule)
Set-Acl -Path $InstallDir -AclObject $acl
Write-Host "  + Permissions set for IIS AppPool\$AppPool" -ForegroundColor Green

# -- Start --
Write-Host ""
Write-Host "  [ Starting site ]" -ForegroundColor Cyan
Start-WebAppPool -Name $AppPool
Start-Website -Name $SiteName
Write-Host "  + Site started" -ForegroundColor Green

Write-Host ""
Write-Host "  =================================================" -ForegroundColor Green
Write-Host "    Docs installed successfully!" -ForegroundColor Green
Write-Host "  =================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  URL    : http://localhost:$Port" -ForegroundColor Yellow
Write-Host "  Folder : $InstallDir" -ForegroundColor White
Write-Host ""
Start-Process "http://localhost:$Port"
