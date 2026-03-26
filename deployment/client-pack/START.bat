@echo off
title RetailERP - Starting...
color 0A

echo.
echo  =====================================================
echo    RetailERP - Starting Application
echo  =====================================================
echo.

:: Check Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Docker is not running!
    echo.
    echo  Please start Docker Desktop and try again.
    echo  Download: https://www.docker.com/products/docker-desktop
    echo.
    pause
    exit /b 1
)
echo  [OK] Docker is running

:: Pull latest images from Docker Hub
echo.
echo  Pulling latest images from Docker Hub...
echo  (This may take 5-10 minutes on first run)
echo.
docker compose pull

:: Start all services
echo.
echo  Starting all services...
docker compose up -d

echo.
echo  Waiting for services to start (30 seconds)...
timeout /t 30 /nobreak >nul

:: Show status
echo.
echo  =====================================================
echo    Service Status
echo  =====================================================
docker compose ps --format "table {{.Name}}\t{{.Status}}"

echo.
echo  =====================================================
echo    Application is ready!
echo  =====================================================
echo.
echo    Frontend   ^>  http://localhost:3003
echo    Docs       ^>  http://localhost:3100
echo    API        ^>  http://localhost:5000
echo    Grafana    ^>  http://localhost:3002
echo.
echo    Login:  admin@retailerp.com  /  Admin@123
echo.
echo  =====================================================
echo.

:: Open browser
start "" "http://localhost:3003"

pause
