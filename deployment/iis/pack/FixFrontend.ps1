#Requires -RunAsAdministrator
# RetailERP - Fix Next.js Frontend IIS Hosting (500.19 fix)
# Run: powershell -ExecutionPolicy Bypass -File .\FixFrontend.ps1

Import-Module WebAdministration -ErrorAction SilentlyContinue

# ── Locate the frontend directory ──────────────────────────────────────────────
$candidates = @(
    "C:\RetailERP\Frontend",
    "C:\inetpub\wwwroot\Frontend\RetailERP-v1.0.0-iis-frontend",
    "C:\inetpub\wwwroot\Frontend"
)
$frontendDir = $null
foreach ($c in $candidates) {
    if (Test-Path $c) { $frontendDir = $c; break }
}

# Also check IIS site physical path
$appcmd = "$env:SystemRoot\System32\inetsrv\appcmd.exe"
if (-not $frontendDir -and (Test-Path $appcmd)) {
    $siteLine = & $appcmd list site "RetailERP-Frontend" 2>$null
    if ($siteLine -match 'physicalPath:([^,\]]+)') {
        $p = $Matches[1].Trim()
        if (Test-Path $p) { $frontendDir = $p }
    }
}

if (-not $frontendDir) {
    Write-Host "[XX] Cannot find frontend directory. Pass it as argument:" -ForegroundColor Red
    Write-Host "     .\FixFrontend.ps1 -FrontendDir 'C:\path\to\frontend'" -ForegroundColor Yellow
    exit 1
}

Write-Host "[OK] Frontend directory: $frontendDir" -ForegroundColor Green

# ── Detect Next.js build type ───────────────────────────────────────────────────
$standaloneServer = Join-Path $frontendDir ".next\standalone\server.js"
$regularServer    = Join-Path $frontendDir "server.js"
$nextDir          = Join-Path $frontendDir ".next"
$nodeModules      = Join-Path $frontendDir "node_modules"

Write-Host "[..] Detecting Next.js build type..." -ForegroundColor Cyan

if (Test-Path $standaloneServer) {
    Write-Host "[OK] Found standalone build at .next\standalone\server.js" -ForegroundColor Green
    $buildType = "standalone"
} elseif (Test-Path $nextDir) {
    Write-Host "[OK] Found regular Next.js build (.next folder)" -ForegroundColor Green
    $buildType = "regular"
} else {
    Write-Host "[XX] No Next.js build found in: $frontendDir" -ForegroundColor Red
    Write-Host "     Ensure the frontend was built (npm run build) and copied." -ForegroundColor Yellow
    exit 1
}

# ── Copy standalone output to site root ────────────────────────────────────────
if ($buildType -eq "standalone") {
    Write-Host "[..] Setting up standalone server files..." -ForegroundColor Cyan

    $standaloneDir = Join-Path $frontendDir ".next\standalone"
    $staticSrc     = Join-Path $frontendDir ".next\static"
    $publicSrc     = Join-Path $frontendDir "public"

    # Copy standalone files up to site root if server.js not already there
    if (-not (Test-Path $regularServer)) {
        Copy-Item -Path "$standaloneDir\*" -Destination $frontendDir -Recurse -Force
        Write-Host "[OK] Copied standalone files to site root" -ForegroundColor Green
    }

    # Copy static and public dirs into the right place for standalone
    $staticDest = Join-Path $frontendDir ".next\static"
    $publicDest = Join-Path $frontendDir "public"
    if ((Test-Path $staticSrc) -and -not (Test-Path $staticDest)) {
        Copy-Item -Path $staticSrc -Destination (Join-Path $frontendDir ".next") -Recurse -Force
    }
    if ((Test-Path $publicSrc) -and -not (Test-Path $publicDest)) {
        Copy-Item -Path $publicSrc -Destination $frontendDir -Recurse -Force
    }
}

# ── Create iisnode web.config (UTF-8 NO BOM) ───────────────────────────────────
Write-Host "[..] Writing web.config for iisnode..." -ForegroundColor Cyan

$webConfig = @'
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>

    <!-- iisnode: route all requests through server.js -->
    <handlers>
      <add name="iisnode" path="server.js" verb="*" modules="iisnode" resourceType="Unspecified" requireAccess="Script" />
    </handlers>

    <rewrite>
      <rules>
        <!-- Serve Next.js static assets directly -->
        <rule name="NextJS Static" stopProcessing="true">
          <match url="^_next/static/(.*)$" />
          <action type="Rewrite" url=".next/static/{R:1}" />
        </rule>
        <!-- Serve public folder assets directly -->
        <rule name="Public Assets" stopProcessing="true">
          <match url="^public/(.*)$" />
          <action type="Rewrite" url="public/{R:1}" />
        </rule>
        <!-- Route everything else through server.js -->
        <rule name="NextJS App" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
          </conditions>
          <action type="Rewrite" url="server.js" />
        </rule>
      </rules>
    </rewrite>

    <iisnode
      nodeProcessCommandLine="node.exe"
      node_env="production"
      loggingEnabled="true"
      logDirectory="iisnode-logs"
      debuggingEnabled="false"
      maxConcurrentRequestsPerProcess="1024"
      maxNamedPipeConnectionRetry="100"
      namedPipeConnectionRetryDelay="250" />

    <security>
      <requestFiltering>
        <hiddenSegments>
          <add segment="node_modules" />
          <add segment=".next" />
          <add segment="iisnode-logs" />
        </hiddenSegments>
      </requestFiltering>
    </security>

    <httpErrors existingResponse="PassThrough" />

  </system.webServer>
