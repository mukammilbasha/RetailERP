#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Install RetailERP Frontend on IIS using PM2 (Node.js) + ARR (reverse proxy).

.DESCRIPTION
    Installs everything from scratch on a fresh Windows Server / IIS machine:
      - Enables required IIS features
      - Installs URL Rewrite + Application Request Routing (ARR)
      - Installs Node.js 20 LTS
      - Installs PM2 + pm2-startup (Windows service auto-start)
      - Deploys Next.js standalone build to DeployPath
      - Configures IIS App Pool + Site
      - Opens firewall port
      - Runs health check

    Architecture:
      Browser → IIS (SitePort) → ARR reverse proxy → PM2 Node.js (AppPort)

.PARAMETER SiteName   IIS website name.              Default: RetailERP-Frontend
.PARAMETER SitePort   IIS HTTP port.                 Default: 3003
.PARAMETER AppPort    PM2 / Node.js internal port.   Default: 3000
.PARAMETER DeployPath Install directory.             Default: C:\RetailERP\Frontend
.PARAMETER ApiUrl     API gateway URL.               Default: http://localhost:5000
.PARAMETER SkipDeps   Skip Node/PM2/IIS installation (re-deploy only).

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\Install.ps1
    .\Install.ps1 -SitePort 80
    .\Install.ps1 -SitePort 443 -ApiUrl https://api.company.com
    .\Install.ps1 -SkipDeps   # fast re-deploy, deps already installed
#>
param(
    [string] $SiteName   = "RetailERP-Frontend",
    [int]    $SitePort   = 3003,
    [int]    $AppPort    = 3000,
    [string] $DeployPath = "C:\RetailERP\Frontend",
    [string] $ApiUrl     = "http://localhost:5000",
    [switch] $SkipDeps
)

$ErrorActionPreference = "Stop"
$utf8NoBom = New-Object System.Text.UTF8Encoding $false

# Source directory = folder containing this script
$PackDir = if ($PSScriptRoot) { $PSScriptRoot } `
           elseif ($MyInvocation.MyCommand.Path) { Split-Path -Parent $MyInvocation.MyCommand.Path } `
           else { (Get-Location).Path }

function Write-Step { param($m) Write-Host "`n--- $m" -ForegroundColor Cyan }
function Write-OK   { param($m) Write-Host "  [OK] $m" -ForegroundColor Green }
function Write-Warn { param($m) Write-Host "  [!!] $m" -ForegroundColor Yellow }
function Write-Fail { param($m) Write-Host "  [XX] $m" -ForegroundColor Red; exit 1 }
function Write-Info { param($m) Write-Host "       $m" -ForegroundColor Gray }

Write-Host ""
Write-Host "  RetailERP Frontend Installer" -ForegroundColor White
Write-Host "  Mode     : PM2 (Node.js) + IIS ARR (reverse proxy)" -ForegroundColor Gray
Write-Host "  IIS Site : $SiteName  -> http://localhost:$SitePort" -ForegroundColor Gray
Write-Host "  PM2 App  : retailerp-frontend  -> 127.0.0.1:$AppPort" -ForegroundColor Gray
Write-Host "  Deploy   : $DeployPath" -ForegroundColor Gray
Write-Host "  API URL  : $ApiUrl" -ForegroundColor Gray
if ($SkipDeps) { Write-Host "  Mode     : Re-deploy only (skipping prerequisites)" -ForegroundColor Yellow }
Write-Host ""

$appcmd = "$env:SystemRoot\System32\inetsrv\appcmd.exe"

