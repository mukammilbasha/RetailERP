@echo off
title RetailERP - Stopping
color 0C
echo.
echo  Stopping RetailERP...
docker compose down
echo.
echo  All services stopped. Data is preserved.
echo  Run START.bat to start again.
echo.
pause
