# RetailERP - Start (PowerShell)
# Run: powershell -ExecutionPolicy Bypass -File .\start.ps1

param([switch]$Clean)

Write-Host ""
Write-Host "  RetailERP - Docker Desktop" -ForegroundColor Cyan
Write-Host ""

# Check Docker
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "  [XX] Docker not found. Install Docker Desktop:" -ForegroundColor Red
    Write-Host "       https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    exit 1
}
docker info > $null 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [XX] Docker Desktop is not running. Please start it first." -ForegroundColor Red
    exit 1
}
Write-Host "  [OK] Docker Desktop is running" -ForegroundColor Green

# Clean start
if ($Clean) {
    Write-Host "  [!!] Removing all containers and data volumes..." -ForegroundColor Yellow
    docker compose down -v --remove-orphans 2>$null
}

# Pull latest images
Write-Host "  Pulling latest images (first run may take a few minutes)..." -ForegroundColor Gray
docker compose pull

# Start
Write-Host "  Starting all services..." -ForegroundColor Cyan
docker compose up -d

# Wait and show status
Start-Sleep -Seconds 5
Write-Host ""
docker compose ps
Write-Host ""
Write-Host "  =================================================" -ForegroundColor Green
Write-Host "  RetailERP is starting up!" -ForegroundColor Green
Write-Host ""
Write-Host "  Frontend   : http://localhost:3003" -ForegroundColor White
Write-Host "  Gateway    : http://localhost:5000/swagger" -ForegroundColor White
Write-Host ""
Write-Host "  Login: admin@elcurio.com / Admin@123" -ForegroundColor White
Write-Host "  =================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Wait ~60 seconds for all services to be ready." -ForegroundColor Gray
Write-Host "  Check logs: docker compose logs -f" -ForegroundColor Gray
Write-Host ""
