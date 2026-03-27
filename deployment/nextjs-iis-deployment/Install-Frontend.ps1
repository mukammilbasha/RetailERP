#Requires -RunAsAdministrator
<#
.SYNOPSIS
    RetailERP - Install Next.js Frontend using PM2 + IIS ARR

.DESCRIPTION
    1. Installs Node.js 20, PM2, IIS, ARR, URL Rewrite (if missing)
    2. Deploys Next.js standalone build to DeployPath
    3. Starts the app with PM2, registers as Windows startup
    4. Creates IIS site that reverse-proxies to PM2

.PARAMETER SiteName   IIS site name.              Default: RetailERP-Frontend
.PARAMETER SitePort   IIS HTTP port.              Default: 3003
.PARAMETER AppPort    PM2 / Node.js port.         Default: 3000
.PARAMETER DeployPath Where to install the app.   Default: C:\RetailERP\Frontend
.PARAMETER ApiUrl     Gateway API URL.            Default: http://localhost:5000

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\Install-Frontend.ps1
    powershell -ExecutionPolicy Bypass -File .\Install-Frontend.ps1 -SitePort 80
    powershell -ExecutionPolicy Bypass -File .\Install-Frontend.ps1 -ApiUrl "http://192.168.1.100:5000"
#>
param(
    [string] $SiteName   = "RetailERP-Frontend",
    [int]    $SitePort   = 3003,
    [int]    $AppPort    = 3000,
    [string] $DeployPath = "C:\RetailERP\Frontend",
    [string] $ApiUrl     = "http://localhost:5000"
)

$ErrorActionPreference = "Stop"
$PackDir = if ($PSScriptRoot) { $PSScriptRoot } `
           elseif ($MyInvocation.MyCommand.Path) { Split-Path -Parent $MyInvocation.MyCommand.Path } `
           else { (Get-Location).Path }

function Write-Step { param($m) Write-Host "`n--- $m" -ForegroundColor Cyan }
function Write-OK   { param($m) Write-Host "  [OK] $m" -ForegroundColor Green }
function Write-Warn { param($m) Write-Host "  [!!] $m" -ForegroundColor Yellow }
function Write-Fail { param($m) Write-Host "  [XX] $m" -ForegroundColor Red; exit 1 }
function Write-Info { param($m) Write-Host "       $m" -ForegroundColor Gray }

Write-Host ""
Write-Host "  RetailERP Frontend Installer (PM2 + IIS ARR)" -ForegroundColor White
Write-Host "  IIS Site : $SiteName  -> :$SitePort" -ForegroundColor Gray
Write-Host "  PM2 App  : retailerp-frontend  -> :$AppPort" -ForegroundColor Gray
Write-Host "  Deploy   : $DeployPath" -ForegroundColor Gray
Write-Host "  API URL  : $ApiUrl" -ForegroundColor Gray
Write-Host ""

$appcmd  = "$env:SystemRoot\System32\inetsrv\appcmd.exe"
$utf8NoBom = New-Object System.Text.UTF8Encoding $false

# ── 1. Prerequisites ───────────────────────────────────────────────────────────
Write-Step "1/6  Prerequisites"

# IIS
$iisFeatures = @(
    'IIS-WebServerRole','IIS-WebServer','IIS-CommonHttpFeatures','IIS-StaticContent',
    'IIS-DefaultDocument','IIS-HttpErrors','IIS-ApplicationDevelopment',
    'IIS-HealthAndDiagnostics','IIS-HttpLogging','IIS-Security',
    'IIS-RequestFiltering','IIS-HttpCompressionStatic',
    'IIS-WebServerManagementTools','IIS-ManagementConsole'
)
$needsIIS = $false
foreach ($f in $iisFeatures) {
    $s = (Get-WindowsOptionalFeature -Online -FeatureName $f -ErrorAction SilentlyContinue).State
    if ($s -ne 'Enabled') { $needsIIS = $true; break }
}
if ($needsIIS) {
    Write-Info "Enabling IIS features..."
    Enable-WindowsOptionalFeature -Online -FeatureName $iisFeatures -All -NoRestart | Out-Null
    Write-OK "IIS enabled"
} else {
    Write-OK "IIS already enabled"
}

