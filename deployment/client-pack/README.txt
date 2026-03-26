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
    OS    : Windows 10/11, Ubuntu, macOS


FIRST TIME SETUP
----------------
  Windows:
    1. Install Docker Desktop
    2. Double-click  START.bat
    3. Wait 5-10 min for images to download
    4. Browser opens automatically at http://localhost:3003

  Linux / Mac:
    1. Install Docker Engine
    2. chmod +x start.sh stop.sh
    3. ./start.sh
    4. Open http://localhost:3003


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


SCRIPTS
-------
  START.bat    — Pull latest images & start all services
  STOP.bat     — Stop all services (data is kept)
  UPDATE.bat   — Download latest version from Docker Hub
  RESET.bat    — Full reset (WARNING: deletes all data)

  start.sh     — Linux/Mac start
  stop.sh      — Linux/Mac stop


AFTER UPDATES
-------------
  When a new version is released, just run UPDATE.bat
  It will download the new images and restart automatically.
  Your data is always preserved during updates.


TROUBLESHOOTING
---------------
  Q: Services show "unhealthy" or "starting"
  A: Wait 2 more minutes. SQL Server takes time on first launch.

  Q: Port already in use error
  A: Another app is using the same port. Stop it or change
     the port in docker-compose.yml (left side of the colon).
     Example: "3010:3000" uses port 3010 instead of 3003.

  Q: Docker not running
  A: Open Docker Desktop from the Start menu and wait for
     the whale icon in the taskbar to stop animating.

  Q: Out of memory
  A: In Docker Desktop: Settings > Resources > Memory > 6 GB

=====================================================
