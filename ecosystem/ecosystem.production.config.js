// =============================================================================
// PM2 Ecosystem - Workspace 97th Frontend (PRODUCTION)
// Domain  : workspace97th.97dev.com   (API: api.workspace97th.97dev.com)
// Runs the Next.js standalone server (server.js) built on a local machine by
// scripts/deploy/build-package.sh. The server never runs "next build".
//
// Server layout:
//   /var/www/workspace97th-releases/releases/<release_id>/   one folder per package
//   /var/www/workspace97th-releases/shared/.env.production       runtime env (linked as .env.production)
//   /var/www/workspace97th-releases/shared/logs/             PM2 logs, kept across releases
//   /var/www/workspace97th.97dev.com -> releases/<release_id> (live path, nginx upstream :3800)
//
// Deploy (from your machine): bash scripts/deploy/deploy.sh production
// Start by hand (server):     pm2 start /var/www/workspace97th.97dev.com/ecosystem/ecosystem.production.config.js
//
// NOTE: A distinct PORT (3800) is used so this app does not collide with other
//       Next.js apps running on the same server (e.g. base-portal on 3777).
// NOTE: HOSTNAME 127.0.0.1 keeps the port private, nginx is the only entry point.
// =============================================================================
const path = require("path");

const live_path = process.env.LIVE_PATH || "/var/www/workspace97th.97dev.com";
const releases_root = process.env.RELEASES_ROOT || "/var/www/workspace97th-releases";
const app_port = process.env.APP_PORT || 3800;

module.exports = {
  apps: [
    {
      name: "workspace-97th-frontend",
      script: "server.js",
      cwd: live_path,
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: app_port,
        HOSTNAME: "127.0.0.1",
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: path.join(releases_root, "shared/logs/error.log"),
      out_file: path.join(releases_root, "shared/logs/output.log"),
      merge_logs: true,
      max_restarts: 10,
      min_uptime: "10s",
      exp_backoff_restart_delay: 200,
      kill_timeout: 5000,
      listen_timeout: 15000,
      max_memory_restart: "512M",
      watch: false,
    },
  ],
};
