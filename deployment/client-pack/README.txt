=====================================================
  RetailERP — Client Deployment Package
  Version: v1.0.0
  Docker Hub: hub.docker.com/r/mukammilbasha/retailerp
=====================================================

REQUIREMENT
-----------
  Docker Desktop must be installed and running.
  Download: https://www.docker.com/products/docker-desktop

  Minimum specs:
    RAM   : 4 GB (8 GB recommended)
    Disk  : 10 GB free
    OS    : Windows 10/11, Windows Server 2012+


=====================================================
  OPTION A — Use Your Existing SQL Server Express
  (Recommended if SQL Server Express is installed)
=====================================================

  Step 1: Run SETUP-DB.bat
          - Enables TCP/IP on SQL Server Express
          - Creates RetailERP database
          - Saves connection config to .env.db

  Step 2: Run START.bat
          - Detects .env.db automatically
          - Uses your SQL Server Express (host.docker.internal)
          - Starts all API and frontend containers only

  SQL Server settings required:
    - TCP/IP enabled (SETUP-DB.bat does this)
    - SQL Server Browser running (SETUP-DB.bat does this)
    - Port 1433 open on firewall
    - SQL login with db_owner on RetailERP database


=====================================================
  OPTION B — Built-in Docker SQL Server
  (Use if you don't have SQL Server Express)
=====================================================

  Step 1: Run START.bat
          - No .env.db file = auto uses Docker SQL Server
          - Downloads and starts SQL Server in a container
          - Takes more RAM (~1.5 GB extra)


=====================================================
  FIRST TIME SETUP (Either Option)
=====================================================

  1. Install Docker Desktop
  2. [OPTION A ONLY] Run SETUP-DB.bat
  3. Run START.bat
  4. Wait 5-10 minutes (first run downloads images)
  5. Browser opens automatically → http://localhost:3003


LOGIN
-----
  URL      : http://localhost:3003
  Email    : admin@retailerp.com
  Password : Admin@123


SERVICE URLS
------------
  Frontend     http://localhost:3003
  Docs         http://localhost:3100
  API Gateway  http://localhost:5000
  Grafana      http://localhost:3002  (admin / admin)


SQL SERVER EXPRESS MANUAL SETUP
--------------------------------
  If SETUP-DB.bat fails, do these steps manually:

  1. Open SQL Server Configuration Manager
     Start → search "SQL Server Configuration Manager"

  2. Enable TCP/IP:
     SQL Server Network Configuration
     → Protocols for SQLEXPRESS
     → TCP/IP → Right-click → Enable

  3. Set static port 1433:
     TCP/IP → Properties → IP Addresses tab
     → IPAll → TcpPort = 1433
     → TcpDynamicPorts = (clear/empty)

  4. Enable SQL Server Browser:
     SQL Server Services
     → SQL Server Browser → Right-click → Start
     → Properties → Start Mode = Automatic

  5. Restart SQL Server Express:
     SQL Server Services
     → SQL Server (SQLEXPRESS) → Restart

  6. Create .env.db manually:
     Open Notepad, paste and save as .env.db:
       SQLSERVER=.\SQLEXPRESS
       SQLUSER=ERPAdmin
       SQLPASS=ERP@admin

  7. Run START.bat


SCRIPTS
-------
  SETUP-DB.bat — Configure SQL Server Express + create DB
  START.bat    — Start all services (auto-detects SQL mode)
  STOP.bat     — Stop all services (data is kept)
  UPDATE.bat   — Download latest version from Docker Hub
  RESET.bat    — Full reset (WARNING: deletes all data)


TROUBLESHOOTING
---------------
  Q: "Cannot connect to SQL Server"
  A: Check TCP/IP is enabled and port 1433 is set.
     Restart SQL Server Express after changes.

  Q: Services show "unhealthy" after start
  A: Wait 2 more minutes — APIs wait for DB to be ready.

  Q: Port already in use
  A: Change the left port number in docker-compose.yml
     Example: "3010:3000" uses port 3010 for frontend

  Q: Docker not running
  A: Open Docker Desktop from taskbar, wait for whale
     icon to stop animating.

  Q: Out of memory
  A: Docker Desktop → Settings → Resources → Memory → 6 GB

=====================================================
