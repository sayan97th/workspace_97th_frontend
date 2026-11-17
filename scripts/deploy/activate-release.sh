#!/usr/bin/env bash
# Runs ON THE SERVER. Extracts a package into a new release folder, points the
# live path (the folder nginx and PM2 use) at it and restarts PM2. If the app does
# not answer, it switches back to the previous release automatically.
#
# Server layout:
#   /var/www/workspace97th-releases/
#     releases/<release_id>/       one folder per package
#     shared/.env.<env>            runtime env, linked into every release as .env.production
#     shared/logs/                 PM2 logs
#     deploy/                      uploaded packages waiting to be activated
#   /var/www/workspace97th.97dev.com -> releases/<release_id>   (live path, PM2 cwd)
#
# Packages are uploaded by upload-package.sh to $RELEASES_ROOT/deploy/.
#
# Usage:
#   activate-release.sh <env>                    activate the newest package in $RELEASES_ROOT/deploy/ (default)
#   activate-release.sh <env> --latest           same as above
#   activate-release.sh <env> <package.tar.gz>   activate a specific package
#   activate-release.sh <env> --rollback         go back to the previous release
#   activate-release.sh <env> --list             list releases
#
# Overrides: RELEASES_ROOT, LIVE_PATH, APP_PORT (default 3800), KEEP_RELEASES (default 5).
set -euo pipefail

target_env="${1:-}"
action="${2:---latest}"

case "$target_env" in
  production|testing) ;;
  *)
    echo "Usage: $0 <production|testing> [--latest | package.tar.gz | --rollback | --list]" >&2
    exit 1
    ;;
esac

releases_root="${RELEASES_ROOT:-/var/www/workspace97th-releases}"
live_path="${LIVE_PATH:-/var/www/workspace97th.97dev.com}"
app_port="${APP_PORT:-3800}"
keep_releases="${KEEP_RELEASES:-5}"

releases_dir="$releases_root/releases"
shared_dir="$releases_root/shared"
deploy_dir="$releases_root/deploy"
package_prefix="workspace-97th"
pm2_app_name="workspace-97th-frontend"
ecosystem_file="ecosystem/ecosystem.$target_env.config.js"
release_id_pattern='^[0-9]{8}-[0-9]{6}$'

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

loadNode() {
  # Non interactive SSH sessions do not load nvm, so node and pm2 are not on PATH
  command -v node >/dev/null && return 0
  local nvm_dir="${NVM_DIR:-$HOME/.nvm}"
  if [ -s "$nvm_dir/nvm.sh" ]; then
    set +u
    # shellcheck disable=SC1091
    . "$nvm_dir/nvm.sh" >/dev/null
    set -u
  fi
}

switchLive() {
  # Atomic symlink swap
  ln -sfn "$1" "$live_path.tmp"
  mv -Tf "$live_path.tmp" "$live_path"
  echo "==> $live_path -> $1"
}

restartApp() {
  # The release folder carries its own ecosystem file (script: server.js, cwd: live path)
  pm2 delete "$pm2_app_name" >/dev/null 2>&1 || true
  pm2 start "$live_path/$ecosystem_file" --update-env
}

waitForApp() {
  local attempt status_code
  for attempt in $(seq 1 30); do
    status_code="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$app_port/" || true)"
    if [ "$status_code" != "000" ] && [ "${status_code:0:1}" != "5" ]; then
      echo "==> App answered with HTTP $status_code"
      return 0
    fi
    sleep 1
  done
  return 1
}

listReleases() {
  # Only folders created by this script (release_id names), oldest first
  ls -1 "$releases_dir" 2>/dev/null | grep -E "$release_id_pattern" | sort || true
}

activeRelease() {
  [ -L "$live_path" ] && basename "$(readlink -f "$live_path")" || true
}

activateWithFallback() {
  local new_release_dir="$1" previous_release_dir="$2"

  switchLive "$new_release_dir"
  restartApp

  if waitForApp; then
    pm2 save >/dev/null
    return 0
  fi

  echo "ERROR: app did not start correctly. Last log lines:" >&2
  pm2 logs "$pm2_app_name" --lines 30 --nostream >&2 || true

  if [ -n "$previous_release_dir" ] && [ -f "$previous_release_dir/$ecosystem_file" ] && [ -f "$previous_release_dir/server.js" ]; then
    echo "==> Restoring previous release" >&2
    switchLive "$previous_release_dir"
    restartApp
    waitForApp && pm2 save >/dev/null || true
  else
    echo "==> No previous packaged release to restore. $live_path still points to the failed release." >&2
  fi
  exit 1
}

