<a id="chinese"></a>
[🇨🇳 中文文档](#chinese) | [🇺🇸 English](#english)

# 🌐 ImmortalWrt → 智能自动备份 (Smart Backup)

## 概览
- **脚本名称**: `/root/smart_backup.sh`
- **运行时间**: 每天 **15:00** 自动运行。
- **核心逻辑**: **按需备份**。智能识别 `/etc/config` 变更，只有配置发生变化时才执行备份和推送。
- **双重存档**: 同时保存 `sysupgrade` 恢复包 (`.tar.gz`) 和明文配置 (`configs/`)，便于追踪变更历史。
- **保留策略**: 本地保留最近 **3份**，GitHub 仓库保留最近 **30份**。
- **稳定性检查**: 内置开机时长检测 (>10分钟)、NTP 时间同步检查和网络连通性检查。

## 为什么要这样做
- **避免冗余**: 只有配置变了才备份，节省存储空间，减少无效提交。
- **版本管理**: 自动提取配置文件到 Git，可以清晰地看到每次修改了哪些配置项 (Diff)。
- **语义化提交**: 自动生成 Commit Message (如 `Update: network, wireless`)，一目了然。
- **智能补跑**: 配合 `rc.local` 开机自启，脚本会自动判断运行时间，确保在系统稳定后执行，防止漏跑。

## 部署步骤

### 1. 安装依赖

```bash
opkg update
opkg install git openssh-client openssh-keygen ca-bundle ca-certificates
```

### 2. 生成 SSH 密钥并验证

```bash
ssh-keygen -t ed25519 -f /root/.ssh/id_ed25519 -N ""
cat /root/.ssh/id_ed25519.pub   # 加到 GitHub → Settings → SSH and GPG keys
ssh -T git@github.com
ssh -T -p 443 git@ssh.github.com   # 若 22 端口被封
```

### 3. 固定使用 443 端口

```bash
cat > /root/.ssh/config <<'EOF'
Host github.com
  HostName ssh.github.com
  Port 443
  User git
  IdentityFile ~/.ssh/id_ed25519
  StrictHostKeyChecking accept-new
  PubkeyAuthentication yes
  PubkeyAcceptedKeyTypes +ssh-ed25519,ssh-rsa
  HostkeyAlgorithms +ssh-ed25519,ssh-rsa
EOF

chmod 600 /root/.ssh/config
chmod 700 /root/.ssh
chmod 600 /root/.ssh/id_ed25519
chmod 644 /root/.ssh/id_ed25519.pub
```

### 4. 部署备份脚本 `/root/smart_backup.sh`

请参考项目 `scripts/smart_backup.sh` 获取最新代码。

主要逻辑：
1. **稳定性检查**: 等待系统启动 > 10分钟，等待网络连通。
2. **生成备份**: 在 `/tmp` 生成临时备份。
3. **差异比对**: 解压备份，对比 `/etc/config` 与 Git 仓库中的版本。
4. **执行备份**:
   - **有变更**: 提交变更 (Git Commit) -> 推送 (Git Push) -> 清理旧备份。
   - **无变更**: 输出日志，跳过备份。

### 5. 配置定时任务

```bash
# 每天 15:00 执行
echo "0 15 * * * /root/smart_backup.sh >> /root/smart_backup.log 2>&1" >> /etc/crontabs/root
/etc/init.d/cron restart
```

### 6. 配置开机自检 (可选)

为了防止 15:00 关机导致错过备份，建议在 `/etc/rc.local` 中添加启动执行。脚本内置了变更检测，即使多次运行也不会产生重复备份。

```bash
# 编辑 /etc/rc.local，在 exit 0 之前添加：
/root/smart_backup.sh &
```

# 1) Create system backup archive
mkdir -p "$TMP_DIR"
echo "[STEP] sysupgrade -b $TMP_DIR/$BACKUP_NAME"
sysupgrade -b "$TMP_DIR/$BACKUP_NAME"

# 2) Prepare/init repository
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

# 3) Pull latest (ignore failure on first run)
echo "[STEP] git pull --rebase origin $BRANCH (ignore first-run failure)"
git pull --rebase origin "$BRANCH" 2>/dev/null || true

# 4) Copy, commit, push (with retry)
echo "[STEP] copy new backup into worktree"
cp -f "$TMP_DIR/$BACKUP_NAME" "$REPO_DIR/"

echo "[STEP] git add/commit"
git add "$BACKUP_NAME" || true
git commit -m "Auto backup on ${DATE}" || true

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

# 5) Remote retention (>30d): git rm + push
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

# 6) Local retention (>7d)
echo "[STEP] local prune (>7d via rm only)"
find "$REPO_DIR" -maxdepth 1 -type f -name 'immortalwrt_backup_*.tar.gz' -mtime +7 -print -exec rm -f {} \; || true

# 7) Write state JSON (success only), atomic update
NOW_EPOCH=$(date +%s)
NOW_AT="$(date '+%F %T %Z')"
echo "[STEP] write state to $STATE"
{
  echo "{"
  echo "  \"last_success_at\": \"${NOW_AT}\","
  echo "  \"last_success_epoch\": ${NOW_EPOCH},"
  echo "  \"last_cause\": \"${CAUSE}\""
  echo "}"
} > "$STATE".tmp
mv -f "$STATE".tmp "$STATE"

# 8) Cleanup
echo "[STEP] cleanup TMP_DIR"
rm -rf "$TMP_DIR"

echo "[DONE] $BACKUP_NAME (local keep 7d, remote keep 30d)."
EOF

chmod +x /root/github_backup.sh
```

### 5. 写入开机补跑脚本 `/root/github_backup_bootcheck.sh`

逻辑：开机后检查“昨日或今日15:00”是否已经备份，仅在漏跑时安排一次补跑。

```bash
cat > /root/github_backup_bootcheck.sh <<'EOF'
#!/bin/sh
# Boot-time check:
# If the most recent scheduled 15:00 backup (today or yesterday) was missed,
# schedule a one-shot catch-up 10 minutes after boot.

LOG="/root/github_backup.log"
STATE="/root/github_backup_state.json"
SCRIPT="/root/github_backup.sh"

PATH=/usr/sbin:/usr/bin:/sbin:/bin

echo "========== BOOTCHECK $(date '+%F %T') ==========" >>"$LOG" 2>&1

# Read last success epoch from JSON (sed without jq)
LAST_OK=0
if [ -s "$STATE" ]; then
  LAST_OK="$(sed -n 's/.*\"last_success_epoch\"[[:space:]]*:[[:space:]]*\([0-9][0-9]*\).*/\1/p' "$STATE" | head -n1)"
  [ -n "$LAST_OK" ] || LAST_OK=0
fi

NOW=$(date +%s)

# Compute today's 00:00 (local) in seconds since epoch:
# Avoid leading-zero octal by stripping zeros explicitly.
H=$(date +%H); M=$(date +%M); S=$(date +%S)
H=${H#0}; [ -n "$H" ] || H=0
M=${M#0}; [ -n "$M" ] || M=0
S=${S#0}; [ -n "$S" ] || S=0

SEC_SINCE=$(( H*3600 + M*60 + S ))
TODAY0=$(( NOW - SEC_SINCE ))
TODAY_1500=$(( TODAY0 + 15*3600 ))
YDAY_1500=$(( TODAY_1500 - 86400 ))

# Determine the most recent scheduled 15:00 slot before or at NOW.
# If we already passed today's 15:00, the last slot is TODAY_1500; otherwise it's YDAY_1500.
if [ "$NOW" -ge "$TODAY_1500" ]; then
  LAST_SLOT="$TODAY_1500"
  SLOT_LABEL="today_15:00"
else
  LAST_SLOT="$YDAY_1500"
  SLOT_LABEL="yesterday_15:00"
fi

echo "[INFO] last_success_epoch=${LAST_OK}  last_slot(${SLOT_LABEL})=${LAST_SLOT}  now=${NOW}" >>"$LOG" 2>&1

# If last success < last scheduled slot, schedule a single catch-up run after 10 minutes
if [ "$LAST_OK" -lt "$LAST_SLOT" ]; then
  echo "[BOOTCHECK] Missed the last scheduled 15:00 backup (${SLOT_LABEL}); scheduling catch-up in 10 minutes." >>"$LOG" 2>&1
  ( sleep 600; "$SCRIPT" "catchup" >>"$LOG" 2>&1 ) &
else
  echo "[BOOTCHECK] No catch-up needed." >>"$LOG" 2>&1
fi
EOF

chmod +x /root/github_backup_bootcheck.sh

```

### 6. 定时任务：每天 15:00

```bash
/etc/init.d/cron enable
/etc/init.d/cron start

crontab -e
# 添加或更新：
0 15 * * * /root/github_backup.sh cron >> /root/github_backup.log 2>&1

/etc/init.d/cron reload
/etc/init.d/cron restart
/etc/init.d/cron status
```

### 7. 开机补跑挂载到 `/etc/rc.local`

```bash
vi /etc/rc.local
# 在 exit 0 之前添加：
/root/github_backup_bootcheck.sh &
exit 0

reboot   # 重启确认
```

### 8. 手动验证与排查

```bash
/root/github_backup.sh manual
tail -n 80 /root/github_backup.log
cat /root/github_backup_state.json

rm -f /root/github_backup_state.json
/root/github_backup_bootcheck.sh
tail -n 120 /root/github_backup.log
```

## 日志与常见问题
- `tail -n 100 /root/github_backup.log`：查看运行时间、cause 标记 (`cron/catchup/manual`)、Push 重试及清理记录。
- 若断电后没补跑，确认 `rc.local` 是否正确写入并留有换行。
- Push 失败多见于 SSH 配置或网络波动；日志会记录重试和报错。

## 预期结果
- 每天下午依计划生成压缩包并推送至 GitHub。
- 本地和云端保留周期满足 7/30 天要求。
- 断电漏跑时只补跑一次，状态文件自动更新。
- 所有动作可在日志中追溯。

---

<a id="english"></a>
[🇨🇳 中文文档](#chinese) | [🇺🇸 English](#english)

# 🌐 ImmortalWrt → GitHub Automatic Backup (Power-Cut Catch-Up)

## Overview
- Runs `sysupgrade -b` every day at **15:00**, pushes the archive to your GitHub repo.
- Keeps 7 daily archives locally and 30 days on GitHub, pruning the rest automatically.
- `/root/github_backup_state.json` stores the last successful run; if the previous day’s 15:00 run is missing, a one-shot catch-up fires **10 minutes after boot**.
- Unified logging at `/root/github_backup.log`, including push retries and cleanup notes.

## Why These Changes
- **15:00 schedule** avoids midnight jobs and lets you troubleshoot while you are around.
- **State file + boot checker** make sure catch-up runs only when you truly missed a backup.
- **Structured logging with retries** keeps a clear audit trail for SSH/network glitches.

## Setup Steps

### 1. Install packages

```bash
opkg update
opkg install git openssh-client openssh-keygen ca-bundle ca-certificates
```

### 2. Create SSH key and test access

```bash
ssh-keygen -t ed25519 -f /root/.ssh/id_ed25519 -N ""
cat /root/.ssh/id_ed25519.pub   # Add to GitHub → Settings → SSH and GPG keys
ssh -T git@github.com
ssh -T -p 443 git@ssh.github.com   # fallback if port 22 is blocked
```

### 3. Force SSH over 443

```bash
cat > /root/.ssh/config <<'EOF'
Host github.com
  HostName ssh.github.com
  Port 443
  User git
  IdentityFile ~/.ssh/id_ed25519
  StrictHostKeyChecking accept-new
  PubkeyAuthentication yes
  PubkeyAcceptedKeyTypes +ssh-ed25519,ssh-rsa
  HostkeyAlgorithms +ssh-ed25519,ssh-rsa
EOF

chmod 600 /root/.ssh/config
chmod 700 /root/.ssh
chmod 600 /root/.ssh/id_ed25519
chmod 644 /root/.ssh/id_ed25519.pub
```

### 4. Backup script `/root/github_backup.sh`

Use the block in the Chinese section above; comments are already in English. Replace `REMOTE=` with your repo URL and mark it executable.

### 5. Boot catch-up script `/root/github_backup_bootcheck.sh`

Same as in the Chinese section; it only schedules a single catch-up when yesterday 15:00 was missed.

### 6. Cron job at 15:00

```bash
/etc/init.d/cron enable
/etc/init.d/cron start

crontab -e
0 15 * * * /root/github_backup.sh cron >> /root/github_backup.log 2>&1

/etc/init.d/cron reload
/etc/init.d/cron restart
/etc/init.d/cron status
```

### 7. Hook boot checker via `/etc/rc.local`

```bash
vi /etc/rc.local
/root/github_backup_bootcheck.sh &
exit 0

reboot
```

### 8. Verify and troubleshoot

```bash
/root/github_backup.sh manual
tail -n 80 /root/github_backup.log
cat /root/github_backup_state.json

rm -f /root/github_backup_state.json
/root/github_backup_bootcheck.sh
tail -n 120 /root/github_backup.log
```

## Logs & FAQ
- Tail the log to confirm run cause, file names, push retries, and cleanup: `tail -n 100 /root/github_backup.log`.
- No catch-up after a blackout? Re-check the `/etc/rc.local` line and make sure a newline exists at the end.
- Push failures usually mean SSH/network issues; the log will show each retry and the final error.

## Expected Outcome
- Daily backups at 15:00 land in your GitHub repo without manual effort.
- Local storage and remote retention stay within 7/30-day windows.
- Power-cut gaps trigger exactly one delayed run, with the state file refreshed on success.
- You can always audit what happened via `/root/github_backup.log`.

---

## 🔄 如何恢复备份 (How to Restore)

### 1. 恢复 `.tar.gz` 备份包 (完整系统配置)

这是最常用的恢复方式，可以将系统恢复到备份时的状态。

**步骤**:
1.  **下载备份包**: 从 GitHub 仓库下载你需要恢复的 `.tar.gz` 文件 (例如 `immortalwrt_backup_20251202_150000.tar.gz`)。
2.  **上传到路由器**: 使用 SCP 或 WinSCP 将文件上传到路由器的 `/tmp` 目录。
    ```bash
    scp immortalwrt_backup_20251202_150000.tar.gz root@192.168.1.1:/tmp/backup.tar.gz
    ```
3.  **执行恢复**:
    登录路由器 SSH，执行以下命令：
    ```bash
    sysupgrade -r /tmp/backup.tar.gz
    ```
    *系统会自动重启并应用配置。*

### 2. 恢复 `configs/` 目录中的单个配置 (高级)

如果你只想恢复某个特定的配置 (例如只恢复网络设置 `network`，而不影响其他设置)，可以使用这种方法。

**什么是 `configs/`?**
这是智能备份脚本自动提取出来的明文配置文件，位于 GitHub 仓库的 `configs/` 文件夹下。它们对应路由器 `/etc/config/` 目录下的文件。

**步骤**:
1.  **查看内容**: 在 GitHub 上打开 `configs/` 文件夹，找到你需要的文件 (例如 `network`)，复制其内容。
2.  **覆盖配置**:
    登录路由器 SSH，编辑对应的配置文件：
    ```bash
    vi /etc/config/network
    ```
    *清空原有内容，粘贴你从 GitHub 复制的内容，保存退出。*
3.  **重启服务**:
    修改完配置后，需要重启相关服务或重启系统才能生效。
    ```bash
    # 例如修改了 network，重启网络服务
    /etc/init.d/network restart
    
    # 或者直接重启系统
    reboot
    ```
