# Deploy scripts

Scripts to build, upload and activate releases of `workspace_97th_frontend` (Next.js standalone, run with PM2).

The production server does not have enough memory to run `next build`, so every release is compiled on your machine. The server only extracts the package and starts it.

| Step | Script | Runs on |
| --- | --- | --- |
| 1. Build the package | `build-package.sh` | Your machine |
| 2. Upload the package | `upload-package.sh` | Your machine |
| 3. Activate the release | `activate-release.sh` | The server (via SSH) |
| All three in a row | `deploy.sh` | Your machine |

All commands below are run from the project root (`workspace_97th_frontend/`).

## Environments

| Environment | Env file (local) | SSH host | Releases root | Live path (nginx and PM2) |
| --- | --- | --- | --- | --- |
| `production` | `.env.production` | `workspace-97th` | `/var/www/workspace97th-releases` | `/var/www/workspace97th.97dev.com` |
| `testing` | `.env.testing` | `workspace-97th` | `/var/www/workspace97th-releases` | `/var/www/workspace97th.97dev.com` |

- `workspace-97th` is the SSH alias from `~/.ssh/config`.
- The app listens on `127.0.0.1:3800`, the port nginx proxies to.
- PM2 app name: `workspace-97th-frontend`.

---

# Production

### Deploy in one command

```bash
pnpm deploy:production
# same as: bash scripts/deploy/deploy.sh production
```

### Deploy step by step

```bash
# 1. Build
bash scripts/deploy/build-package.sh production

# 2. Upload
bash scripts/deploy/upload-package.sh production

# 3. Activate the newest package
ssh workspace-97th 'bash /var/www/workspace97th-releases/deploy/activate-release.sh production'
```

### Build options

```bash
# Build without reinstalling dependencies
SKIP_INSTALL=1 bash scripts/deploy/build-package.sh production
```

Do not use `ALLOW_LOCAL_API=1` for production. `NEXT_PUBLIC_API_BASE_URL` in `.env.production` must point to the real API.

### Upload options

```bash
# Upload a specific package
bash scripts/deploy/upload-package.sh production deploy/workspace-97th-production-20261117-101500.tar.gz

# Upload and overwrite the runtime env on the server (shared/.env.production)
UPLOAD_ENV=1 bash scripts/deploy/upload-package.sh production

# Upload without touching the runtime env on the server
UPLOAD_ENV=0 bash scripts/deploy/upload-package.sh production
```

### Release management

```bash
# List releases (the active one is marked with *)
pnpm deploy:list
ssh workspace-97th 'bash /var/www/workspace97th-releases/deploy/activate-release.sh production --list'

# Roll back to the previous release
pnpm deploy:rollback
ssh workspace-97th 'bash /var/www/workspace97th-releases/deploy/activate-release.sh production --rollback'

# Activate a specific package
ssh workspace-97th 'bash /var/www/workspace97th-releases/deploy/activate-release.sh production /var/www/workspace97th-releases/deploy/workspace-97th-production-20261117-101500.tar.gz'

# Keep 10 releases instead of 5
ssh workspace-97th 'KEEP_RELEASES=10 bash /var/www/workspace97th-releases/deploy/activate-release.sh production'

# Logs
ssh workspace-97th 'tail -n 100 /var/www/workspace97th-releases/shared/logs/error.log'
```

---

# Script reference

## 1. `build-package.sh`

Builds the Next.js standalone output on your machine and packs it into `deploy/workspace-97th-<env>-<release_id>.tar.gz`. The `release_id` is the build timestamp (`YYYYMMDD-HHMMSS`).

```bash
bash scripts/deploy/build-package.sh <production|testing>
```

| Variable | Default | Description |
| --- | --- | --- |
| `SKIP_INSTALL=1` | `0` | Skips `pnpm install --frozen-lockfile` and reuses the current `node_modules`. |
| `ALLOW_LOCAL_API=1` | `0` | Allows an empty or `localhost` / `127.0.0.1` `NEXT_PUBLIC_API_BASE_URL`. Only for testing the deploy flow. |

What it does:

1. Loads `.env.<env>` (required, must not be empty) and `.env.<env>.local` if it exists. `NEXT_PUBLIC_*` values are baked into the build.
2. Exports as empty any key that only exists in `.env`, `.env.local`, `.env.production` or `.env.production.local`, so local values (for example `http://localhost:8000` from `.env.local`) never leak into the package.
3. Warns about keys from `.env.example` that are empty or missing.
4. Fails if `NEXT_PUBLIC_API_BASE_URL` is empty or points to localhost (unless `ALLOW_LOCAL_API=1`).
5. Runs `pnpm install --frozen-lockfile` (unless `SKIP_INSTALL=1`) and `pnpm build`.
6. Packs `.next/standalone`, `.next/static`, `public/`, `ecosystem/ecosystem.<env>.config.js`, `activate-release.sh` and a `RELEASE_INFO` file (git commit, branch, Node version, CPU architecture). Local `.env*` files are removed from the package.

