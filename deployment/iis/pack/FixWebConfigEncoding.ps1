#Requires -RunAsAdministrator
# Fix UTF-8 BOM in all web.config files under C:\RetailERP\Services
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
$fixed = 0

Get-ChildItem "C:\RetailERP\Services" -Recurse -Filter "web.config" | ForEach-Object {
    $raw   = [System.IO.File]::ReadAllBytes($_.FullName)
    # Detect BOM: EF BB BF
    $hasBom = ($raw.Length -ge 3 -and $raw[0] -eq 0xEF -and $raw[1] -eq 0xBB -and $raw[2] -eq 0xBF)
    $text  = [System.IO.File]::ReadAllText($_.FullName)
    [System.IO.File]::WriteAllText($_.FullName, $text, $utf8NoBom)
    $status = if ($hasBom) { "BOM removed" } else { "re-written (no BOM)" }
    Write-Host "  [OK] $($_.FullName) - $status" -ForegroundColor Green
    $fixed++
}

Write-Host "`nFixed $fixed web.config file(s)" -ForegroundColor Cyan

# Restart IIS
Write-Host "Restarting IIS..." -ForegroundColor Cyan
iisreset /noforce /timeout:30 2>$null | Out-Null
Write-Host "[OK] IIS restarted" -ForegroundColor Green

# Quick health check
Write-Host "`nHealth checking services..." -ForegroundColor Cyan
Start-Sleep -Seconds 8
$ports = @{Gateway=5000;Auth=5001;Product=5002;Inventory=5003;Order=5004;Production=5005;Billing=5006;Reporting=5007}
foreach ($svc in $ports.GetEnumerator() | Sort-Object Value) {
    try {
        $r = Invoke-WebRequest "http://localhost:$($svc.Value)/health" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        Write-Host "  [OK] $($svc.Key) :$($svc.Value) -> HTTP $($r.StatusCode)" -ForegroundColor Green
    } catch {
        $code = $_.Exception.Response.StatusCode.value__
        if ($code) { Write-Host "  [!!] $($svc.Key) :$($svc.Value) -> HTTP $code" -ForegroundColor Yellow }
        else        { Write-Host "  [XX] $($svc.Key) :$($svc.Value) -> UNREACHABLE" -ForegroundColor Red }
    }
}
