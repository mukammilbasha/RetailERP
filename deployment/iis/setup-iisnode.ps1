#Requires -RunAsAdministrator
# ============================================================
# RetailERP — IIS + iisnode One-Time Setup Script
# Run once on a fresh Windows Server before first deployment
# ============================================================
[CmdletBinding()]
param(
    [string]$FrontendPath = 'C:\RetailERP\Frontend',
    [int]$Port = 3003
)

$ErrorActionPreference = 'Stop'
function Write-Step($m) { Write-Host "`n=== $m ===" -ForegroundColor Cyan }
function Write-OK($m)   { Write-Host "  [OK] $m" -ForegroundColor Green }
function Write-Warn($m) { Write-Host "  [!!] $m" -ForegroundColor Yellow }

Write-Step "Enabling IIS Features"
$features = @(
    'IIS-WebServer', 'IIS-WebServerManagementTools', 'IIS-WebServerRole',
    'IIS-CommonHttpFeatures', 'IIS-StaticContent', 'IIS-DefaultDocument',
    'IIS-ApplicationDevelopment', 'IIS-ISAPIExtensions', 'IIS-ISAPIFilter',
    'IIS-NetFxExtensibility45', 'IIS-ASPNET45', 'IIS-HttpCompressionStatic',
    'IIS-HttpCompressionDynamic', 'IIS-Security', 'IIS-RequestFiltering',
    'IIS-HttpLogging'
)
foreach ($f in $features) {
    $state = (Get-WindowsOptionalFeature -Online -FeatureName $f -ErrorAction SilentlyContinue).State
    if ($state -ne 'Enabled') {
        Enable-WindowsOptionalFeature -Online -FeatureName $f -All -NoRestart | Out-Null
        Write-OK "Enabled: $f"
    }
}
Import-Module WebAdministration
Write-OK "IIS features enabled"

Write-Step "Checking Node.js"
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Write-Warn "Node.js not found — downloading v20 LTS..."
    $nodeUrl = "https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi"
    $msi = "$env:TEMP\node.msi"
    Invoke-WebRequest -Uri $nodeUrl -OutFile $msi
    Start-Process msiexec.exe -ArgumentList "/i `"$msi`" /qn ADDLOCAL=ALL" -Wait
    $env:PATH += ";C:\Program Files\nodejs"
}
Write-OK "Node.js: $(node --version)"

Write-Step "Installing iisnode"
if (-not (Test-Path "C:\Program Files\iisnode\iisnode.dll")) {
    Write-Warn "Downloading iisnode..."
    $url = "https://github.com/tjanczuk/iisnode/releases/download/v0.2.26/iisnode-full-v0.2.26-x64.msi"
    $msi = "$env:TEMP\iisnode.msi"
    Invoke-WebRequest -Uri $url -OutFile $msi
    Start-Process msiexec.exe -ArgumentList "/i `"$msi`" /qn" -Wait
}
Write-OK "iisnode installed"

Write-Step "Installing URL Rewrite Module"
$rewriteDll = "$env:SystemRoot\System32\inetsrv\rewrite.dll"
if (-not (Test-Path $rewriteDll)) {
    Write-Warn "Downloading URL Rewrite..."
    $url = "https://download.microsoft.com/download/1/2/8/128E2E22-C1B9-44A4-BE2A-5859ED1D4592/rewrite_amd64_en-US.msi"
    $msi = "$env:TEMP\urlrewrite.msi"
    Invoke-WebRequest -Uri $url -OutFile $msi
    Start-Process msiexec.exe -ArgumentList "/i `"$msi`" /qn" -Wait
}
Write-OK "URL Rewrite installed"

Write-Step "Creating Application Pool"
if (-not (Test-Path "IIS:\AppPools\RetailERP-Frontend")) {
    New-WebAppPool -Name "RetailERP-Frontend" | Out-Null
    Set-ItemProperty "IIS:\AppPools\RetailERP-Frontend" -Name managedRuntimeVersion -Value ""
    Set-ItemProperty "IIS:\AppPools\RetailERP-Frontend" -Name processModel.identityType -Value "ApplicationPoolIdentity"
    Set-ItemProperty "IIS:\AppPools\RetailERP-Frontend" -Name startMode -Value "AlwaysRunning"
    Set-ItemProperty "IIS:\AppPools\RetailERP-Frontend" -Name processModel.idleTimeout -Value "00:00:00"
}
Write-OK "App Pool: RetailERP-Frontend"

Write-Step "Creating Frontend Directory"
New-Item -ItemType Directory -Path $FrontendPath -Force | Out-Null
# Grant IIS AppPool read+execute
$acl = Get-Acl $FrontendPath
$rule = New-Object System.Security.AccessControl.FileSystemAccessRule(
    "IIS AppPool\RetailERP-Frontend", "ReadAndExecute",
    "ContainerInherit,ObjectInherit", "None", "Allow")
$acl.SetAccessRule($rule)
Set-Acl $FrontendPath $acl
Write-OK "Directory: $FrontendPath"

Write-Step "Creating IIS Website"
if (-not (Get-Website -Name "RetailERP-Frontend" -ErrorAction SilentlyContinue)) {
    New-Website -Name "RetailERP-Frontend" -Port $Port `
        -PhysicalPath $FrontendPath -ApplicationPool "RetailERP-Frontend" | Out-Null
}
Write-OK "Website: RetailERP-Frontend on port $Port"

Write-Step "Configuring Firewall"
$rule = Get-NetFirewallRule -DisplayName "RetailERP Frontend" -ErrorAction SilentlyContinue
if (-not $rule) {
    New-NetFirewallRule -DisplayName "RetailERP Frontend" -Direction Inbound `
        -Protocol TCP -LocalPort $Port -Action Allow | Out-Null
}
Write-OK "Firewall rule: TCP $Port"

Write-Host "`n=== iisnode Setup Complete ===" -ForegroundColor Green
Write-Host "  Frontend will be served at: http://localhost:$Port"
Write-Host "  Next step: run deploy-iis.ps1 to deploy the application`n"