loadNode
command -v node >/dev/null || fail "node is not installed (nvm was not found either)"
command -v pm2 >/dev/null || fail "pm2 is not installed"
command -v curl >/dev/null || fail "curl is not installed"

if [ -e "$live_path" ] && [ ! -L "$live_path" ]; then
  fail "$live_path is a real folder, not a symlink. Move it into $releases_dir first."
fi

mkdir -p "$releases_dir" "$shared_dir/logs" "$deploy_dir"

case "$action" in
  --list)
    active_release="$(activeRelease)"
    [ -n "$active_release" ] && ! listReleases | grep -qx "$active_release" && echo "* $active_release (not a packaged release)"
    for release in $(listReleases); do
      if [ "$release" = "$active_release" ]; then echo "* $release"; else echo "  $release"; fi
    done
    exit 0
    ;;

  --rollback)
    active_release="$(activeRelease)"
    [ -n "$active_release" ] || fail "no active release"
    previous_release="$(listReleases | grep -B1 -x "$active_release" | head -n 1)"
    [ -n "$previous_release" ] && [ "$previous_release" != "$active_release" ] || fail "no release older than $active_release"

    echo "==> Rolling back $active_release -> $previous_release"
    activateWithFallback "$releases_dir/$previous_release" "$releases_dir/$active_release"
    echo "==> Rollback done"
    exit 0
    ;;
esac

# Activate a new package
package_file="$action"
if [ "$package_file" = "--latest" ]; then
  # Newest by release_id in the file name (upload time can differ from build time)
  package_file="$(ls -1 "$deploy_dir"/"$package_prefix"-"$target_env"-*.tar.gz 2>/dev/null | sort | tail -n 1 || true)"
  [ -n "$package_file" ] || fail "no $package_prefix-$target_env-*.tar.gz found in $deploy_dir"
fi
[ -f "$package_file" ] || fail "package not found: $package_file"

runtime_env_file="$shared_dir/.env.$target_env"
[ -f "$runtime_env_file" ] || fail "missing $runtime_env_file (runtime env). Run scripts/deploy/upload-package.sh $target_env from your machine (it uploads .env.$target_env when missing)."

release_info="$(tar -xOzf "$package_file" ./RELEASE_INFO)" || fail "RELEASE_INFO not found in package"
release_id="$(echo "$release_info" | grep '^release_id=' | cut -d= -f2-)"
package_env="$(echo "$release_info" | grep '^target_env=' | cut -d= -f2-)"
build_arch="$(echo "$release_info" | grep '^build_arch=' | cut -d= -f2-)"
build_node="$(echo "$release_info" | grep '^build_node=' | cut -d= -f2-)"

[[ "$release_id" =~ $release_id_pattern ]] || fail "invalid release_id '$release_id' in RELEASE_INFO"
[ "$package_env" = "$target_env" ] || fail "package was built for '$package_env', not '$target_env'"
[ "$build_arch" = "$(uname -m)" ] || fail "package was built on $build_arch but this server is $(uname -m), native modules would break"

node_major="$(node -p 'process.versions.node.split(".")[0]')"
[ "$node_major" -ge 20 ] || fail "Node $node_major found, Next.js 16 needs Node 20.9+"
build_node_major="${build_node#v}"
build_node_major="${build_node_major%%.*}"
if [ "$build_node_major" != "$node_major" ]; then
  echo "WARNING: package was built with Node $build_node, the server runs $(node -v)" >&2
fi

new_release_dir="$releases_dir/$release_id"
[ ! -e "$new_release_dir" ] || fail "release $release_id already exists"

echo "==> Extracting release $release_id"
echo "$release_info" | sed 's/^/    /'
mkdir -p "$new_release_dir"
tar -xzf "$package_file" -C "$new_release_dir"
[ -f "$new_release_dir/server.js" ] && [ -f "$new_release_dir/$ecosystem_file" ] || {
  rm -rf "$new_release_dir"
  fail "package is missing server.js or $ecosystem_file"
}

echo "==> Runtime env: $runtime_env_file"
ln -sfn "$runtime_env_file" "$new_release_dir/.env.production"
ln -sfn "$shared_dir/logs" "$new_release_dir/logs"

previous_release_dir=""
[ -L "$live_path" ] && previous_release_dir="$(readlink -f "$live_path")"

activateWithFallback "$new_release_dir" "$previous_release_dir"

# Keep only the newest releases (never the active one)
active_release="$(activeRelease)"
listReleases | head -n -"$keep_releases" | while read -r old_release; do
  [ "$old_release" = "$active_release" ] && continue
  rm -rf "${releases_dir:?}/$old_release"
  echo "==> Removed old release $old_release"
done

rm -f "$package_file"
echo "==> Release $release_id is live on port $app_port"
