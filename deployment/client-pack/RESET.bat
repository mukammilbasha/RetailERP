@echo off
title RetailERP - Reset
color 0C

echo.
echo  =====================================================
echo    RetailERP - Full Reset (clears all data)
echo  =====================================================
echo.
echo  WARNING: This will DELETE all database data!
echo  All transactions, masters, and settings will be lost.
echo.
set /p confirm="Type YES to confirm reset: "
if /i not "%confirm%"=="YES" (
    echo  Reset cancelled.
    pause
    exit /b 0
)

echo.
echo  Stopping and removing all containers and data...
docker compose down -v --remove-orphans

echo.
echo  Removing cached images...
docker compose pull

echo.
echo  Starting fresh...
docker compose up -d

echo.
echo  Reset complete! Fresh installation starting...
echo.
timeout /t 30 /nobreak >nul
start "" "http://localhost:3003"
pause