$env:PSModulePath = [System.Environment]::GetEnvironmentVariable('PSModulePath','Machine') + ';' +
                    [System.Environment]::GetEnvironmentVariable('PSModulePath','User')
Import-Module WebAdministration -ErrorAction SilentlyContinue

# URL Rewrite
if (-not (Test-Path "$env:SystemRoot\System32\inetsrv\rewrite.dll")) {
    Write-Info "Installing URL Rewrite..."
    $msi = "$env:TEMP\urlrewrite.msi"
    Invoke-WebRequest "https://download.microsoft.com/download/1/2/8/128E2E22-C1B9-44A4-BE2A-5859ED1D4592/rewrite_amd64_en-US.msi" -OutFile $msi -UseBasicParsing
    Start-Process msiexec -ArgumentList "/i `"$msi`" /qn /norestart" -Wait
    Write-OK "URL Rewrite installed"
} else { Write-OK "URL Rewrite present" }

# Application Request Routing (ARR)
$arrDll = "$env:ProgramFiles\IIS\Application Request Routing\Microsoft.Web.Iis.SitesModule.dll"
if (-not (Test-Path $arrDll)) {
    Write-Info "Installing Application Request Routing (ARR)..."
    $arrInstaller = "$env:TEMP\ARR_3_0.exe"
    Invoke-WebRequest "https://download.microsoft.com/download/E/9/8/E9849D6A-020E-47E4-9FD0-A023E99B54EB/requestRouter_amd64.msi" -OutFile $arrInstaller -UseBasicParsing
    Start-Process msiexec -ArgumentList "/i `"$arrInstaller`" /qn /norestart" -Wait
    Write-OK "ARR installed"
} else { Write-OK "ARR present" }

# Enable ARR proxy globally
try {
    Set-WebConfigurationProperty -pspath "MACHINE/WEBROOT" `
        -filter "system.webServer/proxy" -name "enabled" -value $true -ErrorAction SilentlyContinue
    Write-OK "ARR proxy enabled"
} catch { Write-Warn "Could not enable ARR proxy globally: $_ -- enable manually in IIS Manager > ARR" }

# Node.js
$env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" +
            [System.Environment]::GetEnvironmentVariable("PATH","User")
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Write-Info "Installing Node.js 20 LTS..."
    $nodeMsi = "$env:TEMP\node-v20.11.0-x64.msi"
    Invoke-WebRequest "https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi" -OutFile $nodeMsi -UseBasicParsing
    Start-Process msiexec -ArgumentList "/i `"$nodeMsi`" /qn /norestart ADDLOCAL=ALL" -Wait
    $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" +
                [System.Environment]::GetEnvironmentVariable("PATH","User")
    Write-OK "Node.js 20 installed"
} else { Write-OK "Node.js: $(& node --version)" }

# PM2
$pm2 = Get-Command pm2 -ErrorAction SilentlyContinue
if (-not $pm2) {
    Write-Info "Installing PM2 globally..."
    npm install -g pm2 2>&1 | Select-Object -Last 3 | ForEach-Object { Write-Info $_ }
    $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" +
                [System.Environment]::GetEnvironmentVariable("PATH","User")
    Write-OK "PM2 installed"
} else { Write-OK "PM2: $(& pm2 --version)" }

# PM2 Windows startup (pm2-startup or pm2-windows-startup)
$pm2Startup = Get-Command pm2-startup -ErrorAction SilentlyContinue
if (-not $pm2Startup) {
    Write-Info "Installing pm2-startup for Windows service..."
    npm install -g pm2-startup 2>&1 | Select-Object -Last 2 | ForEach-Object { Write-Info $_ }
    Write-OK "pm2-startup installed"
}

