# RetailERP - Stop
param([switch]$Wipe)
if ($Wipe) {
    Write-Host "Removing containers and ALL data..." -ForegroundColor Yellow
    docker compose down -v --remove-orphans
} else {
    docker compose down
    Write-Host "Stopped. Data preserved. Run .\start.ps1 to restart." -ForegroundColor Green
}