# ── 1. Prerequisites ───────────────────────────────────────────────────────────
if (-not $SkipDeps) {
    Write-Step "1/7  Prerequisites"

    # IIS features
    $iisFeatures = @(
        'IIS-WebServerRole','IIS-WebServer','IIS-CommonHttpFeatures','IIS-StaticContent',
        'IIS-DefaultDocument','IIS-HttpErrors','IIS-ApplicationDevelopment',
        'IIS-HealthAndDiagnostics','IIS-HttpLogging','IIS-Security',
        'IIS-RequestFiltering','IIS-HttpCompressionStatic','IIS-HttpCompressionDynamic',
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
    } else { Write-OK "IIS already enabled" }

    $env:PSModulePath = [System.Environment]::GetEnvironmentVariable('PSModulePath','Machine') + ';' +
                        [System.Environment]::GetEnvironmentVariable('PSModulePath','User')
    Import-Module WebAdministration -ErrorAction SilentlyContinue

    # URL Rewrite
    if (-not (Test-Path "$env:SystemRoot\System32\inetsrv\rewrite.dll")) {
        Write-Info "Installing URL Rewrite..."
        $msi = "$env:TEMP\urlrewrite.msi"
        Invoke-WebRequest "https://download.microsoft.com/download/1/2/8/128E2E22-C1B9-44A4-BE2A-5859ED1D4592/rewrite_amd64_en-US.msi" `
            -OutFile $msi -UseBasicParsing
        Start-Process msiexec -ArgumentList "/i `"$msi`" /qn /norestart" -Wait
        Write-OK "URL Rewrite installed"
    } else { Write-OK "URL Rewrite present" }

    # ARR (Application Request Routing)
    $arrDll = "$env:ProgramFiles\IIS\Application Request Routing\Microsoft.Web.Iis.SitesModule.dll"
    if (-not (Test-Path $arrDll)) {
        Write-Info "Installing Application Request Routing (ARR 3.0)..."
        $arr = "$env:TEMP\arr.msi"
        Invoke-WebRequest "https://download.microsoft.com/download/E/9/8/E9849D6A-020E-47E4-9FD0-A023E99B54EB/requestRouter_amd64.msi" `
            -OutFile $arr -UseBasicParsing
        Start-Process msiexec -ArgumentList "/i `"$arr`" /qn /norestart" -Wait
        Write-OK "ARR installed"
    } else { Write-OK "ARR present" }

    # Enable ARR proxy globally
    try {
        Set-WebConfigurationProperty -pspath "MACHINE/WEBROOT" `
            -filter "system.webServer/proxy" -name "enabled" -value $true -ErrorAction SilentlyContinue
        Write-OK "ARR proxy enabled globally"
    } catch { Write-Warn "Enable ARR proxy manually: IIS Manager > Application Request Routing > Enable Proxy" }

    # Node.js 20 LTS
    $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" +
                [System.Environment]::GetEnvironmentVariable("PATH","User")
    $node = Get-Command node -ErrorAction SilentlyContinue
    if (-not $node) {
        Write-Info "Installing Node.js 20 LTS..."
        $nodeMsi = "$env:TEMP\node-v20.11.0-x64.msi"
        Invoke-WebRequest "https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi" `
            -OutFile $nodeMsi -UseBasicParsing
        Start-Process msiexec -ArgumentList "/i `"$nodeMsi`" /qn /norestart ADDLOCAL=ALL" -Wait
        $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" +
                    [System.Environment]::GetEnvironmentVariable("PATH","User")
        Write-OK "Node.js 20 installed"
    } else { Write-OK "Node.js: $(& node --version)" }

    # PM2
    $pm2 = Get-Command pm2 -ErrorAction SilentlyContinue
    if (-not $pm2) {
        Write-Info "Installing PM2..."
        npm install -g pm2 2>&1 | Select-Object -Last 3 | ForEach-Object { Write-Info $_ }
        $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" +
                    [System.Environment]::GetEnvironmentVariable("PATH","User")
        Write-OK "PM2 installed"
    } else { Write-OK "PM2: $(& pm2 --version)" }

    # pm2-startup (Windows service)
    $pm2s = Get-Command pm2-startup -ErrorAction SilentlyContinue
    if (-not $pm2s) {
        Write-Info "Installing pm2-startup..."
        npm install -g pm2-startup 2>&1 | Select-Object -Last 2 | ForEach-Object { Write-Info $_ }
        Write-OK "pm2-startup installed"
    } else { Write-OK "pm2-startup present" }

} else {
    Write-Step "1/7  Prerequisites (skipped)"
    Import-Module WebAdministration -ErrorAction SilentlyContinue
    $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" +
                [System.Environment]::GetEnvironmentVariable("PATH","User")
    Write-OK "Skipped (SkipDeps flag)"
}

# ── 2. Stop existing app/site ─────────────────────────────────────────────────
Write-Step "2/7  Stopping existing app"

pm2 stop   retailerp-frontend 2>$null | Out-Null
pm2 delete retailerp-frontend 2>$null | Out-Null
Write-Info "PM2 app cleared"

& $appcmd stop site    /site.name:$SiteName    2>$null | Out-Null
& $appcmd stop apppool /apppool.name:$SiteName 2>$null | Out-Null
Start-Sleep -Seconds 2
Write-OK "IIS site/pool stopped"

# ── 3. Deploy files ───────────────────────────────────────────────────────────
Write-Step "3/7  Deploying to $DeployPath"

if (Test-Path $DeployPath) {
    Remove-Item $DeployPath -Recurse -Force
    Write-Info "Removed previous deployment"
}
New-Item -ItemType Directory $DeployPath -Force | Out-Null

# Copy all package files (exclude installer script + readme)
Get-ChildItem $PackDir -Exclude "Install.ps1","README.txt","Build.ps1" |
    Copy-Item -Destination $DeployPath -Recurse -Force

New-Item -ItemType Directory (Join-Path $DeployPath "logs") -Force | Out-Null
Write-OK "Files deployed"

# Write ecosystem.config.js with correct runtime paths and ports
$ecoPath = Join-Path $DeployPath "ecosystem.config.js"
$escapedPath = $DeployPath.Replace('\','\\')
$ecosystem = @"
module.exports = {
  apps: [
    {
      name             : 'retailerp-frontend',
      script           : 'server.js',
      cwd              : '$escapedPath',
      instances        : 1,
      exec_mode        : 'fork',
      watch            : false,
      autorestart      : true,
      max_memory_restart: '512M',
      env: {
        NODE_ENV                : 'production',
        PORT                    : $AppPort,
        HOSTNAME                : '127.0.0.1',
        NEXT_TELEMETRY_DISABLED : '1',
        NEXT_PUBLIC_API_URL     : '$ApiUrl'
      },
      error_file       : '$escapedPath\\logs\\pm2-error.log',
      out_file         : '$escapedPath\\logs\\pm2-out.log',
      log_date_format  : 'YYYY-MM-DD HH:mm:ss'
    }
  ]
}
"@
[System.IO.File]::WriteAllText($ecoPath, $ecosystem, $utf8NoBom)
Write-Info "ecosystem.config.js updated"

# Write web.config with correct AppPort
$wcPath = Join-Path $DeployPath "web.config"
$webConfig = @"
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="RetailERP-Frontend" stopProcessing="true">
          <match url="(.*)" />
          <action type="Rewrite" url="http://127.0.0.1:$AppPort/{R:1}" />
          <serverVariables>
            <set name="HTTP_X_FORWARDED_HOST"  value="{HTTP_HOST}" />
            <set name="HTTP_X_FORWARDED_PROTO" value="http" />
            <set name="HTTP_X_REAL_IP"         value="{REMOTE_ADDR}" />
          </serverVariables>
        </rule>
      </rules>
    </rewrite>
    <httpErrors existingResponse="PassThrough" />
    <staticContent><clear /></staticContent>
    <httpProtocol>
      <customHeaders>
        <remove name="X-Powered-By" />
        <add name="X-Frame-Options"        value="SAMEORIGIN" />
        <add name="X-Content-Type-Options" value="nosniff" />
        <add name="X-XSS-Protection"       value="1; mode=block" />
        <add name="Referrer-Policy"        value="strict-origin-when-cross-origin" />
        <add name="Permissions-Policy"     value="camera=(), microphone=(), geolocation=()" />
      </customHeaders>
    </httpProtocol>
    <security>
      <requestFiltering removeServerHeader="true">
        <requestLimits maxAllowedContentLength="52428800" />
      </requestFiltering>
    </security>
  </system.webServer>
</configuration>
"@
[System.IO.File]::WriteAllText($wcPath, $webConfig, $utf8NoBom)
Write-Info "web.config updated"

# ── 4. Start with PM2 ─────────────────────────────────────────────────────────
Write-Step "4/7  Starting with PM2"

Push-Location $DeployPath
try {
    pm2 start ecosystem.config.js 2>&1 | ForEach-Object { Write-Info $_ }
    if ($LASTEXITCODE -ne 0) { Write-Fail "PM2 failed to start app" }
    Write-OK "PM2 app started"

    pm2 save 2>&1 | Out-Null
    Write-OK "PM2 config saved"
} finally { Pop-Location }

# Register PM2 as Windows startup service
Write-Info "Registering PM2 as Windows startup service..."
try {
    pm2-startup install 2>&1 | Out-Null
    Write-OK "PM2 registered as Windows service (auto-start on boot)"
} catch {
    Write-Warn "pm2-startup failed — run 'pm2-startup install' manually if needed"
}

# Wait for Node to bind port
Write-Info "Waiting for Node.js on port $AppPort..."
$nodeReady = $false
for ($i = 0; $i -lt 15; $i++) {
    Start-Sleep -Seconds 2
    try {
        Invoke-WebRequest "http://127.0.0.1:$AppPort" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop | Out-Null
        $nodeReady = $true; break
    } catch { }
}
if ($nodeReady) { Write-OK "Node.js responding on :$AppPort" }
else            { Write-Warn "Node.js not yet on :$AppPort — check: pm2 logs retailerp-frontend" }

# ── 5. IIS App Pool ───────────────────────────────────────────────────────────
Write-Step "5/7  IIS App Pool: $SiteName"

$poolExists = & $appcmd list apppool /apppool.name:$SiteName 2>$null
if ($poolExists) {
    & $appcmd set apppool /apppool.name:$SiteName /managedRuntimeVersion:"" /managedPipelineMode:Integrated 2>$null | Out-Null
    Write-OK "App pool updated"
} else {
    & $appcmd add apppool /name:$SiteName /managedRuntimeVersion:"" /managedPipelineMode:Integrated 2>$null | Out-Null
    Write-OK "App pool created (no managed runtime — pure proxy)"
}

# ── 6. IIS Site ───────────────────────────────────────────────────────────────
Write-Step "6/7  IIS Site: $SiteName  (:$SitePort -> :$AppPort)"

$siteExists = & $appcmd list site /site.name:$SiteName 2>$null
if ($siteExists) {
    & $appcmd set site /site.name:$SiteName /physicalPath:$DeployPath 2>$null | Out-Null
    Write-OK "IIS site updated"
} else {
    & $appcmd add site /name:$SiteName /bindings:"http/*:${SitePort}:" `
        /physicalPath:$DeployPath /applicationDefaults.applicationPool:$SiteName 2>$null | Out-Null
    Write-OK "IIS site created on :$SitePort"
}

# Grant IIS_IUSRS read access to deploy folder
$acl = Get-Acl $DeployPath
$rule = New-Object System.Security.AccessControl.FileSystemAccessRule(
    "IIS_IUSRS","ReadAndExecute","ContainerInherit,ObjectInherit","None","Allow")
$acl.SetAccessRule($rule)
Set-Acl $DeployPath $acl
Write-OK "IIS_IUSRS permissions set"

& $appcmd start apppool /apppool.name:$SiteName 2>$null | Out-Null
& $appcmd start site    /site.name:$SiteName    2>$null | Out-Null
Write-OK "IIS site started"

# Firewall rule
$fwName = "RetailERP Frontend (port $SitePort)"
if (-not (Get-NetFirewallRule -DisplayName $fwName -ErrorAction SilentlyContinue)) {
    New-NetFirewallRule -DisplayName $fwName -Direction Inbound `
        -Protocol TCP -LocalPort $SitePort -Action Allow | Out-Null
    Write-OK "Firewall: allowed TCP $SitePort"
} else { Write-OK "Firewall rule already exists" }

# ── 7. Health check ───────────────────────────────────────────────────────────
Write-Step "7/7  Health check"

Start-Sleep -Seconds 5
try {
    $r = Invoke-WebRequest "http://localhost:$SitePort" -UseBasicParsing -TimeoutSec 15 -ErrorAction Stop
    Write-OK "Frontend responding via IIS: HTTP $($r.StatusCode)"
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    if ($code -ge 200 -and $code -lt 500) {
        Write-OK "Frontend responding: HTTP $code"
    } else {
        Write-Warn "Not responding on :$SitePort — check:"
        Write-Host "    pm2 logs retailerp-frontend" -ForegroundColor White
        Write-Host "    pm2 list" -ForegroundColor White
        Write-Host "    Invoke-WebRequest http://127.0.0.1:$AppPort" -ForegroundColor White
    }
}

Write-Host ""
Write-Host "  =====================================================" -ForegroundColor Green
Write-Host "  RetailERP Frontend installed!" -ForegroundColor Green
Write-Host "  URL      : http://localhost:$SitePort" -ForegroundColor White
Write-Host "  PM2 app  : retailerp-frontend (127.0.0.1:$AppPort)" -ForegroundColor White
Write-Host "  Deploy   : $DeployPath" -ForegroundColor White
Write-Host "  API      : $ApiUrl" -ForegroundColor White
Write-Host "  Login    : admin@elcurio.com / Admin@123" -ForegroundColor White
Write-Host "  =====================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Useful commands:" -ForegroundColor Cyan
Write-Host "    pm2 list"
Write-Host "    pm2 logs retailerp-frontend"
Write-Host "    pm2 restart retailerp-frontend"
Write-Host "    pm2 stop retailerp-frontend"
Write-Host ""
