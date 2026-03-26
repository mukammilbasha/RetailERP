@echo off
title RetailERP - Database Setup
color 0B

echo.
echo  =====================================================
echo    RetailERP - SQL Server Express Database Setup
echo  =====================================================
echo.
echo  This will:
echo    1. Enable TCP/IP on your SQL Server Express
echo    2. Create the RetailERP database
echo    3. Create required tables and seed data
echo.
echo  SQL Server Instance: .\SQLEXPRESS
echo.

:: Check sqlcmd is available
where sqlcmd >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] sqlcmd not found!
    echo.
    echo  Install SQL Server command-line tools:
    echo  https://learn.microsoft.com/en-us/sql/tools/sqlcmd/sqlcmd-utility
    echo.
    pause
    exit /b 1
)
echo  [OK] sqlcmd found

:: Ask for SQL Server connection details
echo.
set /p SQLSERVER=  SQL Server instance [default: .\SQLEXPRESS]:
if "%SQLSERVER%"=="" set SQLSERVER=.\SQLEXPRESS

set /p SQLUSER=  SQL Login username [default: ERPAdmin]:
if "%SQLUSER%"=="" set SQLUSER=ERPAdmin

set /p SQLPASS=  SQL Login password:

echo.
echo  Testing connection to %SQLSERVER%...
sqlcmd -S "%SQLSERVER%" -U "%SQLUSER%" -P "%SQLPASS%" -Q "SELECT @@VERSION" -C >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Cannot connect to SQL Server!
    echo.
    echo  Please check:
    echo    - SQL Server Express is running
    echo    - TCP/IP is enabled in SQL Server Configuration Manager
    echo    - SQL Server Browser service is running
    echo    - Login credentials are correct
    echo.
    pause
    exit /b 1
)
echo  [OK] Connected to SQL Server successfully

:: Enable TCP/IP and set static port via registry
echo.
echo  Enabling TCP/IP on port 1433...
powershell -Command ^
  "Import-Module SQLPS -DisableNameChecking 2>$null; ^
   $wmi = New-Object Microsoft.SqlServer.Management.Smo.Wmi.ManagedComputer; ^
   $tcp = $wmi.ServerInstances['SQLEXPRESS'].ServerProtocols['Tcp']; ^
   $tcp.IsEnabled = $true; $tcp.Alter(); ^
   $ip = $tcp.IPAddresses['IPAll']; ^
   $ip.IPAddressProperties['TcpPort'].Value = '1433'; ^
   $ip.IPAddressProperties['TcpDynamicPorts'].Value = ''; ^
   $tcp.Alter()" 2>nul

:: Also try via registry directly
powershell -Command ^
  "Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server\MSSQL12.SQLEXPRESS\MSSQLServer\SuperSocketNetLib\Tcp\IPAll' ^
   -Name 'TcpPort' -Value '1433' -ErrorAction SilentlyContinue; ^
   Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server\MSSQL12.SQLEXPRESS\MSSQLServer\SuperSocketNetLib\Tcp\IPAll' ^
   -Name 'TcpDynamicPorts' -Value '' -ErrorAction SilentlyContinue" 2>nul

:: Enable SQL Server Browser
echo  Starting SQL Server Browser service...
sc config SQLBrowser start= auto >nul 2>&1
net start SQLBrowser >nul 2>&1

:: Restart SQL Express to apply TCP/IP
echo  Restarting SQL Server Express...
net stop "MSSQL$SQLEXPRESS" /y >nul 2>&1
net start "MSSQL$SQLEXPRESS" >nul 2>&1
timeout /t 5 /nobreak >nul

:: Write connection string to config file (read by docker-compose)
echo  Saving connection config...
(
  echo SQLSERVER=%SQLSERVER%
  echo SQLUSER=%SQLUSER%
  echo SQLPASS=%SQLPASS%
) > .env.db
echo  [OK] Config saved to .env.db

:: Create database and tables
echo.
echo  Creating RetailERP database...
sqlcmd -S "%SQLSERVER%" -U "%SQLUSER%" -P "%SQLPASS%" -C -Q ^
  "IF NOT EXISTS (SELECT name FROM sys.databases WHERE name='RetailERP') ^
   CREATE DATABASE RetailERP"

if %errorlevel% neq 0 (
    echo  [ERROR] Failed to create database
    pause
    exit /b 1
)
echo  [OK] Database created (or already exists)

:: Run schema SQL if available
if exist "sql\*.sql" (
    echo  Running schema scripts...
    for %%f in (sql\*.sql) do (
        echo    Running %%f ...
        sqlcmd -S "%SQLSERVER%" -U "%SQLUSER%" -P "%SQLPASS%" -C -d RetailERP -i "%%f" 2>nul
    )
    echo  [OK] Schema scripts complete
)

echo.
echo  =====================================================
echo    Database setup complete!
echo  =====================================================
echo.
echo  Now run START.bat to launch the application.
echo.
pause
