@echo off
title RetailERP - Stopping...
color 0C

echo.
echo  =====================================================
echo    RetailERP - Stopping Application
echo  =====================================================
echo.

docker compose down

echo.
echo  All services stopped. Data is preserved.
echo.
echo  To start again, run START.bat
echo.
pause