# ── 2. Deploy files ────────────────────────────────────────────────────────────
Write-Step "2/6  Deploying to $DeployPath"

# Stop PM2 app if running
pm2 stop retailerp-frontend 2>$null | Out-Null
pm2 delete retailerp-frontend 2>$null | Out-Null

# Stop IIS site
& $appcmd stop site    /site.name:$SiteName    2>$null | Out-Null
& $appcmd stop apppool /apppool.name:$SiteName 2>$null | Out-Null
Start-Sleep -Seconds 2

if (Test-Path $DeployPath) {
    Remove-Item $DeployPath -Recurse -Force
    Write-Warn "Removed previous deployment"
}
New-Item -ItemType Directory $DeployPath -Force | Out-Null

# Copy all files from pack (exclude installer scripts)
Copy-Item -Path "$PackDir\*" -Destination $DeployPath -Recurse -Force `
    -Exclude "Install-Frontend.ps1","README.txt"
New-Item -ItemType Directory (Join-Path $DeployPath "logs") -Force | Out-Null
Write-OK "Files deployed"

# Rewrite ecosystem.config.js with correct DeployPath and ports
$ecosystemContent = @"
module.exports = {
  apps: [
    {
      name        : 'retailerp-frontend',
      script      : 'server.js',
      cwd         : '$($DeployPath.Replace('\','\\'))',
      instances   : 1,
      exec_mode   : 'fork',
      watch       : false,
      autorestart : true,
      max_memory_restart: '512M',
      env: {
        NODE_ENV             : 'production',
        PORT                 : $AppPort,
        HOSTNAME             : '127.0.0.1',
        NEXT_TELEMETRY_DISABLED: '1',
        NEXT_PUBLIC_API_URL  : '$ApiUrl'
      },
      error_file  : '$($DeployPath.Replace('\','\\'))\\logs\\pm2-error.log',
      out_file    : '$($DeployPath.Replace('\','\\'))\\logs\\pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    }
  ]
}
"@
[System.IO.File]::WriteAllText((Join-Path $DeployPath "ecosystem.config.js"), $ecosystemContent, $utf8NoBom)

# Rewrite web.config with correct port (UTF-8 no BOM)
$wcContent = @"
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="RetailERP Frontend PM2" stopProcessing="true">
          <match url="(.*)" />
          <action type="Rewrite" url="http://127.0.0.1:$AppPort/{R:1}" />
          <serverVariables>
            <set name="HTTP_X_FORWARDED_HOST" value="{HTTP_HOST}" />
            <set name="HTTP_X_FORWARDED_PROTO" value="http" />
          </serverVariables>
        </rule>
      </rules>
    </rewrite>
    <httpErrors existingResponse="PassThrough" />
    <staticContent>
      <clear />
    </staticContent>
  </system.webServer>
</configuration>
"@
[System.IO.File]::WriteAllText((Join-Path $DeployPath "web.config"), $wcContent, $utf8NoBom)
Write-OK "web.config and ecosystem.config.js updated with correct paths and ports"

# ── 3. Start PM2 ──────────────────────────────────────────────────────────────
Write-Step "3/6  Starting with PM2"

Push-Location $DeployPath
try {
    pm2 start ecosystem.config.js 2>&1 | ForEach-Object { Write-Info $_ }
    if ($LASTEXITCODE -ne 0) { Write-Fail "PM2 failed to start" }
    Write-OK "PM2 app started"

    pm2 save 2>&1 | Out-Null
    Write-OK "PM2 config saved"
} finally { Pop-Location }

# Register PM2 as Windows startup
Write-Info "Registering PM2 Windows startup..."
try {
    pm2-startup install 2>&1 | Out-Null
    Write-OK "PM2 startup registered"
} catch {
    Write-Warn "pm2-startup failed: $_ -- run 'pm2-startup install' manually after reboot"
}

# Wait for app to be ready
Write-Info "Waiting for Node.js to bind on port $AppPort ..."
$ready = $false
for ($i = 0; $i -lt 15; $i++) {
    Start-Sleep -Seconds 2
    try {
        $r = Invoke-WebRequest "http://127.0.0.1:$AppPort" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
        $ready = $true; break
    } catch { }
}
if ($ready) { Write-OK "Node.js app responding on port $AppPort" }
else { Write-Warn "App not yet on :$AppPort -- check: pm2 logs retailerp-frontend" }

# ── 4. IIS App Pool ────────────────────────────────────────────────────────────
Write-Step "4/6  IIS App Pool: $SiteName"

$poolExists = & $appcmd list apppool /apppool.name:$SiteName 2>$null
if ($poolExists) {
    & $appcmd set apppool /apppool.name:$SiteName /managedRuntimeVersion:"" /managedPipelineMode:Integrated 2>$null | Out-Null
} else {
    & $appcmd add apppool /name:$SiteName /managedRuntimeVersion:"" /managedPipelineMode:Integrated 2>$null | Out-Null
    Write-OK "App pool created"
}
Write-OK "App pool configured (no managed runtime - proxy only)"

# ── 5. IIS Site ────────────────────────────────────────────────────────────────
Write-Step "5/6  IIS Site: $SiteName  (:$SitePort -> :$AppPort)"

$siteExists = & $appcmd list site /site.name:$SiteName 2>$null
if ($siteExists) {
    & $appcmd set site /site.name:$SiteName /physicalPath:$DeployPath 2>$null | Out-Null
} else {
    & $appcmd add site /name:$SiteName /bindings:"http/*:${SitePort}:" `
        /physicalPath:$DeployPath /applicationDefaults.applicationPool:$SiteName 2>$null | Out-Null
    Write-OK "IIS site created"
}

