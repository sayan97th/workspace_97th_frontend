#!/usr/bin/env bash
# Builds the Next.js standalone output on this machine and packs it into
# deploy/workspace-97th-<env>-<release_id>.tar.gz, ready to upload to the server.
#
# The server does not have enough memory to run "next build", so every release
# is compiled here and the server only extracts and starts it.
#
# Usage: scripts/deploy/build-package.sh <production|testing>
#   SKIP_INSTALL=1     skip "pnpm install"
#   ALLOW_LOCAL_API=1  allow a localhost NEXT_PUBLIC_API_BASE_URL (testing the flow only)
#
# NEXT_PUBLIC_* values are baked into the build. They are read from .env.<env>
# (and .env.<env>.local if it exists) and exported to the build process, because
# "next build" always reads .env.local and .env.production on its own. Keys defined
# only in those other files are exported empty, so no value from another
# environment (e.g. localhost from .env.local) ends up in the package.
set -euo pipefail

target_env="${1:-}"
case "$target_env" in
  production|testing) ;;
  *)
    echo "Usage: $0 <production|testing>" >&2
    exit 1
    ;;
esac

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$project_root"

package_prefix="workspace-97th"
release_id="$(date +%Y%m%d-%H%M%S)"
deploy_dir="$project_root/deploy"
stage_dir="$deploy_dir/stage"
package_file="$deploy_dir/$package_prefix-$target_env-$release_id.tar.gz"

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

envKeys() {
  # Prints the variable names defined in a .env file
  grep -oE '^[[:space:]]*(export[[:space:]]+)?[A-Za-z_][A-Za-z0-9_]*=' "$1" | sed -E 's/^[[:space:]]*(export[[:space:]]+)?//; s/=$//'
}

command -v pnpm >/dev/null || fail "pnpm is not installed"
command -v node >/dev/null || fail "node is not installed"

# 1. Load build env (process env has priority over every .env file in Next.js)
env_file=".env.$target_env"
[ -s "$env_file" ] || fail "$env_file not found or empty. Create it with the values for '$target_env' (see .env.example)."

loaded_env_files="$env_file"
set -a
# shellcheck disable=SC1090
source "$env_file"
if [ -f "$env_file.local" ]; then
  # shellcheck disable=SC1090
  source "$env_file.local"
  loaded_env_files="$loaded_env_files $env_file.local"
fi
set +a

# Block keys that "next build" would otherwise take from another environment's file
for other_env_file in .env .env.local .env.production .env.production.local; do
  [ -f "$other_env_file" ] || continue
  for key in $(envKeys "$other_env_file"); do
    [ -n "${!key+x}" ] || export "$key="
  done
done

if [ -f .env.example ]; then
  missing_keys=()
  for key in $(envKeys .env.example); do
    [ -n "${!key:-}" ] || missing_keys+=("$key")
  done
  if [ "${#missing_keys[@]}" -gt 0 ]; then
    echo "WARNING: empty or missing in $env_file: ${missing_keys[*]}" >&2
  fi
fi

api_base_url="${NEXT_PUBLIC_API_BASE_URL:-}"
if [[ -z "$api_base_url" || "$api_base_url" == *localhost* || "$api_base_url" == *127.0.0.1* ]]; then
  [ "${ALLOW_LOCAL_API:-0}" = "1" ] || fail "NEXT_PUBLIC_API_BASE_URL is '$api_base_url'. Set the server URL in $env_file (or run with ALLOW_LOCAL_API=1)."
fi

echo "==> Building '$target_env' release $release_id"
echo "    env files: $loaded_env_files"
echo "    NEXT_PUBLIC_API_BASE_URL=$api_base_url"
echo "    NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL:-}"
echo "    NEXT_PUBLIC_REVERB_HOST=${NEXT_PUBLIC_REVERB_HOST:-}"

# 2. Build (SKIP_INSTALL=1 reuses the current node_modules)
if [ "${SKIP_INSTALL:-0}" != "1" ]; then
  pnpm install --frozen-lockfile
fi
# Always a clean build: the Turbopack build cache (.next/cache/turbopack) has
# shipped stale CSS before (globals.css changes missing from the package).
# The dev server cache lives in .next/dev and is kept.
rm -rf .next/cache .next/standalone .next/static .next/server
pnpm build

[ -f .next/standalone/server.js ] || fail ".next/standalone/server.js not found. Is output: \"standalone\" set in next.config.ts?"

# 3. Assemble package contents
rm -rf "$stage_dir"
mkdir -p "$stage_dir/.next"

cp -a .next/standalone/. "$stage_dir/"
cp -a .next/static "$stage_dir/.next/static"
if [ -d public ]; then
  cp -a public "$stage_dir/public"
fi

# Next copies local .env files into standalone, never ship them.
# The server uses shared/.env.<env> instead (linked as .env.production).
find "$stage_dir" -maxdepth 1 -name '.env*' -exec rm -f {} +
rm -rf "$stage_dir/logs"

mkdir -p "$stage_dir/ecosystem"
cp "ecosystem/ecosystem.$target_env.config.js" "$stage_dir/ecosystem/"
cp scripts/deploy/activate-release.sh "$stage_dir/"
chmod +x "$stage_dir/activate-release.sh"

cat > "$stage_dir/RELEASE_INFO" <<EOF
release_id=$release_id
target_env=$target_env
env_file=$env_file
git_branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)
git_commit=$(git rev-parse --short HEAD 2>/dev/null || echo unknown)
git_dirty=$([ -n "$(git status --porcelain 2>/dev/null)" ] && echo yes || echo no)
build_arch=$(uname -m)
build_node=$(node -v)
api_base_url=$api_base_url
EOF

# 4. Compress
tar -czf "$package_file" -C "$stage_dir" .
rm -rf "$stage_dir"

echo
echo "==> Package ready: $package_file ($(du -h "$package_file" | cut -f1))"
echo "    Next step: scripts/deploy/upload-package.sh $target_env"
echo "    ($env_file is uploaded as the server runtime env if missing, UPLOAD_ENV=1 overwrites it)"
