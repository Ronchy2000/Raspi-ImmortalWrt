<a id="chinese"></a>
[🇨🇳 中文文档](#chinese) | [🇺🇸 English](#english)

# 🌐 ImmortalWrt 智能自动备份 (Smart Backup)

## 概览
- **脚本名称**: `/root/smart_backup.sh`
- **运行时间**: 每天 **15:00** 自动运行 + 开机自动检查
- **核心逻辑**: **按需备份**。智能识别 `/etc/config` 和 `/etc/openclash` 变更，只有配置发生变化时才执行备份和推送
- **双重存档**: 同时保存 `sysupgrade` 恢复包 (`.tar.gz`) 和明文配置 (`configs/` + `openclash/`)，便于追踪变更历史
- **保留策略**: 本地保留最近 **3份**，GitHub 仓库保留最近 **30份**
- **稳定性检查**: 内置开机时长检测 (>10分钟)、NTP 时间同步检查和网络连通性检查

## 为什么要这样做
- **避免冗余**: 只有配置变了才备份，节省存储空间和 Git 提交历史
- **版本管理**: 自动提取配置文件到 Git，可以清晰地看到每次修改了哪些配置项 (Diff)
- **OpenClash支持**: 同时备份 `/etc/config/openclash` 和 `/etc/openclash/*.yaml` 配置文件
- **语义化提交**: 自动生成 Commit Message (如 `Update: dhcp, network, wireless, config.yaml`)
- **开机补跑**: 配合 `rc.local` 开机自启，系统稳定后自动检查并执行备份

## 部署步骤

### 1. 安装依赖

先判断系统版本：

- `OpenWrt 24.10 及更早稳定版`：使用 `opkg`
- `OpenWrt 25.12 及更新版本 / 新分支`：使用 `apk`

`24.10 及更早稳定版`：

```bash
opkg update
opkg install git openssh-client openssh-keygen ca-bundle ca-certificates
```

`25.12 及更新版本 / 新分支`：

```bash
apk update
apk add git openssh-client openssh-keygen ca-bundle ca-certificates
```

### 2. 配置 SSH 密钥

```bash
# 生成密钥（如果还没有）
ssh-keygen -t ed25519 -f /root/.ssh/id_ed25519 -N ""

# 查看公钥，添加到 GitHub → Settings → SSH and GPG keys
cat /root/.ssh/id_ed25519.pub

# 配置 SSH 使用 443 端口（防止 22 端口被封）
cat > /root/.ssh/config <<'EOF'
Host github.com
  HostName ssh.github.com
  Port 443
  User git
  IdentityFile ~/.ssh/id_ed25519
  StrictHostKeyChecking accept-new
EOF

chmod 600 /root/.ssh/config
chmod 600 /root/.ssh/id_ed25519

# 测试连接
ssh -T git@github.com
```

### 3. 部署备份脚本

从本项目获取 `scripts/smart_backup.sh`，修改以下配置：

```bash
# 配置段（脚本开头）
GIT_USERNAME="YOUR_USERNAME"           # 你的 GitHub 用户名
BACKUP_REPO="YOUR_BACKUP_REPO"         # 备份仓库名
GIT_REMOTE="git@github.com:${GIT_USERNAME}/${BACKUP_REPO}.git"
```

上传脚本到路由器：

```bash
scp smart_backup.sh root@192.168.1.1:/root/
ssh root@192.168.1.1 "chmod +x /root/smart_backup.sh"
```

**脚本逻辑**：
1. 等待系统稳定（启动 > 10分钟）
2. 检查时间同步和网络连通
3. 生成 sysupgrade 备份到 `/tmp`
4. 提取配置文件并与 Git 仓库对比
5. **仅在有变更时**提交并推送到 GitHub
6. 自动清理本地和远程旧备份

### 4. 配置定时任务

```bash
# 每天 15:00 执行
echo "0 15 * * * /root/smart_backup.sh >> /root/smart_backup.log 2>&1" >> /etc/crontabs/root
/etc/init.d/cron restart
```

### 5. 配置开机自动执行

在 `/etc/rc.local` 的 `exit 0` 之前添加：

```bash
/root/smart_backup.sh &
```

脚本内置变更检测，重复运行不会产生冗余备份。

## 查看日志和状态

```bash
# 查看备份日志
tail -n 100 /root/smart_backup.log

# 查看定时任务
crontab -l

# 查看 rc.local 配置
cat /etc/rc.local

# 手动运行测试
/root/smart_backup.sh
```

## 常见问题

**Q: 备份没有推送到 GitHub？**

检查 SSH 连接：
```bash
ssh -T git@github.com
```

查看日志：
```bash
tail -n 50 /root/smart_backup.log
```

确认配置文件确实有变更

**Q: 开机后没有自动执行？**

确认 `/etc/rc.local` 包含 `/root/smart_backup.sh &`，脚本会等待系统启动 10 分钟后才执行。

**Q: 为什么有时候不备份？**

这是正常的！脚本只在配置变更时才备份。脚本会监控：
- `/etc/config/` 下的所有系统配置文件
- `/etc/openclash/` 下的 OpenClash 配置文件（如 config.yaml）

修改任何一处都会触发备份。

---

<a id="english"></a>
[🇨🇳 中文文档](#chinese) | [🇺🇸 English](#english)

# 🌐 ImmortalWrt Smart Automatic Backup

## Overview
- **Script**: `/root/smart_backup.sh`
- **Schedule**: Daily at **15:00** + auto-check on boot
- **Core Logic**: **On-Demand Backup** - Only backs up when `/etc/config` changes detected
- **Dual Archive**: Saves both `sysupgrade` package (`.tar.gz`) and plain text configs (`configs/`)
- **Retention**: Local **3 recent backups**, GitHub **30 recent backups**
- **Stability Checks**: System uptime (>10min), NTP sync, network connectivity

## Why This Approach
- **Avoid Redundancy**: Only backup when config changes, save storage and Git history
- **Version Control**: Auto-extract config files to Git, view clear diffs of changes
- **Semantic Commits**: Auto-generated messages like `Update: dhcp, network, wireless`
- **Boot Recovery**: Auto-check and backup after boot when system is stable

## Setup Steps

### 1. Install Dependencies

First identify your OpenWrt branch:

- `OpenWrt 24.10 and earlier stable releases`: use `opkg`
- `OpenWrt 25.12 and newer`: use `apk`

For `24.10 and earlier`:

```bash
opkg update
opkg install git openssh-client openssh-keygen ca-bundle ca-certificates
```

For `25.12 and newer`:

```bash
apk update
apk add git openssh-client openssh-keygen ca-bundle ca-certificates
```

### 2. Configure SSH Key

```bash
# Generate key if not exists
ssh-keygen -t ed25519 -f /root/.ssh/id_ed25519 -N ""

# View public key, add to GitHub → Settings → SSH and GPG keys
cat /root/.ssh/id_ed25519.pub

# Configure SSH to use port 443 (in case port 22 is blocked)
cat > /root/.ssh/config <<'EOF'
Host github.com
  HostName ssh.github.com
  Port 443
  User git
  IdentityFile ~/.ssh/id_ed25519
  StrictHostKeyChecking accept-new
EOF

chmod 600 /root/.ssh/config
chmod 600 /root/.ssh/id_ed25519

# Test connection
ssh -T git@github.com
```

### 3. Deploy Backup Script

Get `scripts/smart_backup.sh` from this project and modify these settings:

```bash
# Configuration section (at script beginning)
GIT_USERNAME="YOUR_USERNAME"           # Your GitHub username
BACKUP_REPO="YOUR_BACKUP_REPO"         # Backup repository name
GIT_REMOTE="git@github.com:${GIT_USERNAME}/${BACKUP_REPO}.git"
```

Upload script to router:

```bash
scp smart_backup.sh root@192.168.1.1:/root/
ssh root@192.168.1.1 "chmod +x /root/smart_backup.sh"
```

### 4. Configure Cron Job

```bash
# Daily execution at 15:00
echo "0 15 * * * /root/smart_backup.sh >> /root/smart_backup.log 2>&1" >> /etc/crontabs/root
/etc/init.d/cron restart
```

### 5. Configure Boot Auto-Run

Add before `exit 0` in `/etc/rc.local`:

```bash
/root/smart_backup.sh &
```

## View Logs and Status

```bash
# View backup log
tail -n 100 /root/smart_backup.log

# View cron jobs
crontab -l

# Manual test run
/root/smart_backup.sh
```

## FAQ

**Q: Backup not pushed to GitHub?**

Check SSH connection:
```bash
ssh -T git@github.com
```

Check log:
```bash
tail -n 50 /root/smart_backup.log
```

Verify config files actually changed.

**Q: No auto-run after boot?**

Confirm `/etc/rc.local` contains `/root/smart_backup.sh &`. Script waits 10 minutes after boot for system stability.

**Q: Why sometimes no backup?**

This is normal! Script only backs up when configs change. Check if you actually modified files in `/etc/config`.

---

## 🔄 如何恢复备份 (How to Restore)

### 1. 恢复 `.tar.gz` 备份包 (完整系统配置 / Full System Restore)

**中文步骤 / Steps**:
1. 从 GitHub 下载备份文件 (例如 `backup_20251213_212620.tar.gz`)
   Download backup file from GitHub (e.g., `backup_20251213_212620.tar.gz`)

2. 上传到路由器 `/tmp` 目录
   Upload to router `/tmp` directory:
   ```bash
   scp backup_20251213_212620.tar.gz root@192.168.1.1:/tmp/backup.tar.gz
   ```

3. 执行恢复并重启
   Execute restore and reboot:
   ```bash
   ssh root@192.168.1.1 "sysupgrade -r /tmp/backup.tar.gz && reboot"
   ```

### 2. 恢复单个配置文件 (高级 / Advanced: Single Config File)

**什么是 `configs/`? / What is `configs/`?**
这是从备份包中自动提取的明文配置文件，对应路由器 `/etc/config/` 目录。
Auto-extracted plain text config files, corresponding to `/etc/config/` on router.

**步骤 / Steps**:
1. 在 GitHub 查看 `configs/` 文件夹，复制所需配置内容
   View `configs/` folder on GitHub, copy desired config content

2. 登录路由器，编辑对应文件
   Login to router, edit corresponding file:
   ```bash
   vi /etc/config/network  # 例如 / e.g., network config
   ```

3. 重启相关服务
   Restart related service:
   ```bash
   /etc/init.d/network restart
   # 或重启系统 / or reboot system
   reboot
   ```

### 3. 查看变更历史 (View Change History)

在 GitHub 仓库中查看 `configs/` 文件夹的提交历史，可以看到每次配置变更的详细 Diff。
View commit history of `configs/` folder on GitHub to see detailed diffs of each config change.

**示例 Commit Message / Example**:
```bash
Update: dhcp, firewall, network, openclash (2025-12-13)
```

点击提交即可查看具体修改了哪些配置项。
Click commit to view specific config changes.