Requirements:

- `.env.<env>` exists with the values for that environment (see `.env.example`). It is gitignored.
- `output: "standalone"` is set in `next.config.ts`.
- The build machine has the same CPU architecture as the server (`x86_64`). This is checked by `activate-release.sh`.

## 2. `upload-package.sh`

Uploads a package and `activate-release.sh` to `<RELEASES_ROOT>/deploy/` on the server. The package is uploaded as `.part` and renamed when complete, so a broken upload is never activated. It also uploads `.env.<env>` as the runtime env file (`<RELEASES_ROOT>/shared/.env.<env>`, mode `600`) when the server does not have it yet.

```bash
bash scripts/deploy/upload-package.sh <production|testing> [package.tar.gz]
```

| Variable | Default | Description |
| --- | --- | --- |
| `DEPLOY_SSH_HOST` | `workspace-97th` | SSH alias to connect to. |
| `RELEASES_ROOT` | `/var/www/workspace97th-releases` | Remote releases root. |
| `UPLOAD_ENV` | Empty (auto) | Empty: uploads `.env.<env>` only if it is missing on the server. `1`: always uploads it (overwrites the server copy). `0`: never uploads it. |

## 3. `activate-release.sh`

Runs **on the server**. Extracts a package into `<RELEASES_ROOT>/releases/<release_id>`, points the live path symlink to it and restarts the PM2 app `workspace-97th-frontend` with `server.js`. If the app does not answer within 30 seconds (no response or HTTP 5xx), it switches back to the previous release automatically.

Non interactive SSH sessions do not load nvm, so the script loads `~/.nvm/nvm.sh` itself when `node` is not on the `PATH`.

```bash
ssh workspace-97th 'bash /var/www/workspace97th-releases/deploy/activate-release.sh <production|testing> [--latest | <package.tar.gz> | --rollback | --list]'
```

| Parameter | Description |
| --- | --- |
| `--latest` (default) | Activates the newest `workspace-97th-<env>-*.tar.gz` in `<RELEASES_ROOT>/deploy/`. |
| `<package.tar.gz>` | Activates a specific package (full path on the server). |
| `--rollback` | Goes back to the release before the active one. |
| `--list` | Lists the releases. The active one is marked with `*`. |

| Variable | Default | Description |
| --- | --- | --- |
| `RELEASES_ROOT` | `/var/www/workspace97th-releases` | Releases root on the server. |
| `LIVE_PATH` | `/var/www/workspace97th.97dev.com` | Symlink used by nginx and PM2. |
| `APP_PORT` | `3800` | Port used for the health check. |
| `KEEP_RELEASES` | `5` | Number of packaged releases to keep. Older ones are deleted (never the active one). |

The script stops with an error if:

- `node`, `pm2` or `curl` is not available.
- The live path is a real folder instead of a symlink.
- The runtime env file `<RELEASES_ROOT>/shared/.env.<env>` is missing.
- The package was built for a different environment or CPU architecture.
- Node.js is older than version 20. A different Node major version than the build machine only prints a warning.
- A release with the same `release_id` already exists.

After a successful activation, the uploaded package is deleted from `<RELEASES_ROOT>/deploy/`.

### Server layout

```
/var/www/workspace97th.97dev.com -> /var/www/workspace97th-releases/releases/<release_id>

/var/www/workspace97th-releases/
├── releases/
│   ├── initial/                       # old git clone release, left untouched, delete it by hand
│   └── <release_id>/
│       ├── server.js
│       ├── ecosystem/ecosystem.<env>.config.js
│       ├── .env.production -> ../../shared/.env.<env>
│       └── logs -> ../../shared/logs
├── shared/
│   ├── .env.<env>                     # runtime env
│   └── logs/                          # error.log, output.log
└── deploy/                            # uploaded packages waiting to be activated
```

The `initial` folder is the release created by the old `deploy/release.sh` (git clone plus build on the server). It is ignored by `--list`, `--rollback` and the cleanup. Once a packaged release is live, it can be removed:

```bash
ssh workspace-97th 'rm -rf /var/www/workspace97th-releases/releases/initial'
```

---

## Troubleshooting

| Error | Fix |
| --- | --- |
| `.env.<env> not found or empty` | Create `.env.<env>` in the project root with the values for that environment. |
| `NEXT_PUBLIC_API_BASE_URL is ''` or points to localhost | Set the real API URL in `.env.<env>`. |
| `no package found for '<env>'` | Run `build-package.sh <env>` first. |
| `missing <RELEASES_ROOT>/shared/.env.<env>` | Run `upload-package.sh <env>` (or with `UPLOAD_ENV=1`). |
| `package was built on <arch> but this server is <arch>` | Build on a machine with the same architecture as the server. |
| `release <id> already exists` | That package was already activated. Build a new one. |
| `node is not installed` | Install Node with nvm for the SSH user, or set `NVM_DIR`. |
| App did not start correctly | Check the PM2 logs printed by the script. The previous packaged release is restored automatically. |
