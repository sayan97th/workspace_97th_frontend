// =============================================================================
// PM2 Ecosystem — Workspace 97th Frontend (TESTING)
// Domain  : workspace97th.97dev.com   (API: api.workspace97th.97dev.com)
// App path: /var/www/workspace97th.97dev.com
//
// Start:   yarn run pm2:testing
//          pm2 start ecosystem/ecosystem.testing.config.js
//
// NOTE: A distinct PORT (3800) is used so this app does not collide with other
//       Next.js apps running on the same server (e.g. base-portal on 3777).
// =============================================================================
module.exports = {
  apps: [
    {
      name: "workspace-97th-frontend",
      script: "node_modules/.bin/next",
      args: "start",
      cwd: "/var/www/workspace97th.97dev.com",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3800,
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "./logs/error.log",
      out_file: "./logs/output.log",
      merge_logs: true,
      max_restarts: 10,
      min_uptime: "10s",
      max_memory_restart: "512M",
      watch: false,
      ignore_watch: ["node_modules", ".next", "logs"],
    },
  ],
};
