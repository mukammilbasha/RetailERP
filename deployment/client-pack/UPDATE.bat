@echo off
title RetailERP - Updating...
color 0E

echo.
echo  =====================================================
echo    RetailERP - Update to Latest Version
echo  =====================================================
echo.

docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Docker is not running! Start Docker Desktop first.
    pause
    exit /b 1
)

echo  Pulling latest images from Docker Hub...
docker compose pull

echo.
echo  Restarting services with new images...
docker compose up -d --remove-orphans

echo.
echo  Update complete!
echo.
echo    Frontend  ^>  http://localhost:3003
echo.
pause
