// =============================================================================
// PM2 Ecosystem — Workspace 97th Frontend (LOCAL / Arch Linux)
// App path: /mnt/linux-storage/projects/97thfloor/monday_projects/workspace_97th_frontend
//
// Start:   yarn run pm2:local
//          pm2 start ecosystem/ecosystem.local.config.js
//
// Requires a production build first: `yarn build`.
// A distinct PORT (3800) keeps this instance separate from `yarn dev` (3000).
// =============================================================================
module.exports = {
  apps: [
    {
      name: "workspace-97th-frontend",
      script: "node_modules/.bin/next",
      args: "start",
      cwd: "/mnt/linux-storage/projects/97thfloor/monday_projects/workspace_97th_frontend",
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
