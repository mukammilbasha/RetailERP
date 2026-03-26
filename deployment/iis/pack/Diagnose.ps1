#Requires -RunAsAdministrator
# RetailERP - Service Diagnostics
# Run: powershell -ExecutionPolicy Bypass -File .\Diagnose.ps1

$DeployRoot = "C:\RetailERP"
$ports      = @{Gateway=5000; Auth=5001; Product=5002; Inventory=5003;
                Order=5004; Production=5005; Billing=5006; Reporting=5007}

Write-Host "`n========== 1. .NET RUNTIMES INSTALLED ==========" -ForegroundColor Cyan
& dotnet --list-runtimes 2>$null

Write-Host "`n========== 2. APP POOL STATUS ==========" -ForegroundColor Cyan
$appcmd = "$env:SystemRoot\System32\inetsrv\appcmd.exe"
if (Test-Path $appcmd) {
    $poolList = & $appcmd list apppool 2>$null
    foreach ($name in $ports.Keys | Sort-Object) {
        $line = $poolList | Where-Object { $_ -match "RetailERP-$name" }
        if ($line) {
            $state = if ($line -match 'state:(\w+)') { $Matches[1] } else { 'Unknown' }
            $color = if ($state -eq 'Started') { 'Green' } else { 'Red' }
            Write-Host "  RetailERP-${name}: $state" -ForegroundColor $color
        } else {
            Write-Host "  RetailERP-${name}: NOT FOUND" -ForegroundColor Red
        }
    }
} else {
    Write-Host "  appcmd.exe not found - IIS may not be installed" -ForegroundColor Red
}

Write-Host "`n========== 2b. IIS / W3SVC SERVICE STATE ==========" -ForegroundColor Cyan
@('W3SVC','WAS','IISADMIN') | ForEach-Object {
    $svc = Get-Service $_ -ErrorAction SilentlyContinue
    if ($svc) {
        $color = if ($svc.Status -eq 'Running') { 'Green' } else { 'Red' }
        Write-Host "  $_ : $($svc.Status)" -ForegroundColor $color
    } else {
        Write-Host "  $_ : NOT INSTALLED" -ForegroundColor Red
    }
}

Write-Host "`n========== 2c. FAILED REQUEST / APP POOL ERRORS ==========" -ForegroundColor Cyan
& $appcmd list apppool /processModel.userName:ApplicationPoolIdentity /state:Stopped 2>$null |
    ForEach-Object { Write-Host "  STOPPED: $_" -ForegroundColor Red }

Write-Host "`n========== 3. PORT LISTENERS ==========" -ForegroundColor Cyan
$listeners = netstat -ano | Select-String "LISTENING"
foreach ($name in $ports.Keys | Sort-Object) {
    $port = $ports[$name]
    $hit  = $listeners | Where-Object { $_ -match ":$port\s" }
    if ($hit) { Write-Host "  :$port LISTENING  [$name]" -ForegroundColor Green }
    else       { Write-Host "  :$port NOT listening [$name]" -ForegroundColor Red }
}

Write-Host "`n========== 4. RUNTIMECONFIG ROLL-FORWARD ==========" -ForegroundColor Cyan
Get-ChildItem "$DeployRoot\Services" -Recurse -Filter "*.runtimeconfig.json" | ForEach-Object {
    try {
        $cfg = Get-Content $_.FullName -Raw | ConvertFrom-Json
        $rf  = $cfg.runtimeOptions.rollForward
        $tfm = $cfg.runtimeOptions.tfm
        $color = if ($rf -eq 'LatestMajor') { 'Green' } else { 'Yellow' }
        Write-Host "  $($_.Directory.Name): tfm=$tfm  rollForward=$rf" -ForegroundColor $color
    } catch { Write-Host "  $($_.Name): parse error" -ForegroundColor Red }
}