# Permissions
$acl = Get-Acl $DeployPath
$acl.SetAccessRule((New-Object System.Security.AccessControl.FileSystemAccessRule(
    "IIS_IUSRS","ReadAndExecute","ContainerInherit,ObjectInherit","None","Allow")))
Set-Acl $DeployPath $acl
Write-OK "IIS_IUSRS permissions set"

& $appcmd start apppool /apppool.name:$SiteName 2>$null | Out-Null
& $appcmd start site    /site.name:$SiteName    2>$null | Out-Null
Write-OK "IIS site started"

# ── 6. Health check ────────────────────────────────────────────────────────────
Write-Step "6/6  Health check"

Start-Sleep -Seconds 5
try {
    $r = Invoke-WebRequest "http://localhost:$SitePort" -UseBasicParsing -TimeoutSec 15 -ErrorAction Stop
    Write-OK "Frontend responding via IIS: HTTP $($r.StatusCode)"
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    if ($code -ge 200 -and $code -lt 500) {
        Write-OK "Frontend responding: HTTP $code"
    } else {
        Write-Warn "Not responding yet (HTTP $code)"
        Write-Host ""
        Write-Host "  Troubleshoot:" -ForegroundColor Yellow
        Write-Host "    pm2 logs retailerp-frontend" -ForegroundColor White
        Write-Host "    pm2 list" -ForegroundColor White
        Write-Host "    Invoke-WebRequest http://127.0.0.1:$AppPort" -ForegroundColor White
    }
}

Write-Host ""
Write-Host "  =================================================" -ForegroundColor Green
Write-Host "  RetailERP Frontend installed!" -ForegroundColor Green
Write-Host "  IIS URL  : http://localhost:$SitePort" -ForegroundColor White
Write-Host "  PM2 app  : retailerp-frontend (:$AppPort)" -ForegroundColor White
Write-Host "  Deploy   : $DeployPath" -ForegroundColor White
Write-Host "  API      : $ApiUrl" -ForegroundColor White
Write-Host "  Login    : admin@elcurio.com / Admin@123" -ForegroundColor White
Write-Host "  =================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Useful commands:" -ForegroundColor Cyan
Write-Host "    pm2 list"
Write-Host "    pm2 logs retailerp-frontend"
Write-Host "    pm2 restart retailerp-frontend"
Write-Host ""
