@echo off
title RetailERP - Starting...
color 0A

echo.
echo  =====================================================
echo    RetailERP - Starting Application
echo  =====================================================
echo.

:: ── Check Docker ─────────────────────────────────────────
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Docker Desktop is not running!
    echo.
    echo  Please start Docker Desktop from the taskbar
    echo  and wait for the whale icon to stop animating.
    echo.
    pause
    exit /b 1
)
echo  [OK] Docker Desktop is running

:: ── Load images from local tar files if not already loaded ─
echo.
echo  Loading service images...
for %%f in (images\*.tar) do (
    echo    Loading %%~nf ...
    docker load -i "%%f" >nul 2>&1
)
echo  [OK] All images loaded

:: ── Start all services ────────────────────────────────────
echo.
echo  Starting all services...
docker compose up -d --remove-orphans

echo.
echo  Waiting for services to start (30 seconds)...
timeout /t 30 /nobreak >nul

:: ── Status ────────────────────────────────────────────────
echo.
echo  =====================================================
echo    Container Status
echo  =====================================================
docker compose ps --format "table {{.Name}}\t{{.Status}}"

echo.
echo  =====================================================
echo    Application is ready!
echo  =====================================================
echo.
echo    Frontend  ^>  http://localhost:3003
echo    Docs      ^>  http://localhost:3100
echo    API       ^>  http://localhost:5000
echo.
echo    Login:  admin@retailerp.com  /  Admin@123
echo.
echo  =====================================================
echo.
start "" "http://localhost:3003"
pause
