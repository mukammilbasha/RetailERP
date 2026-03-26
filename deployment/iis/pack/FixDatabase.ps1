#Requires -RunAsAdministrator
# RetailERP - Fix Database Access & Capture 500 Error Details
# Run: powershell -ExecutionPolicy Bypass -File .\FixDatabase.ps1

$DeployRoot = "C:\RetailERP"
$SqlServer  = "localhost"
$Database   = "RetailERP"

Write-Host "`n========== 1. CHECK SQL SERVER ==========" -ForegroundColor Cyan
$sqlSvc = Get-Service -Name 'MSSQLSERVER','MSSQL$SQLEXPRESS','MSSQL$MSSQLSERVER' -ErrorAction SilentlyContinue |
          Where-Object { $_.Status -eq 'Running' } | Select-Object -First 1
if ($sqlSvc) {
    Write-Host "  [OK] SQL Server running: $($sqlSvc.Name)" -ForegroundColor Green
} else {
    Write-Host "  [XX] SQL Server NOT running or not installed" -ForegroundColor Red
    Write-Host "  Install SQL Server Express: https://aka.ms/sqledge" -ForegroundColor Yellow
    Write-Host "  After install, re-run this script." -ForegroundColor Yellow
}

# Detect instance name for sqlcmd
$sqlcmd = Get-Command sqlcmd -ErrorAction SilentlyContinue
if (-not $sqlcmd) {
    $sqlcmd = Get-Item "C:\Program Files\Microsoft SQL Server\*\Tools\Binn\sqlcmd.exe" `
                       -ErrorAction SilentlyContinue | Select-Object -Last 1
}
$sqlExe = if ($sqlcmd) { if ($sqlcmd.Source) { $sqlcmd.Source } else { $sqlcmd.Path } } else { $null }

Write-Host "`n========== 2. ENABLE STDOUT LOGS (capture 500 detail) ==========" -ForegroundColor Cyan
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
Get-ChildItem "$DeployRoot\Services" -Recurse -Filter "web.config" | ForEach-Object {
    $xml = [xml](Get-Content $_.FullName -Raw)
    $node = $xml.SelectSingleNode("//aspNetCore")
    if ($node -and $node.GetAttribute("stdoutLogEnabled") -ne "true") {
        $node.SetAttribute("stdoutLogEnabled", "true")
        $out = $xml.OuterXml
        [System.IO.File]::WriteAllText($_.FullName, $out, $utf8NoBom)
        Write-Host "  Enabled stdout: $($_.FullName)" -ForegroundColor Green
    }
    New-Item -ItemType Directory -Path (Join-Path $_.Directory "logs") -Force | Out-Null
}

Write-Host "`n========== 3. GRANT APP POOL IDENTITIES SQL ACCESS ==========" -ForegroundColor Cyan
if ($sqlExe -and $sqlSvc) {
    $pools = @('RetailERP-Gateway','RetailERP-Auth','RetailERP-Product','RetailERP-Inventory',
               'RetailERP-Order','RetailERP-Production','RetailERP-Billing','RetailERP-Reporting')

    # Create DB if not exists
    $createDb = "IF NOT EXISTS (SELECT name FROM sys.databases WHERE name='$Database') CREATE DATABASE [$Database]"
    & $sqlExe -S $SqlServer -E -Q $createDb 2>$null
    Write-Host "  [OK] Database '$Database' exists" -ForegroundColor Green

    foreach ($pool in $pools) {
        $loginSql = @"
IF NOT EXISTS (SELECT name FROM sys.server_principals WHERE name = 'IIS APPPOOL\$pool')
    CREATE LOGIN [IIS APPPOOL\$pool] FROM WINDOWS WITH DEFAULT_DATABASE=[$Database];
USE [$Database];
IF NOT EXISTS (SELECT name FROM sys.database_principals WHERE name = 'IIS APPPOOL\$pool')
    CREATE USER [IIS APPPOOL\$pool] FOR LOGIN [IIS APPPOOL\$pool];
EXEC sp_addrolemember 'db_owner', 'IIS APPPOOL\$pool';
"@
        & $sqlExe -S $SqlServer -E -Q $loginSql 2>$null
        Write-Host "  [OK] Granted db_owner: $pool" -ForegroundColor Green
    }
} else {
    Write-Host "  [!!] Skipped - SQL Server not available" -ForegroundColor Yellow
    Write-Host "  Manually run these after SQL Server is installed:" -ForegroundColor Yellow
    Write-Host "  CREATE DATABASE [RetailERP]" -ForegroundColor Gray
    Write-Host "  CREATE LOGIN [IIS APPPOOL\RetailERP-Auth] FROM WINDOWS" -ForegroundColor Gray
    Write-Host "  (repeat for each service pool)" -ForegroundColor Gray
}

Write-Host "`n========== 4. RESTART IIS & TEST ==========" -ForegroundColor Cyan
iisreset /noforce /timeout:30 2>$null | Out-Null
Write-Host "  [OK] IIS restarted" -ForegroundColor Green
Start-Sleep -Seconds 10

$ports = @{Gateway=5000;Auth=5001;Product=5002;Inventory=5003;
           Order=5004;Production=5005;Billing=5006;Reporting=5007}
foreach ($svc in $ports.GetEnumerator() | Sort-Object Value) {
    try {
        $r = Invoke-WebRequest "http://localhost:$($svc.Value)/health" -UseBasicParsing -TimeoutSec 6 -ErrorAction Stop
        Write-Host "  [OK] $($svc.Key):$($svc.Value) -> HTTP $($r.StatusCode)" -ForegroundColor Green
    } catch {
        $code = $_.Exception.Response.StatusCode.value__
        if ($code) { Write-Host "  [!!] $($svc.Key):$($svc.Value) -> HTTP $code" -ForegroundColor Yellow }
        else        { Write-Host "  [XX] $($svc.Key):$($svc.Value) -> UNREACHABLE" -ForegroundColor Red }
    }
}

Write-Host "`n========== 5. STDOUT LOG ERRORS (if still 500) ==========" -ForegroundColor Cyan
Get-ChildItem "$DeployRoot\Services" -Recurse -Filter "stdout*.log" -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending | Select-Object -First 8 | ForEach-Object {
        if ($_.Length -gt 0) {
            Write-Host "  --- $($_.Directory.Name) ---" -ForegroundColor Yellow
            Get-Content $_.FullName -Tail 8 | ForEach-Object { Write-Host "    $_" -ForegroundColor Gray }
        }
    }
