# OpenWrt System Maintenance and Troubleshooting

> **Document Scope**: Daily maintenance, monitoring setup, and troubleshooting practices for Raspberry Pi + ImmortalWrt.

## Table of Contents

- [System Information](#system-information)
- [Automated Monitoring](#automated-monitoring)
- [Troubleshooting](#troubleshooting)
- [SD Card Lifetime Optimization](#sd-card-lifetime-optimization)
- [Routine Maintenance](#routine-maintenance)
- [Quick Reference Commands](#quick-reference-commands)
- [Important Paths](#important-paths)

---

## System Information

### Hardware

- **Device**: Raspberry Pi 4B (`aarch64_cortex-a72`)
- **System**: ImmortalWrt 24.10.3 `r33451-5531f6bc76a3`
- **Memory**: 4GB
- **Storage**: 32GB SD card

### Network

- **LAN IP**: `192.168.1.1`
- **SSH Port**: `22`
- **Web UI**: `http://192.168.1.1`

---

## Automated Monitoring

Three scripts are used to keep the system stable.

### 1. Health Monitor (every 30 minutes)

- **Script**: `/root/health_monitor.sh`
- **Checks**:
  - Memory usage alert (`>90%`)
  - Service status (`openclash`, `uhttpd`, `network`, `dnsmasq`)
  - Connection count alert (`>1000`)
  - Auto-restart if service is unhealthy

Check logs:

```bash
tail -50 /root/health_monitor.log
```

### 2. LuCI Watchdog (every 5 minutes)

- **Script**: `/root/luci_watchdog.sh`
- **Checks**:
  - `uhttpd` process
  - LuCI CGI executable status
  - HTTP response
  - Permission and service auto-fix

Check logs:

```bash
tail -50 /root/luci_watchdog.log
```

### 3. Smart Backup (daily, on-demand backup logic)

- **Script**: `/root/smart_backup.sh`
- **Core features**:
  - Backup only when `/etc/config` changes
  - Extract config files for Git diff/history
  - Auto commit message generation
  - Save both restore package (`.tar.gz`) and plain config snapshot
  - Local and remote retention strategy

Check logs:

```bash
tail -50 /root/smart_backup.log
```

Run backup manually:

```bash
/root/smart_backup.sh
```

### Suggested Scheduling

1. **Crontab**

```bash
# Run smart backup every day at 15:00
0 15 * * * /root/smart_backup.sh
```

2. **Boot-time self-check (`/etc/rc.local`)**

```bash
# Add before exit 0
/root/smart_backup.sh &
```

3. **Inspect current cron jobs**

```bash
crontab -l
```

---

## Troubleshooting

### haproxy Crash Loop

Symptom:

- System log shows `haproxy::instance1 is in a crash loop`

Fix (if you do not need load balancing):

```bash
/etc/init.d/haproxy stop
/etc/init.d/haproxy disable
```

Verify:

```bash
/etc/init.d/haproxy enabled && echo "enabled" || echo "disabled"
```

### Wi-Fi Connected But No Internet

```bash
# 1) Check OpenClash status
/etc/init.d/openclash status

# 2) Restart OpenClash
/etc/init.d/openclash restart

# 3) Test DNS
nslookup google.com

# 4) Check related logs
logread | grep -i "openclash\\|error"
```

### LuCI Web UI Not Accessible

```bash
# 1) Check uhttpd
/etc/init.d/uhttpd status

# 2) Process check
pgrep uhttpd

# 3) LuCI CGI permission
ls -la /www/cgi-bin/luci
chmod +x /www/cgi-bin/luci

# 4) Restart uhttpd
/etc/init.d/uhttpd restart

# 5) Watchdog log
tail -20 /root/luci_watchdog.log
```

### Performance Inspection

```bash
# Uptime and load
uptime

# Memory
free -h

# Disk usage
df -h

# CPU temperature (divide by 1000)
cat /sys/class/thermal/thermal_zone0/temp

# Running services
ls /etc/rc.d/ | grep "^S"

# Recent system logs
logread | tail -50

# Top memory consumers
ps aux | sort -k4 -r | head -10
```

---

## SD Card Lifetime Optimization

### Partition Overview (example)

```
Total:      32GB (29.72 GiB)
Partition1: 64MB   boot
Partition2: 300MB  rootfs (read-only)
Partition3: 10GB   overlay (writable user data)
Unallocated: ~20GB
```

Why only 10GB writable?

- This is a common default layout in ImmortalWrt images.
- It is enough for typical router usage.
- Remaining space is unused until you expand manually.

Expand overlay (if needed):

```bash
# After extending partition 3 with fdisk:
resize2fs /dev/mmcblk0p3
```

### Endurance Estimate

- Typical SD endurance assumption: ~320GB TBW
- Daily writes (optimized): around `65MB/day`
- Estimated lifetime: 10+ years under normal usage

### Optimization Checklist

1. Keep local backup retention small (for example, latest 3 archives).
2. Use tmpfs-based intermediate operations where possible.
3. Avoid unnecessary full reboots; restart services instead.
4. Rotate or trim logs periodically.

Optional log cleanup:

```bash
> /root/health_monitor.log
> /root/luci_watchdog.log
> /root/smart_backup.log
```

---

## Routine Maintenance

### Weekly

```bash
tail -100 /root/health_monitor.log
tail -100 /root/luci_watchdog.log
logread | tail -100
df -h
free -h
/etc/init.d/openclash status
/etc/init.d/uhttpd status
```

### Monthly

```bash
# Check backup repository status
# (replace with your own repo URL)

# Optional log cleanup
> /root/health_monitor.log
> /root/luci_watchdog.log
> /root/smart_backup.log

# Check package updates
opkg update
opkg list-upgradable

# Check uptime
uptime
```

---

## Quick Reference Commands

### Service Management

```bash
# OpenClash
/etc/init.d/openclash start|stop|restart|status

# LuCI
/etc/init.d/uhttpd start|stop|restart|status

# Network
/etc/init.d/network restart

# DNS/DHCP
/etc/init.d/dnsmasq restart
```

### System Operations

```bash
# Reboot
reboot

# Release info
cat /etc/openwrt_release
uname -a

# Network info
ifconfig
ip addr show
```

### Backup Commands

```bash
# Manual backup
/root/smart_backup.sh

# Backup log
tail -50 /root/smart_backup.log
```

---

## Important Paths

```
/root/
├── health_monitor.sh
├── health_monitor.log
├── luci_watchdog.sh
├── luci_watchdog.log
├── smart_backup.sh
├── smart_backup.log
└── immortalwrt-backup/

/etc/
├── config/
├── openclash/
└── init.d/

/var/log/
```

---

## Support

- SSH: `ssh root@192.168.1.1`
- Web UI: `http://192.168.1.1`
- Backup repository: `https://github.com/Ronchy2000/Immortalwrt-AutoBackup`

