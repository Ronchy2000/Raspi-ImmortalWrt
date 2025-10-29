<a id="chinese"></a>
[🇨🇳 中文文档](#chinese) | [🇺🇸 English](#english)
# 🌐 ImmortalWrt → GitHub 自动备份教程

### （仅备份系统配置，本地保留 7 天，云端保留 30 天）

## 一、安装必要组件

```bash
opkg update
opkg install git openssh-client openssh-keygen ca-bundle ca-certificates
```


## 二、生成 SSH 密钥并连接 GitHub

```bash
ssh-keygen -t ed25519 -f /root/.ssh/id_ed25519 -N ""
cat /root/.ssh/id_ed25519.pub
```

> 复制输出内容，粘贴到
> **GitHub → Settings → SSH and GPG keys → New SSH Key**

测试连接：

```bash
ssh -T git@github.com
# 若22端口被封，则用：
ssh -T -p 443 git@ssh.github.com
```

成功输出示例：

```
Hi ronchy2000! You've successfully authenticated, but GitHub does not provide shell access.
```


## 三、修改 SSH 配置文件（使用 443 端口）

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


## 四、自动备份脚本 `/root/github_backup.sh`

> 脚本注释为英文，逻辑为：
> 仅备份系统配置（`sysupgrade -b`），
> 本地保留 7 天，
> 云端（GitHub master 分支）保留 30 天。
> 调整修改下方的：`REMOTE="git@github.com:ronchy2000/immortalwrt-backup.git"`为你的远程仓库链接。

```bash
# 创建自动同步脚本文件
sudo nano /root/github_backup.sh
```
文件内容如下，记得替换远程仓库链接！
```bash
#!/bin/sh
# ImmortalWrt automatic sysconfig backup to GitHub
# Local retention: 7 days (rm only)
# Remote retention: 30 days (git rm + push)
# Author: ronchy2000

PATH=/usr/sbin:/usr/bin:/sbin:/bin
LOG="/root/github_backup.log"
mkdir -p "$(dirname "$LOG")"
exec >>"$LOG" 2>&1
echo "========== RUN $(date '+%F %T') =========="

set -e
REPO_DIR="/root/immortalwrt-backup"
TMP_DIR="/tmp/backup"
DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="immortalwrt_backup_${DATE}.tar.gz"
REMOTE="git@github.com:ronchy2000/immortalwrt-backup.git"
BRANCH="master"

echo "[INFO] TMP_DIR=$TMP_DIR REPO_DIR=$REPO_DIR BACKUP=$BACKUP_NAME"

# 1) Create system backup (sysupgrade -b)
mkdir -p "$TMP_DIR"
sysupgrade -b "$TMP_DIR/$BACKUP_NAME"

# 2) Prepare/init repo
if [ ! -d "$REPO_DIR/.git" ]; then
  mkdir -p "$REPO_DIR"
  cd "$REPO_DIR" || exit 1
  git init
  git symbolic-ref HEAD refs/heads/$BRANCH
  git remote add origin "$REMOTE"
  git config user.name "Router Auto Backup"
  git config user.email "router@local"
else
  cd "$REPO_DIR" || exit 1
fi

# 3) Pull latest (ignore failure on first run)
git pull --rebase origin "$BRANCH" 2>/dev/null || true

# 4) Copy new backup, add & push
cp -f "$TMP_DIR/$BACKUP_NAME" "$REPO_DIR/"
git add "$BACKUP_NAME" || true
git commit -m "Auto backup on ${DATE}" || true
git push -u origin "$BRANCH" || true

# 5) Remote retention (>30d): delete via git rm + push
OLD_LIST=$(find "$REPO_DIR" -maxdepth 1 -type f -name 'immortalwrt_backup_*.tar.gz' -mtime +30)
if [ -n "$OLD_LIST" ]; then
  echo "$OLD_LIST" | while read -r f; do
    base=$(basename "$f")
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

# 6) Local retention (>7d): delete old files (not staged)
find "$REPO_DIR" -maxdepth 1 -type f -name 'immortalwrt_backup_*.tar.gz' -mtime +7 -print -exec rm -f {} \;

# 7) Cleanup
rm -rf "$TMP_DIR"
echo "[DONE] $BACKUP_NAME (local keep 7d, remote keep 30d)"
```

保存后赋予执行权限：

```bash
chmod +x /root/github_backup.sh
```


## 五、手动测试备份

```bash
/root/github_backup.sh
tail -n 50 /root/github_backup.log
```

日志文件路径：`/root/github_backup.log`
成功后 GitHub 仓库中会出现最新的 `immortalwrt_backup_YYYYMMDD_HHMMSS.tar.gz`


## 六、设置每日 23:00 自动运行

启用并启动定时服务：

```bash
/etc/init.d/cron enable
/etc/init.d/cron start
```

编辑定时任务：

```bash
crontab -e
```

添加：

```
0 23 * * * /root/github_backup.sh
```

查看状态：

```bash
/etc/init.d/cron status
```

输出 `running` 即为正常。


## 七、查看日志

```bash
tail -n 100 /root/github_backup.log
```

日志会记录：

* 每次执行时间；
* 备份文件名；
* Git 推送和清理结果；
* 成功结尾 `[DONE] immortalwrt_backup_...`



## 八、运行逻辑总结

| 阶段        | 动作                        | 说明                          |
| --------- | ------------------------- | --------------------------- |
| 生成备份      | `sysupgrade -b`           | 导出路由器配置                     |
| 推送 GitHub | `git add + push`          | 每天生成一个 tar.gz 上传到 master 分支 |
| 云端清理      | `git rm + push`           | 删除超过 30 天的备份（同步至 GitHub）    |
| 本地清理      | `rm -f`                   | 删除超过 7 天的文件（不影响 GitHub）     |
| 自动执行      | `cron @23:00`             | 每天 23:00 自动运行一次             |
| 日志输出      | `/root/github_backup.log` | 每次执行结果自动追加                  |

---

📦 **最终效果：**

* 每晚 23:00 自动生成并上传系统配置备份；
* 本地仅保留 7 天文件；
* GitHub 私有仓库仅保留 30 天文件；
* 所有操作日志记录在 `/root/github_backup.log`。

---

<a id="english"></a>
[🇨🇳 中文文档](#chinese) | [🇺🇸 English](#english)

# 🌐 ImmortalWrt → GitHub Automatic Backup Tutorial

### (System configuration backup only, local retention: 7 days, cloud retention: 30 days)

## Phase 1: Install Required Components

```bash
opkg update
opkg install git openssh-client openssh-keygen ca-bundle ca-certificates
```

## Phase 2: Generate SSH Key and Connect to GitHub

```bash
ssh-keygen -t ed25519 -f /root/.ssh/id_ed25519 -N ""
cat /root/.ssh/id_ed25519.pub
```

> Copy the output and paste it into
> **GitHub → Settings → SSH and GPG keys → New SSH Key**

Test connection:

```bash
ssh -T git@github.com
# If port 22 is blocked, use:
ssh -T -p 443 git@ssh.github.com
```

Successful output example:

```
Hi ronchy2000! You've successfully authenticated, but GitHub does not provide shell access.
```

## Phase 3: Modify SSH Configuration File (Use Port 443)

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

## Phase 4: Automatic Backup Script `/root/github_backup.sh`

> Script logic:
> Backup system configuration only (`sysupgrade -b`),
> Local retention: 7 days,
> Cloud (GitHub master branch) retention: 30 days.
> Modify the following line: `REMOTE="git@github.com:ronchy2000/immortalwrt-backup.git"` to your remote repository URL.

```bash
# Create automatic sync script file
sudo nano /root/github_backup.sh
```

File content as follows, remember to replace the remote repository URL!

```bash
#!/bin/sh
# ImmortalWrt automatic sysconfig backup to GitHub
# Local retention: 7 days (rm only)
# Remote retention: 30 days (git rm + push)
# Author: ronchy2000

PATH=/usr/sbin:/usr/bin:/sbin:/bin
LOG="/root/github_backup.log"
mkdir -p "$(dirname "$LOG")"
exec >>"$LOG" 2>&1
echo "========== RUN $(date '+%F %T') =========="

set -e
REPO_DIR="/root/immortalwrt-backup"
TMP_DIR="/tmp/backup"
DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="immortalwrt_backup_${DATE}.tar.gz"
REMOTE="git@github.com:ronchy2000/immortalwrt-backup.git"
BRANCH="master"

echo "[INFO] TMP_DIR=$TMP_DIR REPO_DIR=$REPO_DIR BACKUP=$BACKUP_NAME"

# 1) Create system backup (sysupgrade -b)
mkdir -p "$TMP_DIR"
sysupgrade -b "$TMP_DIR/$BACKUP_NAME"

# 2) Prepare/init repo
if [ ! -d "$REPO_DIR/.git" ]; then
  mkdir -p "$REPO_DIR"
  cd "$REPO_DIR" || exit 1
  git init
  git symbolic-ref HEAD refs/heads/$BRANCH
  git remote add origin "$REMOTE"
  git config user.name "Router Auto Backup"
  git config user.email "router@local"
else
  cd "$REPO_DIR" || exit 1
fi

# 3) Pull latest (ignore failure on first run)
git pull --rebase origin "$BRANCH" 2>/dev/null || true

# 4) Copy new backup, add & push
cp -f "$TMP_DIR/$BACKUP_NAME" "$REPO_DIR/"
git add "$BACKUP_NAME" || true
git commit -m "Auto backup on ${DATE}" || true
git push -u origin "$BRANCH" || true

# 5) Remote retention (>30d): delete via git rm + push
OLD_LIST=$(find "$REPO_DIR" -maxdepth 1 -type f -name 'immortalwrt_backup_*.tar.gz' -mtime +30)
if [ -n "$OLD_LIST" ]; then
  echo "$OLD_LIST" | while read -r f; do
    base=$(basename "$f")
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

# 6) Local retention (>7d): delete old files (not staged)
find "$REPO_DIR" -maxdepth 1 -type f -name 'immortalwrt_backup_*.tar.gz' -mtime +7 -print -exec rm -f {} \;

# 7) Cleanup
rm -rf "$TMP_DIR"
echo "[DONE] $BACKUP_NAME (local keep 7d, remote keep 30d)"
```

After saving, grant execution permissions:

```bash
chmod +x /root/github_backup.sh
```

## Phase 5: Manual Backup Test

```bash
/root/github_backup.sh
tail -n 50 /root/github_backup.log
```

Log file path: `/root/github_backup.log`
After success, the latest `immortalwrt_backup_YYYYMMDD_HHMMSS.tar.gz` will appear in the GitHub repository.

## Phase 6: Set Daily Automatic Execution at 23:00

Enable and start the cron service:

```bash
/etc/init.d/cron enable
/etc/init.d/cron start
```

Edit cron tasks:

```bash
crontab -e
```

Add:

```
0 23 * * * /root/github_backup.sh
```

Check status:

```bash
/etc/init.d/cron status
```

Output `running` indicates normal operation.

## Phase 7: View Logs

```bash
tail -n 100 /root/github_backup.log
```

The log records:

* Execution time for each run
* Backup file name
* Git push and cleanup results
* Successful completion message `[DONE] immortalwrt_backup_...`

## Phase 8: Logic Summary

| Phase            | Action                    | Description                                           |
| ---------------- | ------------------------- | ----------------------------------------------------- |
| Generate Backup  | `sysupgrade -b`           | Export router configuration                           |
| Push to GitHub   | `git add + push`          | Upload one tar.gz file daily to master branch         |
| Cloud Cleanup    | `git rm + push`           | Delete backups older than 30 days (sync to GitHub)    |
| Local Cleanup    | `rm -f`                   | Delete files older than 7 days (no GitHub impact)     |
| Auto Execution   | `cron @23:00`             | Runs automatically once daily at 23:00                |
| Log Output       | `/root/github_backup.log` | Append execution results automatically                |

---

📦 **Final Result:**

* Automatically generate and upload system configuration backup at 23:00 every night
* Keep only 7 days of files locally
* Keep only 30 days of files in GitHub private repository
* All operation logs recorded in `/root/github_backup.log`
