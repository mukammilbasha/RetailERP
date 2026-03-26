@echo off
title RetailERP - Starting...
color 0A
setlocal enabledelayedexpansion

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
    echo  Not installed? Download:
    echo  https://www.docker.com/products/docker-desktop
    echo.
    pause
    exit /b 1
)
echo  [OK] Docker Desktop is running

:: ── Detect SQL Server Express on this machine ─────────────
echo.
echo  Detecting SQL Server...

set USE_DOCKER_SQL=true
set DB_SERVER=sqlserver
set DB_USER=sa
set DB_PASS=RetailERP@2024!
set COMPOSE_PROFILES=internal-db

:: Check if .env.db exists (created by SETUP-DB.bat)
if exist ".env.db" (
    echo  [OK] Found .env.db - using existing SQL Server Express
    for /f "tokens=1,2 delims==" %%a in (.env.db) do (
        if "%%a"=="SQLSERVER" set DB_SERVER_NAME=%%b
        if "%%a"=="SQLUSER"   set DB_USER=%%b
        if "%%a"=="SQLPASS"   set DB_PASS=%%b
    )
    set DB_SERVER=host.docker.internal
    set USE_DOCKER_SQL=false
    set COMPOSE_PROFILES=
    echo  [OK] SQL Server: !DB_SERVER_NAME! (via host.docker.internal)
    goto :sql_detected
)

:: Auto-detect SQLEXPRESS on this machine
sc query "MSSQL$SQLEXPRESS" >nul 2>&1
if %errorlevel% equ 0 (
    echo  [FOUND] SQL Server Express detected on this machine
    echo.
    echo  Use existing SQL Server Express? (saves memory^)
    set /p USE_EXT=  Enter Y to use SQL Express, N for built-in Docker SQL [Y/N]:
    if /i "!USE_EXT!"=="Y" (
        echo.
        echo  Run SETUP-DB.bat first to configure SQL Server Express.
        echo  Then run START.bat again.
        echo.
        pause
        exit /b 0
    )
)

:sql_detected

:: ── Write .env file for docker-compose ────────────────────
(
    echo DB_SERVER=!DB_SERVER!
    echo DB_NAME=RetailERP
    echo DB_USER=!DB_USER!
    echo DB_PASS=!DB_PASS!
) > .env

:: ── Pull latest images ────────────────────────────────────
echo.
echo  Pulling latest images from Docker Hub...
echo  (5-10 minutes on first run, instant after that)
echo.
if "!USE_DOCKER_SQL!"=="true" (
    docker compose --profile internal-db pull
) else (
    docker compose pull --ignore-pull-failures
)

:: ── Start services ────────────────────────────────────────
echo.
echo  Starting all services...
if "!USE_DOCKER_SQL!"=="true" (
    docker compose --profile internal-db up -d
) else (
    docker compose up -d
)

echo.
echo  Waiting for services to initialize (30 seconds)...
timeout /t 30 /nobreak >nul

:: ── Show status ───────────────────────────────────────────
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
echo    Grafana   ^>  http://localhost:3002  (admin / admin)
echo.
echo    Login:  admin@retailerp.com  /  Admin@123
echo.
echo  =====================================================
echo.

start "" "http://localhost:3003"
pause
