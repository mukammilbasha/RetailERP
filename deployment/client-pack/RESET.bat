@echo off
title RetailERP - Reset
color 0C
echo.
echo  WARNING: This stops all containers and clears Redis cache.
echo  Your SQL Server data is NOT affected.
echo.
set /p confirm=Type YES to confirm:
if /i not "%confirm%"=="YES" ( echo Cancelled. & pause & exit /b 0 )
echo.
docker compose down -v --remove-orphans
echo.
echo  Reset complete. Run START.bat to restart.
echo.
pause
