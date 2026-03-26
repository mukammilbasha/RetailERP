#Requires -RunAsAdministrator
# RetailERP - Generate web.config for all IIS services
# Run: powershell -ExecutionPolicy Bypass -File .\CreateWebConfigs.ps1

$DeployRoot  = "C:\RetailERP"
$ServicesDir = Join-Path $DeployRoot "Services"
$Environment = "prod"

if (-not (Test-Path $ServicesDir)) {
    Write-Host "[XX] Services directory not found: $ServicesDir" -ForegroundColor Red
    Write-Host "     Run Install.ps1 first to deploy service files." -ForegroundColor Yellow
    exit 1
}

$webConfigTemplate = @'
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <location path="." inheritInChildApplications="false">
    <system.webServer>
      <handlers>
        <add name="aspNetCore" path="*" verb="*" modules="AspNetCoreModuleV2" resourceType="Unspecified" />
      </handlers>
      <aspNetCore processPath=".\{EXE_NAME}"
                  arguments=""
                  stdoutLogEnabled="true"
                  stdoutLogFile=".\logs\stdout"
                  hostingModel="inprocess">
        <environmentVariables>
          <environmentVariable name="ASPNETCORE_ENVIRONMENT" value="{ENVIRONMENT}" />
          <environmentVariable name="ASPNETCORE_URLS" value="http://+:{PORT}" />
        </environmentVariables>
      </aspNetCore>
    </system.webServer>
  </location>
</configuration>
'@

# Service name -> port mapping
$portMap = @{
    Gateway    = 5000
    Auth       = 5001
    Product    = 5002
    Inventory  = 5003
    Order      = 5004
    Production = 5005
    Billing    = 5006
    Reporting  = 5007
}

$created = 0
$failed  = 0

Get-ChildItem $ServicesDir -Directory | ForEach-Object {
    $serviceDir  = $_.FullName
    $serviceName = $_.Name

    # Find the .exe (exclude createdump.exe, dotnet.exe etc.)
    $exe = Get-ChildItem $serviceDir -Filter "RetailERP.*.exe" -ErrorAction SilentlyContinue |
           Select-Object -First 1
    if (-not $exe) {
        $exe = Get-ChildItem $serviceDir -Filter "*.exe" -ErrorAction SilentlyContinue |
               Where-Object { $_.Name -notmatch 'createdump|dotnet|singlefilehost' } |
               Select-Object -First 1
    }

    if (-not $exe) {
        Write-Host "[!!] $serviceName - no .exe found, skipping" -ForegroundColor Yellow
        $failed++
        return
    }

    $port = if ($portMap.ContainsKey($serviceName)) { $portMap[$serviceName] } else { 5000 }

    # Create logs dir
    New-Item -ItemType Directory -Path "$serviceDir\logs" -Force | Out-Null

    # Write web.config
    $content = $webConfigTemplate `
        -replace '\{EXE_NAME\}',   $exe.Name `
        -replace '\{ENVIRONMENT\}', $Environment `
        -replace '\{PORT\}',        $port

    $wcPath  = Join-Path $serviceDir "web.config"
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($wcPath, $content, $utf8NoBom)

    Write-Host "[OK] $serviceName -> $($exe.Name)  port=$port" -ForegroundColor Green
    $created++
}

Write-Host ""
Write-Host "Created: $created   Skipped: $failed" -ForegroundColor Cyan

# Apply rollForward to all runtimeconfig.json
Write-Host "`n[..] Patching runtimeconfig.json for .NET 8 roll-forward..." -ForegroundColor Cyan
Get-ChildItem $ServicesDir -Recurse -Filter "*.runtimeconfig.json" | ForEach-Object {
    try {
        $cfg = Get-Content $_.FullName -Raw | ConvertFrom-Json
        if ($cfg.runtimeOptions -and -not $cfg.runtimeOptions.rollForward) {
            $cfg.runtimeOptions | Add-Member -NotePropertyName "rollForward" -NotePropertyValue "LatestMajor" -Force
            $cfg | ConvertTo-Json -Depth 10 | Set-Content $_.FullName -Encoding UTF8
            Write-Host "  Patched: $($_.Directory.Name)" -ForegroundColor Green
        } else {
            Write-Host "  Already patched: $($_.Directory.Name)" -ForegroundColor DarkGray
        }
    } catch {
        Write-Host "  Failed: $($_.FullName) - $_" -ForegroundColor Yellow
    }
}

# Restart IIS
Write-Host "`n[..] Restarting IIS..." -ForegroundColor Cyan
& "$env:SystemRoot\System32\inetsrv\appcmd.exe" stop site /site.name:* 2>$null | Out-Null
iisreset /noforce /timeout:30 2>$null | Out-Null
Start-Sleep -Seconds 3
& "$env:SystemRoot\System32\inetsrv\appcmd.exe" start site /site.name:* 2>$null | Out-Null
Write-Host "[OK] IIS restarted" -ForegroundColor Green

# Quick health check
Write-Host "`n[..] Health checking all services..." -ForegroundColor Cyan
Start-Sleep -Seconds 8
foreach ($svc in $portMap.GetEnumerator() | Sort-Object Value) {
    try {
        $r = Invoke-WebRequest "http://localhost:$($svc.Value)/health" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        Write-Host "  [OK] $($svc.Key):$($svc.Value) -> $($r.StatusCode)" -ForegroundColor Green
    } catch {
        $code = $_.Exception.Response.StatusCode.value__
        if ($code) { Write-Host "  [!!] $($svc.Key):$($svc.Value) -> HTTP $code" -ForegroundColor Yellow }
        else        { Write-Host "  [XX] $($svc.Key):$($svc.Value) -> UNREACHABLE" -ForegroundColor Red }
    }
}
