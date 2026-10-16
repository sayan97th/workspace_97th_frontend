#!/usr/bin/env bash
# =============================================================================
# Release deployment script - Workspace 97th Frontend
# Domain  : workspace97th.97dev.com
#
# Builds every deploy in a new folder while the running app keeps serving the
# previous one. Only a successful build is switched in, so a failed or slow
# build never takes the site down.
#
#   /var/www/workspace97th-releases/
#     releases/<timestamp>/        one folder per deploy
#     shared/.env*                 env files linked into every release
#     shared/logs/                 pm2 logs
#   /var/www/workspace97th.97dev.com -> releases/<active>   (pm2 cwd)
#
# Usage:
#   bash deploy/release.sh setup [testing]     one time, converts the current folder
#   bash deploy/release.sh production          build and switch to a new release
#   bash deploy/release.sh testing
#   bash deploy/release.sh rollback            go back to the previous release
#
# Options (environment variables):
#   BRANCH=dev               git branch to deploy
#   BUILD_MEMORY_MB=3072     Node heap limit for the build
#   KEEP_RELEASES=3          how many releases to keep on disk
#
# Target server: Ubuntu / Debian
# =============================================================================

set -euo pipefail

app_name="workspace-97th-frontend"
repo_url="https://github.com/sayan97th/workspace_97th_frontend.git"
live_path="/var/www/workspace97th.97dev.com"
base_dir="/var/www/workspace97th-releases"
releases_dir="${base_dir}/releases"
shared_dir="${base_dir}/shared"
app_port="3800"

branch="${BRANCH:-dev}"
build_memory_mb="${BUILD_MEMORY_MB:-3072}"
keep_releases="${KEEP_RELEASES:-3}"

log() {
    echo "[${app_name}] $*"
}

fail() {
    echo "[${app_name}] ERROR: $*" >&2
    exit 1
}

ecosystemFile() {
    local environment="$1"
    echo "ecosystem/ecosystem.${environment}.config.js"
}

linkSharedFiles() {
    local release_path="$1"
    local env_file

    for env_file in "${shared_dir}"/.env*; do
        [ -e "${env_file}" ] || continue
        ln -sfn "${env_file}" "${release_path}/$(basename "${env_file}")"
    done

    rm -rf "${release_path}/logs"
    ln -sfn "${shared_dir}/logs" "${release_path}/logs"
}

waitForApp() {
    local attempt

    for attempt in $(seq 1 30); do
        if curl -fsS -o /dev/null "http://127.0.0.1:${app_port}"; then
            return 0
        fi
        sleep 2
    done

    return 1
}

pruneReleases() {
    local active_release
    active_release="$(readlink -f "${live_path}")"

    log "Keeping the ${keep_releases} newest releases ..."
    ls -1dt "${releases_dir}"/*/ | tail -n +"$((keep_releases + 1))" | while read -r old_release; do
        if [ "$(readlink -f "${old_release}")" = "${active_release}" ]; then
            continue
        fi
        log "Removing ${old_release}"
        rm -rf "${old_release}"
    done
}

setupReleases() {
    local environment="$1"
    local first_release="${releases_dir}/initial"

    mkdir -p "${releases_dir}" "${shared_dir}/logs"

    if [ -L "${live_path}" ]; then
        log "${live_path} is already a symlink, nothing to migrate."
        return 0
    fi

    [ -d "${live_path}" ] || fail "${live_path} does not exist."

    log "Copying env files to ${shared_dir} ..."
    cp -n "${live_path}"/.env* "${shared_dir}/" 2>/dev/null || true
    cp -n "${live_path}"/logs/*.log "${shared_dir}/logs/" 2>/dev/null || true

    log "Moving ${live_path} to ${first_release} ..."
    mv "${live_path}" "${first_release}"
    ln -sfn "${first_release}" "${live_path}"
    linkSharedFiles "${first_release}"

    # The new log paths in the ecosystem file are only read on a fresh start.
    log "Restarting pm2 with the new ecosystem file ..."
    cd "${live_path}"
    pm2 delete "${app_name}" >/dev/null 2>&1 || true
    pm2 start "$(ecosystemFile "${environment}")"
    pm2 save

    waitForApp || fail "The app did not answer on port ${app_port}, check: pm2 logs ${app_name}"
    log "Setup done. Active release: $(readlink -f "${live_path}")"
}

deployRelease() {
    local environment="$1"
    local release_path="${releases_dir}/$(date +%Y%m%d%H%M%S)"
    local previous_release

    [ -L "${live_path}" ] || fail "Run 'bash deploy/release.sh setup' first."
    previous_release="$(readlink -f "${live_path}")"

    log "Cloning ${branch} into ${release_path} ..."
    git clone --depth 1 --branch "${branch}" "${repo_url}" "${release_path}"
    linkSharedFiles "${release_path}"
    cd "${release_path}"

    log "Installing dependencies ..."
    nice -n 19 yarn install --frozen-lockfile

    log "Building with a ${build_memory_mb} MB heap (the live app keeps running) ..."
    if ! NODE_OPTIONS="--max-old-space-size=${build_memory_mb}" nice -n 19 ionice -c3 yarn build; then
        rm -rf "${release_path}"
        fail "Build failed. The live app was not touched."
    fi
    [ -f "${release_path}/.next/BUILD_ID" ] || fail "Build finished without .next/BUILD_ID."

    log "Switching ${live_path} to the new release ..."
    ln -sfn "${release_path}" "${live_path}"
    cd "${live_path}"
    pm2 startOrReload "$(ecosystemFile "${environment}")" --update-env

    if ! waitForApp; then
        log "The new release did not answer, rolling back to ${previous_release} ..."
        ln -sfn "${previous_release}" "${live_path}"
        cd "${live_path}"
        pm2 startOrReload "$(ecosystemFile "${environment}")" --update-env
        fail "Deploy rolled back. Check: pm2 logs ${app_name}"
    fi

    pm2 save
    pruneReleases
    log "Deploy done. Active release: ${release_path}"
}

rollbackRelease() {
    local active_release previous_release
    active_release="$(readlink -f "${live_path}")"
    previous_release="$(ls -1dt "${releases_dir}"/*/ | while read -r release; do
        release="$(readlink -f "${release}")"
        if [ "${release}" != "${active_release}" ]; then
            echo "${release}"
        fi
    done | head -n 1)"

    [ -n "${previous_release}" ] || fail "There is no previous release to go back to."

    log "Rolling back to ${previous_release} ..."
    ln -sfn "${previous_release}" "${live_path}"
    cd "${live_path}"
    pm2 reload "${app_name}" --update-env
    waitForApp || fail "The app did not answer on port ${app_port}, check: pm2 logs ${app_name}"
    log "Rollback done."
}

case "${1:-}" in
    setup) setupReleases "${2:-production}" ;;
    production | testing) deployRelease "$1" ;;
    rollback) rollbackRelease ;;
    *) fail "Usage: bash deploy/release.sh setup [testing]|production|testing|rollback" ;;
esac