</configuration>
'@

$wcPath    = Join-Path $frontendDir "web.config"
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($wcPath, $webConfig, $utf8NoBom)
Write-Host "[OK] web.config written (UTF-8 no BOM)" -ForegroundColor Green

# ── Verify node.exe is accessible ──────────────────────────────────────────────
$node = Get-Command node -ErrorAction SilentlyContinue
if ($node) {
    Write-Host "[OK] Node.js: $(& node --version)" -ForegroundColor Green
} else {
    Write-Host "[XX] node.exe not found in PATH - install Node.js 20 LTS" -ForegroundColor Red
    Write-Host "     https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi" -ForegroundColor Yellow
}

# ── Check iisnode is installed ─────────────────────────────────────────────────
$iisnodeDll = "C:\Program Files\iisnode\iisnode.dll"
if (Test-Path $iisnodeDll) {
    Write-Host "[OK] iisnode.dll found" -ForegroundColor Green
} else {
    Write-Host "[XX] iisnode not installed!" -ForegroundColor Red
    Write-Host "     Download: https://github.com/tjanczuk/iisnode/releases/download/v0.2.26/iisnode-full-v0.2.26-x64.msi" -ForegroundColor Yellow
    Write-Host "     Install then re-run this script." -ForegroundColor Yellow
}

# ── Set environment variable PORT=3003 on app pool ─────────────────────────────
$poolName = "RetailERP-Frontend"
if (Test-Path "IIS:\AppPools\$poolName" -ErrorAction SilentlyContinue) {
    try {
        $cfgPath = "system.applicationHost/applicationPools/add[@name='$poolName']/environmentVariables/add[@name='PORT']"
        $ex = Get-WebConfigurationProperty -pspath "MACHINE/WEBROOT/APPHOST" -filter $cfgPath -name "value" -ErrorAction SilentlyContinue
        if ($null -eq $ex) {
            Add-WebConfiguration -pspath "MACHINE/WEBROOT/APPHOST" `
                -filter "system.applicationHost/applicationPools/add[@name='$poolName']/environmentVariables" `
                -value @{ name="PORT"; value="3003" }
        }
        Add-WebConfiguration -pspath "MACHINE/WEBROOT/APPHOST" `
            -filter "system.applicationHost/applicationPools/add[@name='$poolName']/environmentVariables" `
            -value @{ name="NODE_ENV"; value="production" } -ErrorAction SilentlyContinue
        Write-Host "[OK] App pool env vars set (PORT=3003, NODE_ENV=production)" -ForegroundColor Green
    } catch {
        Write-Host "[!!] Could not set env vars on app pool: $_" -ForegroundColor Yellow
    }
} else {
    Write-Host "[!!] App pool '$poolName' not found - run Install.ps1 first" -ForegroundColor Yellow
}

# ── Create iisnode log directory ───────────────────────────────────────────────
New-Item -ItemType Directory -Path "$frontendDir\iisnode-logs" -Force | Out-Null

# ── Restart frontend app pool ──────────────────────────────────────────────────
Write-Host "[..] Restarting frontend app pool..." -ForegroundColor Cyan
& $appcmd stop apppool /apppool.name:"RetailERP-Frontend" 2>$null | Out-Null
Start-Sleep -Seconds 2
& $appcmd start apppool /apppool.name:"RetailERP-Frontend" 2>$null | Out-Null
Write-Host "[OK] App pool restarted" -ForegroundColor Green

# ── Quick health check ─────────────────────────────────────────────────────────
Write-Host "[..] Testing frontend (http://localhost:3003)..." -ForegroundColor Cyan
Start-Sleep -Seconds 4
try {
    $r = Invoke-WebRequest "http://localhost:3003" -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
    Write-Host "[OK] Frontend responding: HTTP $($r.StatusCode)" -ForegroundColor Green
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    if ($code) {
        Write-Host "[!!] HTTP $code - check iisnode-logs\ for details" -ForegroundColor Yellow
    } else {
        Write-Host "[XX] Unreachable - check app pool is started and iisnode is installed" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "  Troubleshooting:" -ForegroundColor Cyan
    Write-Host "  1. Check logs: $frontendDir\iisnode-logs\" -ForegroundColor White
    Write-Host "  2. Test node directly: node $frontendDir\server.js" -ForegroundColor White
    Write-Host "  3. Verify iisnode: $iisnodeDll" -ForegroundColor White
}
