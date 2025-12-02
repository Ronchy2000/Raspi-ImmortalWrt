#!/bin/sh
# Smart OpenWrt Backup Script
# Author: Ronchy2000 (Assisted by Copilot)
# Description: 
#   - Performs system backup only when configuration changes are detected.
#   - Extracts configuration files to provide granular git diffs.
#   - Generates intelligent commit messages listing modified modules.
#   - Manages local and remote retention.

set -e

# --- Configuration ---
BACKUP_DIR="/root/immortalwrt-backup"
GIT_REMOTE="git@github.com:ronchy2000/immortalwrt-backup.git"
BRANCH="master"
TMP_DIR="/tmp/smart_backup_tmp"
LOG_FILE="/root/smart_backup.log"
MAX_LOCAL_BACKUPS=3
# ---------------------

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Cleanup on exit
cleanup() {
    rm -rf "$TMP_DIR"
}
trap cleanup EXIT

log "========== Starting Smart Backup =========="

# 1. Prepare Environment
mkdir -p "$BACKUP_DIR"
mkdir -p "$TMP_DIR"

# 2. Generate System Backup (Sysupgrade format)
# We generate to tmpfs first to avoid unnecessary SD card writes if no changes found
ARCHIVE_NAME="backup_$(date +%Y%m%d_%H%M%S).tar.gz"
ARCHIVE_PATH="$TMP_DIR/$ARCHIVE_NAME"

log "Generating system backup archive..."
sysupgrade -b "$ARCHIVE_PATH" >/dev/null 2>&1

# 3. Initialize/Update Git Repository
if [ ! -d "$BACKUP_DIR/.git" ]; then
    log "Initializing new Git repository..."
    cd "$BACKUP_DIR"
    git init
    git remote add origin "$GIT_REMOTE"
    git checkout -b "$BRANCH" 2>/dev/null || git checkout -b master 2>/dev/null
else
    cd "$BACKUP_DIR"
    # Attempt to pull latest changes to avoid conflicts
    git pull origin "$BRANCH" >/dev/null 2>&1 || true
fi

# 4. Extract Configurations for Change Detection
# We extract /etc/config to a 'configs' folder in the repo to track text changes
mkdir -p "$TMP_DIR/extracted"
tar -xzf "$ARCHIVE_PATH" -C "$TMP_DIR/extracted"

# Locate the config directory inside the archive (usually etc/config)
CONFIG_SRC=""
if [ -d "$TMP_DIR/extracted/etc/config" ]; then
    CONFIG_SRC="$TMP_DIR/extracted/etc/config"
elif [ -d "$TMP_DIR/extracted/config" ]; then
    CONFIG_SRC="$TMP_DIR/extracted/config"
fi

if [ -z "$CONFIG_SRC" ]; then
    log "Error: Could not locate config directory in backup archive."
    exit 1
fi

# Sync extracted configs to repo/configs
# We remove the old configs dir to ensure deleted files are tracked
rm -rf "$BACKUP_DIR/configs"
mkdir -p "$BACKUP_DIR/configs"
cp -r "$CONFIG_SRC/"* "$BACKUP_DIR/configs/"

# 5. Detect Changes
cd "$BACKUP_DIR"
git add configs/

# Check if there are any changes in the 'configs' directory
if git diff --cached --quiet -- configs/; then
    log "No configuration changes detected in /etc/config."
    log "Skipping backup push."
    exit 0
else
    log "Configuration changes detected!"
fi

# 6. Generate Smart Commit Message
# Get list of changed files (e.g., "network, wireless, firewall")
CHANGED_MODULES=$(git diff --cached --name-only -- configs/ | sed 's|configs/||' | tr '\n' ', ' | sed 's/, $//')
COMMIT_MSG="Update: ${CHANGED_MODULES} ($(date +%Y-%m-%d))"
log "Generated Commit Message: $COMMIT_MSG"

# 7. Finalize Backup Artifacts
# Move the binary tarball to the repo
mv "$ARCHIVE_PATH" "$BACKUP_DIR/"
git add "$ARCHIVE_NAME"

# Prune old local tarballs (Keep only last N)
# This prevents the repo folder from growing indefinitely with binary files
find . -maxdepth 1 -name "backup_*.tar.gz" -type f | sort | head -n -"$MAX_LOCAL_BACKUPS" | while read -r file; do
    log "Pruning old local backup: $file"
    git rm "$file" >/dev/null 2>&1 || rm "$file"
done

# 8. Commit and Push
git commit -m "$COMMIT_MSG"

log "Pushing to GitHub..."
if git push origin "$BRANCH"; then
    log "Backup successfully pushed."
else
    log "Error: Push failed."
    exit 1
fi
