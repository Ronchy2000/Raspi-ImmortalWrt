#!/bin/sh
# ImmortalWrt automatic sysconfig backup to GitHub (优化版)
# 本地保留: 仅最新 3 份 (降低 SD 卡写入)
# 远程保留: 30 天
# 优化: tmpfs 临时存储，减少 SD 卡写入次数

set -eu

PATH=/usr/sbin:/usr/bin:/sbin:/bin

LOG="/root/github_backup.log"
STATE="/root/github_backup_state.json"
REPO_DIR="/root/immortalwrt-backup"
TMP_DIR="/tmp/backup"  # tmpfs，内存中，不写 SD 卡
REMOTE="git@github.com:ronchy2000/immortalwrt-backup.git"
BRANCH="master"

CAUSE="${1:-manual}"

mkdir -p "$(dirname "$LOG")"
exec >>"$LOG" 2>&1
echo "========== RUN $(date +%F %T) (cause=${CAUSE}) =========="

on_error() {
  code=$?
  line=${1:-?}
  echo "[ERROR] exit=$code at line=${line}"
  exit $code
}
trap 'on_error $LINENO' ERR

DATE="$(date +"%Y%m%d_%H%M%S")"
BACKUP_NAME="immortalwrt_backup_${DATE}.tar.gz"

echo "[INFO] 优化模式: 本地仅保留3份最新备份，减少SD卡写入"

# 1) 在 tmpfs 创建备份 (不写 SD 卡)
mkdir -p "$TMP_DIR"
echo "[STEP] sysupgrade -b $TMP_DIR/$BACKUP_NAME (tmpfs)"
sysupgrade -b "$TMP_DIR/$BACKUP_NAME"

# 2) 准备 git 仓库
if [ ! -d "$REPO_DIR/.git" ]; then
  echo "[STEP] init git repo"
  mkdir -p "$REPO_DIR"
  cd "$REPO_DIR"
  git init
  git symbolic-ref HEAD "refs/heads/$BRANCH"
  git remote add origin "$REMOTE" || true
  git config user.name "Router Auto Backup"
  git config user.email "router@local"
else
  cd "$REPO_DIR"
fi

# 3) 拉取最新
echo "[STEP] git pull --rebase origin $BRANCH"
git pull --rebase origin "$BRANCH" 2>/dev/null || true

# 4) 从 tmpfs 复制到 git 工作区并提交
echo "[STEP] copy from tmpfs to git worktree"
cp -f "$TMP_DIR/$BACKUP_NAME" "$REPO_DIR/"

echo "[STEP] git add/commit"
git add "$BACKUP_NAME" || true
git commit -m "Auto backup on ${DATE}" || true

# 5) 推送到 GitHub
echo "[STEP] push with retry"
attempt=1
max_attempts=3
while :; do
  if git push -u origin "$BRANCH"; then
    echo "[INFO] push ok"
    break
  fi
  echo "[WARN] push failed (attempt ${attempt}/${max_attempts})"
  if [ $attempt -ge $max_attempts ]; then
    echo "[ERROR] push failed after ${max_attempts} attempts"
    exit 1
  fi
  sleep 10
  attempt=$((attempt+1))
done

# 6) GitHub 远程保留 30 天
echo "[STEP] remote prune (>30d via git rm + push)"
OLD_LIST="$(find "$REPO_DIR" -maxdepth 1 -type f -name 'immortalwrt_backup_*.tar.gz' -mtime +30 || true)"
if [ -n "${OLD_LIST:-}" ]; then
  echo "$OLD_LIST" | while read -r f; do
    [ -n "$f" ] || continue
    base="$(basename "$f")"
    echo "[DEL-REMOTE] $base"
    git rm -f -- "$base" || true
  done
  if ! git diff --cached --quiet; then
    git commit -m "Prune backups >30 days on ${DATE}" || true
    git push origin "$BRANCH" || true
  fi
else
  echo "[INFO] no remote files >30d to prune"
fi

# 7) 本地仅保留最新 3 份 (大幅减少 SD 卡写入)
echo "[STEP] local keep only latest 3 backups (SD-card-friendly)"
cd "$REPO_DIR"
ls -t immortalwrt_backup_*.tar.gz 2>/dev/null | tail -n +4 | while read -r old_file; do
  echo "[DEL-LOCAL] $old_file (keep only 3 latest)"
  rm -f "$old_file"
done

# 8) 写入状态
NOW_EPOCH=$(date +%s)
NOW_AT="$(date '+%F %T %Z')"
echo "[STEP] write state to $STATE"
{
  echo "{"
  echo "  \"last_success_at\": \"${NOW_AT}\","
  echo "  \"last_success_epoch\": ${NOW_EPOCH},"
  echo "  \"last_cause\": \"${CAUSE}\","
  echo "  \"local_retention\": \"3 files (optimized for SD card)\","
  echo "  \"remote_retention\": \"30 days\""
  echo "}"
} > "$STATE".tmp
mv -f "$STATE".tmp "$STATE"

# 9) 清理 tmpfs
echo "[STEP] cleanup tmpfs"
rm -rf "$TMP_DIR"

# 10) 显示统计
BACKUP_COUNT=$(ls "$REPO_DIR"/immortalwrt_backup_*.tar.gz 2>/dev/null | wc -l)
LOCAL_SIZE=$(du -sh "$REPO_DIR" | awk '{print $1}')
echo "[DONE] $BACKUP_NAME pushed to GitHub"
echo "[STATS] Local: ${BACKUP_COUNT} files, ${LOCAL_SIZE} (max 3 files)"
echo "[STATS] Remote: 30 days retention on GitHub"
