<a id="chinese"></a>
[🇨🇳 中文文档](#chinese) | [🇺🇸 English](#english)

# ImmortalWrt 智能自动备份 (Smart Backup)

## 概览

**脚本功能**:
- 智能检测配置变化，只在配置修改时执行备份
- 同时保存完整备份包和配置文件，便于恢复和追踪变更
- 自动管理本地和远程备份数量
- 内置稳定性检查，确保系统就绪后再执行备份

**运行方式**:
- 每天 15:00 定时执行
- 开机后自动检查并补跑（如有遗漏）

**保留策略**:
- 本地: 3 个备份
- GitHub: 30 个备份

## 备份文件说明

### tar.gz 压缩包 (用于系统恢复)
- **文件名**: `backup_20231213_150023.tar.gz`
- **内容**: 完整的系统配置备份（sysupgrade 格式）
- **用途**: 
  - LuCI 恢复: **系统** → **备份/升级** → **恢复备份**
  - 命令行恢复: `sysupgrade -r backup_20231213_150023.tar.gz`
  - **这是你恢复系统的主要文件**
- **位置**: GitHub 仓库根目录

### configs/ 文件夹 (用于查看变更)
- **内容**: 从 tar.gz 解压出的 `/etc/config/` 配置文件
- **用途**: 
  - 在 GitHub 上查看每次修改了什么
  - Git Diff 高亮显示具体改动
  - 追溯历史配置
- **示例**: `configs/network`, `configs/wireless`, `configs/firewall`
- **注意**: 不能单独用于恢复，只是辅助查看

### 文件对应关系
```
备份仓库/
├── backup_20231213_150023.tar.gz  ← 完整备份包 (用于恢复)
├── configs/                        ← 配置文件夹 (用于查看)
│   ├── network                    ← /etc/config/network 副本
│   ├── wireless                   ← /etc/config/wireless 副本
│   ├── firewall                   ← /etc/config/firewall 副本
│   └── ...
```

**简单理解**: tar.gz 是"完整压缩包"，configs/ 是"解压预览版"

## 部署步骤

### 1. 安装依赖

```bash
opkg update
opkg install git openssh-client openssh-keygen ca-bundle ca-certificates
```

### 2. 生成 SSH 密钥

```bash
ssh-keygen -t ed25519 -f /root/.ssh/id_ed25519 -N ""
cat /root/.ssh/id_ed25519.pub   # 复制公钥到 GitHub → Settings → SSH and GPG keys
ssh -T git@github.com           # 测试连接
ssh -T -p 443 git@ssh.github.com   # 若 22 端口被封
```

### 3. 配置 SSH（使用 443 端口）

```bash
cat > /root/.ssh/config <<'EOF'
Host github.com
  HostName ssh.github.com
  Port 443
  User git
  IdentityFile ~/.ssh/id_ed25519
  StrictHostKeyChecking accept-new
EOF

chmod 600 /root/.ssh/config
chmod 700 /root/.ssh
chmod 600 /root/.ssh/id_ed25519
chmod 644 /root/.ssh/id_ed25519.pub
```

### 4. 部署备份脚本

```bash
# 下载脚本
wget -O /root/smart_backup.sh https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/master/scripts/smart_backup.sh
chmod +x /root/smart_backup.sh

# 编辑配置（必须修改）
vi /root/smart_backup.sh
```

**必须修改的配置项**:
```bash
# 修改为你的 GitHub 备份仓库地址
GIT_REMOTE="git@github.com:YOUR_USERNAME/YOUR_BACKUP_REPO.git"

# 可选：修改本地备份目录
BACKUP_DIR="/root/Immortalwrt-AutoBackup"

# 可选：调整备份保留数量
MAX_LOCAL_BACKUPS=3    # 本地保留数量
MAX_REMOTE_BACKUPS=30  # GitHub 保留数量
```

### 5. 配置定时任务（每天 15:00）

```bash
echo "0 15 * * * /root/smart_backup.sh >> /root/smart_backup.log 2>&1" >> /etc/crontabs/root
/etc/init.d/cron restart
```

### 6. 配置开机自检（可选）

```bash
vi /etc/rc.local
# 在 exit 0 之前添加：
/root/smart_backup.sh &
exit 0
```

## 如何恢复备份

### 方法一：LuCI Web 界面（推荐）

1. 从 GitHub 仓库下载 `backup_YYYYMMDD_HHMMSS.tar.gz` 文件
2. 登录路由器管理界面（默认 http://192.168.1.1）
3. 进入 **系统** → **备份/升级** → **恢复备份**
4. 选择下载的 tar.gz 文件并上传
5. 等待系统自动重启

### 方法二：SSH 命令行

```bash
# 下载备份到路由器
cd /tmp
wget https://github.com/用户名/仓库/raw/master/backup_20231213_150023.tar.gz

# 恢复配置
sysupgrade -r backup_20231213_150023.tar.gz
reboot
```

### 方法三：恢复历史版本

```bash
# SSH 登录路由器
ssh root@192.168.1.1
cd /root/Immortalwrt-AutoBackup

# 查看历史记录
git log --oneline --all
# 输出:
# abc1234 Update: network, wireless (2023-12-13)
# def5678 Update: firewall (2023-12-10)

# 恢复到指定版本
git checkout abc1234
sysupgrade -r backup_20231213_150023.tar.gz
```

## 查看配置变更历史

### 在 GitHub 网页查看
1. 打开你的备份仓库
2. 进入 `configs/` 文件夹
3. 点击任意配置文件（如 `network`）
4. 点击 **History** 查看修改历史和差异对比

### 通过 Git 命令查看
```bash
cd /root/Immortalwrt-AutoBackup

# 查看某个配置文件的修改历史
git log --oneline configs/network

# 查看具体某次修改内容
git show abc1234:configs/network

# 比较两个版本差异
git diff abc1234 def5678 -- configs/network
```

## 验证和测试

### 手动运行测试
```bash
/root/smart_backup.sh              # 手动执行一次
tail -n 50 /root/smart_backup.log  # 查看日志输出
```

### 常见问题

**推送失败，SSH 连接超时**
```bash
ssh -T git@github.com              # 测试 GitHub 连接
cat /root/.ssh/config              # 检查 SSH 配置
```

**日志显示"无变更"，没有生成备份**

这是正常现象。脚本采用智能检测机制，只在配置实际发生变化时才执行备份。修改任意配置文件后重新运行即可触发备份。

**强制执行备份（忽略变更检测）**
```bash
cd /root/Immortalwrt-AutoBackup
rm -rf configs/ .git
/root/smart_backup.sh
```

## 日志示例

**成功备份**:
```
[2023-12-13 15:00:01] ========== Starting Smart Backup ==========
[2023-12-13 15:00:01] System uptime is sufficient (>10m).
[2023-12-13 15:00:01] Network is UP.
[2023-12-13 15:00:12] Configuration changes detected!
[2023-12-13 15:00:12] Generated Commit Message: Update: network, wireless (2023-12-13)
[2023-12-13 15:00:18] Backup successfully pushed.
```

**无变更**:
```
[2023-12-13 15:00:10] No configuration changes detected in /etc/config.
[2023-12-13 15:00:10] Skipping backup push.
```

## 注意事项

1. **恢复系统**：必须使用 tar.gz 压缩包，configs/ 文件夹仅用于查看变更
2. **恢复前备份**：恢复旧配置前建议先备份当前配置
3. **版本兼容性**：确保备份的系统版本与当前系统版本兼容
4. **大文件管理**：OpenClash 等应用的大文件（规则、数据库）会占用较多空间

---

<a id="english"></a>
[🇨🇳 中文文档](#chinese) | [🇺🇸 English](#english)

# 🌐 ImmortalWrt → Smart Automatic Backup

## Overview
- **Script**: `/root/smart_backup.sh`
- **Schedule**: Daily at **15:00**
- **Logic**: **On-demand backup** - only when config changes
- **Dual storage**: 
  - **tar.gz archives**: For system restore
  - **configs/ folder**: For viewing change history
- **Retention**: Local **3**, Remote **30** tar.gz files
- **Stability checks**: Uptime (>10min), time sync, network

## Backup Files

### 📦 tar.gz Archive (For System Restore)
- **Filename**: `backup_20231213_150023.tar.gz`
- **Content**: Complete system backup (sysupgrade format)
- **Usage**: 
  - LuCI: **System** → **Backup/Flash Firmware** → **Restore backup**
  - CLI: `sysupgrade -r backup_20231213_150023.tar.gz`
- **Location**: GitHub repo root

### 📁 configs/ Folder (For Viewing Changes)
- **Content**: Extracted `/etc/config/` files from tar.gz
- **Usage**: 
  - View changes on GitHub
  - Git Diff highlights modifications
  - Track configuration history
- **Note**: **Cannot be used alone for restore**

## Setup

### 1. Install Dependencies
```bash
opkg update
opkg install git openssh-client openssh-keygen ca-bundle ca-certificates
```

### 2. Generate SSH Key
```bash
ssh-keygen -t ed25519 -f /root/.ssh/id_ed25519 -N ""
cat /root/.ssh/id_ed25519.pub   # Add to GitHub SSH keys
ssh -T git@github.com
```

### 3. Configure SSH (Port 443)
```bash
cat > /root/.ssh/config <<'EOF'
Host github.com
  HostName ssh.github.com
  Port 443
  User git
  IdentityFile ~/.ssh/id_ed25519
  StrictHostKeyChecking accept-new
EOF
chmod 600 /root/.ssh/config
```

### 4. Deploy Script
```bash
wget -O /root/smart_backup.sh https://raw.githubusercontent.com/YOUR_USER/REPO/master/scripts/smart_backup.sh
chmod +x /root/smart_backup.sh
# Edit: BACKUP_DIR and GIT_REMOTE
vi /root/smart_backup.sh
```

### 5. Schedule (15:00 Daily)
```bash
echo "0 15 * * * /root/smart_backup.sh >> /root/smart_backup.log 2>&1" >> /etc/crontabs/root
/etc/init.d/cron restart
```

## Restore Backup

### Via LuCI
1. Download `backup_YYYYMMDD_HHMMSS.tar.gz` from GitHub
2. Login to router: http://192.168.1.1
3. **System** → **Backup/Flash Firmware** → **Restore backup**
4. Upload and wait for reboot

### Via SSH
```bash
cd /tmp
wget https://github.com/USER/REPO/raw/master/backup_20231213_150023.tar.gz
sysupgrade -r backup_20231213_150023.tar.gz
reboot
```

## View Changes

### On GitHub
1. Open backup repository
2. Navigate to `configs/` folder
3. Click any file (e.g., `network`)
4. Click **History** to view changes

### Via Git
```bash
cd /root/Immortalwrt-AutoBackup
git log --oneline configs/network
git show abc1234:configs/network
git diff abc1234 def5678 -- configs/network
```

## Notes
- **tar.gz restores system**: configs/ is only for preview
- **Backup before restore**: Always backup current config first
- **Check compatibility**: Ensure backup version matches system
- **Large files separate**: Manage OpenClash configs separately
