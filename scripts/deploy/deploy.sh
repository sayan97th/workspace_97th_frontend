#!/usr/bin/env bash
# Runs the whole flow from this machine: build, upload and activate.
#
# Usage: scripts/deploy/deploy.sh <production|testing>
#   Accepts the options of build-package.sh (SKIP_INSTALL, ALLOW_LOCAL_API),
#   upload-package.sh (DEPLOY_SSH_HOST, RELEASES_ROOT, UPLOAD_ENV) and
#   KEEP_RELEASES for activate-release.sh.
set -euo pipefail

target_env="${1:-}"
case "$target_env" in
  production|testing) ;;
  *)
    echo "Usage: $0 <production|testing>" >&2
    exit 1
    ;;
esac

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ssh_host="${DEPLOY_SSH_HOST:-workspace-97th}"
releases_root="${RELEASES_ROOT:-/var/www/workspace97th-releases}"
keep_releases="${KEEP_RELEASES:-5}"

bash "$script_dir/build-package.sh" "$target_env"
bash "$script_dir/upload-package.sh" "$target_env"

echo
echo "==> Activating on $ssh_host"
ssh "$ssh_host" "KEEP_RELEASES='$keep_releases' RELEASES_ROOT='$releases_root' bash '$releases_root/deploy/activate-release.sh' '$target_env'"
