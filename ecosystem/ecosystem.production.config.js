// =============================================================================
// PM2 Ecosystem - Workspace 97th Frontend (PRODUCTION)
// Domain  : workspace97th.97dev.com   (API: api.workspace97th.97dev.com)
// App path: /var/www/workspace97th.97dev.com
//           (symlink to the active release, managed by deploy/release.sh)
//
// Deploy:  bash deploy/release.sh production
// Start:   yarn run pm2:production
//          pm2 start ecosystem/ecosystem.production.config.js
//
// NOTE: A distinct PORT (3800) is used so this app does not collide with other
//       Next.js apps running on the same server (e.g. base-portal on 3777).
// NOTE: Logs live in the shared folder so they survive every new release.
// =============================================================================
const shared_dir = "/var/www/workspace97th-releases/shared";

module.exports = {
  apps: [
    {
      name: "workspace-97th-frontend",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      cwd: "/var/www/workspace97th.97dev.com",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3800,
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: `${shared_dir}/logs/error.log`,
      out_file: `${shared_dir}/logs/output.log`,
      merge_logs: true,
      max_restarts: 10,
      min_uptime: "10s",
      exp_backoff_restart_delay: 200,
      kill_timeout: 5000,
      listen_timeout: 15000,
      max_memory_restart: "512M",
      watch: false,
      ignore_watch: ["node_modules", ".next", "logs"],
    },
  ],
};
