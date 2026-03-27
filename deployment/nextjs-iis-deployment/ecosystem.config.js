// PM2 ecosystem config for RetailERP Frontend
// Usage:
//   pm2 start ecosystem.config.js
//   pm2 save
//   pm2 startup
module.exports = {
  apps: [
    {
      name        : 'retailerp-frontend',
      script      : 'server.js',
      cwd         : __dirname,
      instances   : 1,
      exec_mode   : 'fork',
      watch       : false,
      autorestart : true,
      max_memory_restart: '512M',
      env: {
        NODE_ENV             : 'production',
        PORT                 : 3000,
        HOSTNAME             : '127.0.0.1',
        NEXT_TELEMETRY_DISABLED: '1',
        NEXT_PUBLIC_API_URL  : 'http://localhost:5000'
      },
      error_file  : './logs/pm2-error.log',
      out_file    : './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    }
  ]
}