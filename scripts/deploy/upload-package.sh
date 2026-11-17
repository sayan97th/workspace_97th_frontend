#!/usr/bin/env bash
# Uploads a package built by build-package.sh (plus the activation script) to the
# deploy/ folder of the releases root on the server
# (default: /var/www/workspace97th-releases/deploy).
#
# Usage: scripts/deploy/upload-package.sh <production|testing> [package.tar.gz]
#   Without a package path (default), the newest deploy/workspace-97th-<env>-*.tar.gz is used.
#   DEPLOY_SSH_HOST overrides the SSH alias from ~/.ssh/config (default: workspace-97th).
#   RELEASES_ROOT overrides the remote releases root (same default as activate-release.sh).
#   .env.<env> is uploaded to $RELEASES_ROOT/shared/.env.<env> (the runtime env that
#   activate-release.sh links into every release) when the server does not have it yet.
#   UPLOAD_ENV=1 always uploads it (overwrites the server copy), UPLOAD_ENV=0 never does.
set -euo pipefail

target_env="${1:-}"
package_file="${2:-}"

case "$target_env" in
  production|testing) ;;
  *)
    echo "Usage: $0 <production|testing> [package.tar.gz]" >&2
    exit 1
    ;;
esac

package_prefix="workspace-97th"
ssh_host="${DEPLOY_SSH_HOST:-workspace-97th}"
releases_root="${RELEASES_ROOT:-/var/www/workspace97th-releases}"
remote_deploy_dir="$releases_root/deploy"
remote_shared_dir="$releases_root/shared"

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

if [ -z "$package_file" ]; then
  # Newest by release_id in the file name
  package_file="$(ls -1 "$project_root"/deploy/"$package_prefix"-"$target_env"-*.tar.gz 2>/dev/null | sort | tail -n 1 || true)"
fi
[ -n "$package_file" ] && [ -f "$package_file" ] || fail "no package found for '$target_env'. Run scripts/deploy/build-package.sh $target_env first."

package_name="$(basename "$package_file")"
[[ "$package_name" == "$package_prefix-$target_env-"*.tar.gz ]] || fail "$package_name is not a '$target_env' package."

echo "==> Uploading $package_name ($(du -h "$package_file" | cut -f1)) to $ssh_host:$remote_deploy_dir/"
ssh "$ssh_host" "mkdir -p '$remote_deploy_dir' '$remote_shared_dir/logs'"
# Upload under a temporary name so activate-release.sh never picks a half uploaded file
scp "$package_file" "$ssh_host:$remote_deploy_dir/$package_name.part"
ssh "$ssh_host" "mv -f '$remote_deploy_dir/$package_name.part' '$remote_deploy_dir/$package_name'"
scp "$project_root/scripts/deploy/activate-release.sh" "$ssh_host:$remote_deploy_dir/activate-release.sh"

env_file="$project_root/.env.$target_env"
remote_env_file="$remote_shared_dir/.env.$target_env"
upload_env="${UPLOAD_ENV:-}"
if [ -z "$upload_env" ]; then
  if ssh "$ssh_host" "test -f '$remote_env_file'"; then
    upload_env=0
    echo "==> $remote_env_file already on the server (UPLOAD_ENV=1 to overwrite it)"
  else
    upload_env=1
  fi
fi

if [ "$upload_env" = "1" ]; then
  [ -s "$env_file" ] || fail "$env_file not found or empty."
  echo "==> Uploading .env.$target_env to $ssh_host:$remote_env_file"
  scp "$env_file" "$ssh_host:$remote_env_file"
  ssh "$ssh_host" "chmod 600 '$remote_env_file'"
fi

echo
echo "==> Uploaded. To activate the newest package, run:"
echo "    ssh $ssh_host 'bash $remote_deploy_dir/activate-release.sh $target_env'"
echo "  or, to activate exactly this package:"
echo "    ssh $ssh_host 'bash $remote_deploy_dir/activate-release.sh $target_env $remote_deploy_dir/$package_name'"
