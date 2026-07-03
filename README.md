# Workspace 97th Frontend — PM2 Deployment Guide

This project uses [PM2](https://pm2.keymetrics.io/) as the process manager for running the Next.js application across multiple environments.

It is the frontend companion of the **Workspace 97th API** (Laravel + JWT). Each frontend environment maps to an API environment:

| Environment | Frontend domain | API domain |
|---|---|---|
| Testing | `workspace97th.97dev.com` | `api.workspace97th.97dev.com` |
| Production | `workspace97th.97dev.com` | `api.workspace97th.97dev.com` |

---

## Ecosystem Config Files

Each environment has its own dedicated ecosystem configuration file located in the `ecosystem/` directory at the project root.

| File | Environment | Server Path |
|---|---|---|
| `ecosystem/ecosystem.testing.config.js` | Testing | `/var/www/workspace97th.97dev.com` |
| `ecosystem/ecosystem.production.config.js` | Production | `/var/www/workspace97th.97dev.com` |
| `ecosystem/ecosystem.local.config.js` | Local (Arch Linux) | `/mnt/linux-storage/projects/97thfloor/monday_projects/workspace_97th_frontend` |

> The root `ecosystem.config.js` file is the default entry point and re-exports the **production** config.

> **Port:** This app listens on **`3800`** — deliberately different from other Next.js apps on the same server (e.g. `base-portal` on `3777`) to avoid port collisions.

---

## Prerequisites

PM2 must be installed globally on the server:

```bash
npm install -g pm2
```

Build the application before starting it with PM2 (PM2 runs `next start`, which requires a production build):

```bash
yarn install
yarn build
```

---

## Environment Variables

The frontend reads its API base URL from `.env.local`:

```bash
# .env.local
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

Point this at the matching API domain per environment, e.g.
`https://api.workspace97th.97dev.com` (testing) or `https://api.workspace97th.97dev.com` (production).

---

## Starting the Application

Use the appropriate script depending on the target environment.

```bash
# Testing
yarn run pm2:testing

# Production
yarn run pm2:production

# Local (Arch Linux)
yarn run pm2:local
```

Or use PM2 directly:

```bash
pm2 start ecosystem/ecosystem.testing.config.js
pm2 start ecosystem/ecosystem.production.config.js
pm2 start ecosystem/ecosystem.local.config.js
```

---

## Restarting the Application

```bash
# Testing
yarn run pm2:restart:testing

# Production
yarn run pm2:restart:production

# Local
yarn run pm2:restart:local
```

---

## Stopping & Deleting the Process

```bash
# Stop the process (keeps it in PM2 list)
yarn run pm2:stop

# Remove the process from PM2 entirely
yarn run pm2:delete
```

---

## Monitoring

```bash
# View live logs
yarn run pm2:logs

# View all PM2 process statuses
yarn run pm2:status
```

---

## Saving PM2 Process List (Auto-restart on reboot)

After starting the app, run the following on the server to persist the process list across reboots:

```bash
pm2 startup
pm2 save
```

Follow the instructions printed by `pm2 startup` to register the systemd/init script.

---

## Logs

Log files are written to the `logs/` directory relative to the application `cwd` on each server:

| File | Description |
|---|---|
| `logs/output.log` | Standard output |
| `logs/error.log` | Error output |

Log entries include a timestamp in `YYYY-MM-DD HH:mm:ss` format. `*.log` files are git-ignored.

---

## Nginx Reverse Proxy

Because PM2 serves the app on port `3800`, an Nginx virtual host proxies the public domain to it. Configs and deploy scripts live in `vhost/`:

| File | Environment |
|---|---|
| `vhost/conf/nginx/testing.conf` | Testing (`workspace97th.97dev.com`) |
| `vhost/conf/nginx/production.conf` | Production (`workspace97th.97dev.com`) |

Deploy with:

```bash
bash vhost/testing.sh
bash vhost/production.sh
```

---

## Configuration Summary

All environments share the following PM2 settings:

| Setting | Value |
|---|---|
| `name` | `workspace-97th-frontend` |
| `instances` | `1` |
| `exec_mode` | `fork` |
| `PORT` | `3800` |
| `NODE_ENV` | `production` |
| `max_restarts` | `10` |
| `min_uptime` | `10s` |
| `max_memory_restart` | `512M` |
| `watch` | `false` |

---

## Local Development

For day-to-day development (hot reload), use the Next.js dev server instead of PM2:

```bash
yarn dev        # http://localhost:3000
yarn lint       # ESLint
yarn build      # Production build
```
