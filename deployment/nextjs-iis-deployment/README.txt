RetailERP - Next.js Frontend (PM2 + IIS ARR)
=============================================
Version : 1.0.0
Built   : 2026-03-27 23:44:24
API URL : http://localhost:5000
Port    : 3000

QUICK INSTALL (Windows Server, run as Administrator)
----------------------------------------------------
  powershell -ExecutionPolicy Bypass -File .\Install-Frontend.ps1

  # Custom port or IP:
  powershell -ExecutionPolicy Bypass -File .\Install-Frontend.ps1 -SitePort 3003 -ApiUrl "http://192.168.1.100:5000"

HOW IT WORKS
------------
  PM2 runs:  node server.js  (Next.js standalone, port 3000)
  IIS ARR proxies:  http://localhost:3003  ->  http://127.0.0.1:3000

PM2 COMMANDS (after install)
----------------------------
  pm2 list                      # show running apps
  pm2 logs retailerp-frontend   # live logs
  pm2 restart retailerp-frontend
  pm2 stop    retailerp-frontend

LOGIN
-----
  Email    : admin@elcurio.com
  Password : Admin@123