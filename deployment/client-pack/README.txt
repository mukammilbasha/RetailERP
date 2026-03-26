=====================================================
  RetailERP — Offline Client Deployment Package
  Version: v1.0.0
=====================================================

REQUIREMENTS
------------
  1. Docker Desktop installed and running
     Download: https://www.docker.com/products/docker-desktop

  2. SQL Server Express already installed
     Instance: .\SQLEXPRESS
     Login:    ERPAdmin / ERP@admin

  3. SQL Server Express TCP/IP enabled on port 1433
     (see SQL SERVER SETUP section below)

  Minimum specs:
    RAM  : 4 GB (8 GB recommended)
    Disk : 5 GB free (images included in this pack)
    OS   : Windows 10/11 or Windows Server 2012+


QUICK START
-----------
  1. Install Docker Desktop
  2. Enable TCP/IP on SQL Server Express (see below)
  3. Double-click START.bat
  4. Browser opens at http://localhost:3003


LOGIN
-----
  URL      : http://localhost:3003
  Email    : admin@retailerp.com
  Password : Admin@123


SERVICE URLS
------------
  Frontend     http://localhost:3003
  Docs UI      http://localhost:3100
  API Gateway  http://localhost:5000


SQL SERVER EXPRESS - ENABLE TCP/IP (ONE TIME)
----------------------------------------------
  1. Open: Start → SQL Server Configuration Manager

  2. Navigate to:
     SQL Server Network Configuration
     → Protocols for SQLEXPRESS
     → TCP/IP → Right-click → Enable

  3. Set static port:
     TCP/IP → Properties → IP Addresses tab
     → Scroll to IPAll
     → TcpPort      = 1433
     → TcpDynamicPorts = (leave empty)
     → Click OK

  4. Start SQL Server Browser:
     SQL Server Services
     → SQL Server Browser → Right-click → Start
     → Properties → Start Mode = Automatic

  5. Restart SQL Server Express:
     SQL Server Services
     → SQL Server (SQLEXPRESS) → Right-click → Restart

  6. Allow port 1433 in Windows Firewall:
     Run in Command Prompt (as Admin):
     netsh advfirewall firewall add rule name="SQL Express 1433"
       protocol=TCP dir=in localport=1433 action=allow


SCRIPTS
-------
  START.bat  — Load images and start all services
  STOP.bat   — Stop all services (data preserved)
  RESET.bat  — Stop and clear containers (SQL data safe)


TROUBLESHOOTING
---------------
  Q: "Connection refused" or APIs show unhealthy
  A: SQL Server TCP/IP not enabled or port 1433 not set.
     Follow SQL SERVER SETUP steps above.

  Q: Docker not running
  A: Open Docker Desktop from taskbar, wait for whale
     icon to stop animating, then run START.bat again.

  Q: Port already in use
  A: Edit docker-compose.yml — change left port number.
     Example: "3010:3000" uses port 3010 for frontend.

  Q: Out of memory
  A: Docker Desktop → Settings → Resources → Memory → 6 GB

=====================================================
