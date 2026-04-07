# ImmortalWrt GitHub Auto Backup (Legacy Reference)

> Note: this page is kept as a legacy reference for the older SSH + `configs/` snapshot workflow.
> For the current recommended backup and maintenance path, read:
> - `docs/OpenWrt_Backup_Resotre.md`
> - `docs/System_Maintenance.md`

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
