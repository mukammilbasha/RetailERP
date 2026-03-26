#Requires -RunAsAdministrator
# RetailERP - Update connection strings & create SQL login on server
# Run: powershell -ExecutionPolicy Bypass -File .\FixConnectionString.ps1

$DeployRoot = "C:\RetailERP"
$SqlServer  = "localhost"
$Database   = "RetailERP"
$SqlUser    = "ERPAdmin"
$SqlPass    = "ERP@admin"
$NewConn    = "Server=$SqlServer;Database=$Database;User Id=$SqlUser;Password=$SqlPass;TrustServerCertificate=true;MultipleActiveResultSets=true"
$utf8NoBom  = New-Object System.Text.UTF8Encoding $false

Write-Host "`n========== 1. UPDATE appsettings.json ON SERVER ==========" -ForegroundColor Cyan
Get-ChildItem "$DeployRoot\Services" -Recurse -Filter "appsettings.json" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    if ($content -match 'DefaultConnection') {
        $updated = $content -replace '"DefaultConnection"\s*:\s*"[^"]*"',
                   "`"DefaultConnection`": `"$NewConn`""
        [System.IO.File]::WriteAllText($_.FullName, $updated, $utf8NoBom)
        Write-Host "  [OK] $($_.Directory.Name)\appsettings.json" -ForegroundColor Green
    }
}

Write-Host "`n========== 2. CREATE SQL LOGIN & DATABASE ==========" -ForegroundColor Cyan
$sqlcmd = Get-Command sqlcmd -ErrorAction SilentlyContinue
if (-not $sqlcmd) {
    $sqlcmd = Get-Item "C:\Program Files\Microsoft SQL Server\*\Tools\Binn\sqlcmd.exe" `
                       -ErrorAction SilentlyContinue | Select-Object -Last 1
}
$sqlExe = if ($sqlcmd) { if ($sqlcmd.Source) { $sqlcmd.Source } elseif ($sqlcmd.Path) { $sqlcmd.Path } else { 'sqlcmd' } } else { $null }

if ($sqlExe) {
    # Create database
    $sql1 = "IF NOT EXISTS (SELECT name FROM sys.databases WHERE name='$Database') CREATE DATABASE [$Database]"
    & $sqlExe -S $SqlServer -E -Q $sql1 2>$null
    Write-Host "  [OK] Database '$Database' ready" -ForegroundColor Green

    # Create SQL login
    $sql2 = @"
IF NOT EXISTS (SELECT name FROM sys.server_principals WHERE name='$SqlUser')
BEGIN
    CREATE LOGIN [$SqlUser] WITH PASSWORD='$SqlPass',
        DEFAULT_DATABASE=[$Database], CHECK_EXPIRATION=OFF, CHECK_POLICY=OFF;
    PRINT 'Login created';
END
ELSE BEGIN
    ALTER LOGIN [$SqlUser] WITH PASSWORD='$SqlPass';
    PRINT 'Login password updated';
END
"@
    & $sqlExe -S $SqlServer -E -Q $sql2 2>$null
    Write-Host "  [OK] SQL login '$SqlUser' ready" -ForegroundColor Green

    # Create DB user & grant db_owner
    $sql3 = @"
USE [$Database];
IF NOT EXISTS (SELECT name FROM sys.database_principals WHERE name='$SqlUser')
    CREATE USER [$SqlUser] FOR LOGIN [$SqlUser];
EXEC sp_addrolemember 'db_owner', '$SqlUser';
"@
    & $sqlExe -S $SqlServer -E -Q $sql3 2>$null
    Write-Host "  [OK] User '$SqlUser' granted db_owner on '$Database'" -ForegroundColor Green

} else {
    Write-Host "  [XX] sqlcmd not found - create SQL login manually:" -ForegroundColor Red
    Write-Host "  CREATE LOGIN [ERPAdmin] WITH PASSWORD='ERP@admin', CHECK_POLICY=OFF" -ForegroundColor Gray
    Write-Host "  USE [RetailERP]; CREATE USER [ERPAdmin] FOR LOGIN [ERPAdmin]" -ForegroundColor Gray
    Write-Host "  EXEC sp_addrolemember 'db_owner','ERPAdmin'" -ForegroundColor Gray
}

Write-Host "`n========== 3. RESTART IIS & HEALTH CHECK ==========" -ForegroundColor Cyan
iisreset /noforce /timeout:30 2>$null | Out-Null
Write-Host "  [OK] IIS restarted" -ForegroundColor Green
Start-Sleep -Seconds 10

$ports = @{Gateway=5000;Auth=5001;Product=5002;Inventory=5003;
           Order=5004;Production=5005;Billing=5006;Reporting=5007}
foreach ($svc in $ports.GetEnumerator() | Sort-Object Value) {
    try {
        $r = Invoke-WebRequest "http://localhost:$($svc.Value)/health" -UseBasicParsing -TimeoutSec 6 -EA Stop
        Write-Host "  [OK] $($svc.Key):$($svc.Value) -> HTTP $($r.StatusCode)" -ForegroundColor Green
    } catch {
        $code = $_.Exception.Response.StatusCode.value__
        if ($code) { Write-Host "  [!!] $($svc.Key):$($svc.Value) -> HTTP $code" -ForegroundColor Yellow }
        else        { Write-Host "  [XX] $($svc.Key):$($svc.Value) -> UNREACHABLE" -ForegroundColor Red }
    }
}

Write-Host "`n========== 4. STDOUT LOGS (if still failing) ==========" -ForegroundColor Cyan
Get-ChildItem "$DeployRoot\Services" -Recurse -Filter "stdout*.log" -ErrorAction SilentlyContinue |
    Where-Object { $_.Length -gt 0 } | Sort-Object LastWriteTime -Descending | Select-Object -First 8 |
    ForEach-Object {
        Write-Host "  --- $($_.Directory.Name) ---" -ForegroundColor Yellow
        Get-Content $_.FullName -Tail 6 | ForEach-Object { Write-Host "    $_" -ForegroundColor Gray }
    }
