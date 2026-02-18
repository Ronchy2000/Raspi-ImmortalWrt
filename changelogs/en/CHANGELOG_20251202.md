# Maintenance Documentation Restructure - 2025-12-02

## Summary

Consolidated system maintenance notes, monitoring scripts, and troubleshooting experience into a cleaner repository structure.

## Completed Work

### 1) New Documentation

- Added `docs/System_Maintenance.md` (full maintenance guide):
  - system info and baseline configuration
  - automated monitoring overview
  - troubleshooting steps
  - SD card lifetime optimization
  - routine maintenance checklist
  - quick command reference

- Added cleanup guidance document for on-device docs and logs.

### 2) Script Structure Improvements

- Standardized script directory layout:
  - `scripts/README.md`
  - `scripts/health_monitor.sh`
  - `scripts/luci_watchdog.sh`
  - `scripts/smart_backup.sh`

- Improved script documentation:
  - feature descriptions
  - deployment commands
  - troubleshooting references

### 3) Main README Improvements

- Updated version information.
- Reworked monitoring/maintenance section:
  - concise overview table
  - quick command block
  - FAQ-oriented structure

### 4) Smart Backup Upgrade

- Introduced on-demand backup based on real config changes.
- Added config extraction for Git diff and history tracking.
- Added smarter commit-message generation.
- Replaced old backup workflow with `scripts/smart_backup.sh`.

## Before vs After

### Before

- Maintenance knowledge scattered across local device docs and ad-hoc notes.
- Monitoring and backup behavior not clearly centralized.

### After

- Repository became the single source of truth for docs + scripts.
- Runtime system keeps only scripts/logs/state, reducing duplication.
- Deployment and maintenance workflows became more repeatable.

## Core Improvements

1. **Single source of truth**: GitHub repository for documentation and script source.
2. **Structured organization**: clearer separation between docs and runtime artifacts.
3. **Maintainability**: easier updates via pull + redeploy.
4. **Usability**: quick entry points and practical command examples.

## Operational Notes

### Deploy scripts to a new router

```bash
cd Raspi-ImmortalWrt/scripts

# Upload scripts
scp health_monitor.sh luci_watchdog.sh smart_backup.sh root@192.168.1.1:/root/

# Set execute permission
ssh root@192.168.1.1 "chmod +x /root/*.sh"
```

### Check system status

```bash
# Health monitor log
ssh root@192.168.1.1 "tail -50 /root/health_monitor.log"

# LuCI watchdog log
ssh root@192.168.1.1 "tail -50 /root/luci_watchdog.log"

# Backup log
ssh root@192.168.1.1 "tail -50 /root/smart_backup.log"
```

### Optional log maintenance

```bash
# Keep file, clear content
ssh root@192.168.1.1 "> /root/health_monitor.log"
ssh root@192.168.1.1 "> /root/luci_watchdog.log"

# Or keep last 100 lines
ssh root@192.168.1.1 "tail -100 /root/health_monitor.log > /tmp/h.log && mv /tmp/h.log /root/health_monitor.log"
```

## Result

- Documentation is now structured and easier to navigate.
- Monitoring scripts are reusable and easier to deploy.
- Maintenance and troubleshooting workflows are clearer for contributors and users.
