# ImmortalWrt Smart Automatic Backup

## Overview

This script set provides a stable daily backup workflow for ImmortalWrt routers:

- Backup only when real config changes are detected
- Keep both restore archives (`.tar.gz`) and extracted config snapshots
- Push backup history to GitHub
- Keep local/remote retention under control

## Why This Approach

- Avoid meaningless duplicate backups
- Keep change history reviewable with Git diff
- Make restore operations faster and more predictable
- Reduce unnecessary SD card writes

## Setup Steps

### 1. Install Dependencies

```bash
opkg update
opkg install git openssh-client openssh-keygen ca-bundle ca-certificates
```

### 2. Configure SSH Key

```bash
# Generate key if not exists
ssh-keygen -t ed25519 -f /root/.ssh/id_ed25519 -N ""

# Add the public key to GitHub
cat /root/.ssh/id_ed25519.pub

# Optional: force SSH over 443 (when port 22 is blocked)
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

# Connection test
ssh -T git@github.com
```

### 3. Deploy Backup Script

```bash
wget -O /root/smart_backup.sh https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/master/scripts/smart_backup.sh
chmod +x /root/smart_backup.sh
vi /root/smart_backup.sh
```

Main config fields:

```bash
GIT_REMOTE="git@github.com:YOUR_USERNAME/YOUR_BACKUP_REPO.git"
BRANCH="master"
BACKUP_DIR="/root/immortalwrt-backup"
MAX_LOCAL_BACKUPS=3
MAX_REMOTE_BACKUPS=30
```

### 4. Configure Cron

```bash
# Run every day at 15:00
echo "0 15 * * * /root/smart_backup.sh >> /root/smart_backup.log 2>&1" >> /etc/crontabs/root
/etc/init.d/cron restart
```

### 5. Optional Boot Auto-Run

```bash
vi /etc/rc.local
# Add before exit 0:
/root/smart_backup.sh &
exit 0
```

## Logs and Status

```bash
# Backup log
tail -n 50 /root/smart_backup.log

# Cron entries
crontab -l

# Manual test
/root/smart_backup.sh
```

## Restore

### 1) Full Restore via `.tar.gz`

Use LuCI:

- **System** -> **Backup / Flash Firmware** -> **Restore backup**

Or via CLI:

```bash
sysupgrade -r backup_YYYYMMDD_HHMMSS.tar.gz
reboot
```

### 2) Restore a Single Config File

If only one config is broken (for example `network`), copy the target file from repository `configs/` and overwrite:

```bash
vi /etc/config/network
/etc/init.d/network restart
```

### 3) Review Change History

```bash
cd /root/immortalwrt-backup
git log --oneline configs/network
git show <commit>:configs/network
```

## FAQ

### Why no new backup was pushed?

The script skips backup when no effective config change is detected. This is expected behavior.

### Push failed (network/SSH)?

Check:

- SSH key and `~/.ssh/config`
- connectivity to GitHub (`ssh -T git@github.com`)
- repository permissions and remote URL

### Can I force a backup?

Yes, run manually:

```bash
/root/smart_backup.sh
```