Write-Host "`n========== 5. WEB.CONFIG CHECK ==========" -ForegroundColor Cyan
foreach ($name in $ports.Keys | Sort-Object) {
    $wc = "$DeployRoot\Services\$name\web.config"
    if (Test-Path $wc) {
        $content = Get-Content $wc -Raw
        if ($content -match 'AspNetCoreModuleV2') {
            Write-Host "  ${name}: web.config OK (AspNetCoreModuleV2)" -ForegroundColor Green
        } else {
            Write-Host "  ${name}: web.config missing AspNetCoreModuleV2 handler" -ForegroundColor Red
        }
    } else {
        Write-Host "  ${name}: web.config MISSING" -ForegroundColor Red
    }
}

Write-Host "`n========== 6. ASPNETCORE MODULE INSTALLED ==========" -ForegroundColor Cyan
$ancm = Get-Item "$env:SystemRoot\System32\inetsrv\aspnetcorev2.dll" -ErrorAction SilentlyContinue
if ($ancm) { Write-Host "  AspNetCoreModuleV2: FOUND at $($ancm.FullName)" -ForegroundColor Green }
else        { Write-Host "  AspNetCoreModuleV2: NOT FOUND - Hosting Bundle may need restart/reinstall" -ForegroundColor Red }

Write-Host "`n========== 7. IIS MODULE REGISTRATION ==========" -ForegroundColor Cyan
$modCheck = & $appcmd list module AspNetCoreModuleV2 2>$null
if ($modCheck) { Write-Host "  AspNetCoreModuleV2 registered: $modCheck" -ForegroundColor Green }
else           { Write-Host "  AspNetCoreModuleV2 NOT registered in IIS - reinstall Hosting Bundle" -ForegroundColor Red }

Write-Host "`n========== 8. WINDOWS EVENT LOG (last 10 errors) ==========" -ForegroundColor Cyan
Get-EventLog -LogName Application -EntryType Error -Newest 10 -ErrorAction SilentlyContinue |
    Where-Object { $_.Source -match 'IIS|ASP|W3SVC|WAS|RetailERP|\.NET' } |
    ForEach-Object { Write-Host "  [$($_.TimeGenerated)] $($_.Source): $($_.Message.Substring(0,[Math]::Min(200,$_.Message.Length)))" -ForegroundColor Red }

Write-Host "`n========== 9. STDOUT LOGS (last 5 lines each) ==========" -ForegroundColor Cyan
Get-ChildItem "$DeployRoot\Services" -Recurse -Filter "stdout*.log" -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending | Select-Object -First 5 | ForEach-Object {
        Write-Host "  --- $($_.FullName) ---" -ForegroundColor Yellow
        Get-Content $_.FullName -Tail 5 | ForEach-Object { Write-Host "    $_" }
    }

Write-Host "`n========== 10. QUICK DIRECT START TEST (Gateway) ==========" -ForegroundColor Cyan
$gw = "$DeployRoot\Services\Gateway\RetailERP.Gateway.exe"
if (Test-Path $gw) {
    Write-Host "  Running Gateway directly for 5 seconds to capture startup errors..." -ForegroundColor Yellow
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName               = $gw
    $psi.Arguments              = "--urls http://+:5000"
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError  = $true
    $psi.UseShellExecute        = $false
    $psi.WorkingDirectory       = "$DeployRoot\Services\Gateway"
    $psi.EnvironmentVariables["ASPNETCORE_ENVIRONMENT"] = "prod"
    $proc = [System.Diagnostics.Process]::Start($psi)
    Start-Sleep -Seconds 5
    $out = $proc.StandardOutput.ReadToEnd()
    $err = $proc.StandardError.ReadToEnd()
    if (-not $proc.HasExited) { $proc.Kill() }
    if ($out) { Write-Host "  STDOUT: $out" -ForegroundColor Gray }
    if ($err) { Write-Host "  STDERR: $err" -ForegroundColor Red }
    if (-not $out -and -not $err) { Write-Host "  (no output captured)" -ForegroundColor Yellow }
} else {
    Write-Host "  Gateway exe not found at $gw" -ForegroundColor Red
}

Write-Host "`n========== DIAGNOSIS COMPLETE ==========" -ForegroundColor Cyan
Write-Host "Share the output above to identify the fix needed." -ForegroundColor White
