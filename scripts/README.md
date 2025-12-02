# 系统监控与维护脚本

本目录包含OpenWrt系统的自动化监控和维护脚本。

## 📋 脚本列表

### 1. health_monitor.sh - 系统健康监控
**功能**: 监控系统健康状态，自动处理异常

**监控项目**:
- 内存使用率 (>90% 告警)
- 关键服务状态 (openclash, uhttpd, network, dnsmasq)
- 网络连接数 (>1000 告警)
- 服务异常自动重启

**运行频率**: 每 30 分钟  
**日志位置**: `/root/health_monitor.log`

**部署命令**:
```bash
# 复制到路由器
scp health_monitor.sh root@192.168.1.1:/root/
ssh root@192.168.1.1 "chmod +x /root/health_monitor.sh"

# 添加到 crontab
ssh root@192.168.1.1 "crontab -l | grep -v health_monitor; echo '*/30 * * * * /root/health_monitor.sh' | crontab -"
```

---

### 2. luci_watchdog.sh - LuCI 看门狗
**功能**: 监控和自动修复 LuCI Web 界面问题

**监控项目**:
- uhttpd 进程状态
- LuCI CGI 可执行性检查
- HTTP 响应测试
- 权限自动修复

**运行频率**: 每 5 分钟  
**日志位置**: `/root/luci_watchdog.log`

**部署命令**:
```bash
# 复制到路由器
scp luci_watchdog.sh root@192.168.1.1:/root/
ssh root@192.168.1.1 "chmod +x /root/luci_watchdog.sh"

# 添加到 crontab
ssh root@192.168.1.1 "crontab -l | grep -v luci_watchdog; echo '*/5 * * * * /root/luci_watchdog.sh' | crontab -"
```

---

### 3. github_backup_optimized.sh - 优化备份脚本
**功能**: 自动备份系统配置到 GitHub

**优化特性**:
- 使用 tmpfs 减少 SD 卡写入
- 本地仅保留最新 3 份备份
- GitHub 远程保留 30 天
- 失败自动重试 (最多3次)
- 备份状态记录

**运行频率**: 每天 15:00  
**日志位置**: `/root/github_backup.log`  
**状态文件**: `/root/github_backup_state.json`

**部署命令**:
```bash
# 复制到路由器
scp github_backup_optimized.sh root@192.168.1.1:/root/
ssh root@192.168.1.1 "chmod +x /root/github_backup_optimized.sh"

# 添加到 crontab
ssh root@192.168.1.1 "crontab -l | grep -v github_backup; echo '0 15 * * * /root/github_backup_optimized.sh cron >> /root/github_backup.log 2>&1' | crontab -"
```

**手动运行**:
```bash
# 测试模式
ssh root@192.168.1.1 "/root/github_backup_optimized.sh test"

# 手动备份
ssh root@192.168.1.1 "/root/github_backup_optimized.sh manual"
```

---

## 🚀 一键部署所有脚本

```bash
#!/bin/bash
# 一键部署所有监控脚本到OpenWrt

ROUTER_IP="192.168.1.1"
ROUTER_USER="root"

# 复制脚本
scp health_monitor.sh ${ROUTER_USER}@${ROUTER_IP}:/root/
scp luci_watchdog.sh ${ROUTER_USER}@${ROUTER_IP}:/root/
scp github_backup_optimized.sh ${ROUTER_USER}@${ROUTER_IP}:/root/

# 设置权限
ssh ${ROUTER_USER}@${ROUTER_IP} "chmod +x /root/*.sh"

# 配置定时任务
ssh ${ROUTER_USER}@${ROUTER_IP} << 'EOF'
# 备份当前 crontab
crontab -l > /tmp/crontab.bak 2>/dev/null || true

# 删除旧的监控任务
crontab -l 2>/dev/null | grep -v "health_monitor\|luci_watchdog\|github_backup" > /tmp/crontab.new || true

# 添加新任务
cat >> /tmp/crontab.new << 'CRON'
# 系统监控脚本
*/30 * * * * /root/health_monitor.sh
*/5 * * * * /root/luci_watchdog.sh
0 15 * * * /root/github_backup_optimized.sh cron >> /root/github_backup.log 2>&1
CRON

# 应用新的 crontab
crontab /tmp/crontab.new
rm /tmp/crontab.new

echo "✅ 所有脚本已部署并配置定时任务"
crontab -l | grep -E "health_monitor|luci_watchdog|github_backup"
EOF
```

---

## 📊 查看监控状态

### 查看所有日志
```bash
ssh root@192.168.1.1 "tail -50 /root/health_monitor.log"
ssh root@192.168.1.1 "tail -50 /root/luci_watchdog.log"
ssh root@192.168.1.1 "tail -50 /root/github_backup.log"
```

### 查看定时任务
```bash
ssh root@192.168.1.1 "crontab -l"
```

### 查看备份状态
```bash
ssh root@192.168.1.1 "cat /root/github_backup_state.json"
ssh root@192.168.1.1 "ls -lh /root/immortalwrt-backup/*.tar.gz"
```

---

## ⚙️ 脚本配置说明

### 修改监控阈值

编辑 `health_monitor.sh`:
```bash
# 内存告警阈值 (默认90%)
MEM_PERCENT -gt 90

# 连接数告警阈值 (默认1000)
CONN_COUNT -gt 1000

# 监控的服务列表
for service in openclash uhttpd network dnsmasq; do
```

### 修改备份保留策略

编辑 `github_backup_optimized.sh`:
```bash
# 本地保留份数 (默认3)
LOCAL_KEEP=3

# GitHub保留天数 (默认30)
REMOTE_DAYS=30

# 重试次数 (默认3)
MAX_RETRIES=3
```

---

## 🔍 故障排查

### 脚本未运行
```bash
# 检查脚本权限
ssh root@192.168.1.1 "ls -l /root/*.sh"

# 检查 cron 服务
ssh root@192.168.1.1 "/etc/init.d/cron status"

# 重启 cron
ssh root@192.168.1.1 "/etc/init.d/cron restart"
```

### 备份失败
```bash
# 查看详细日志
ssh root@192.168.1.1 "tail -100 /root/github_backup.log"

# 检查 Git 配置
ssh root@192.168.1.1 "cd /root/immortalwrt-backup && git remote -v"

# 手动测试备份
ssh root@192.168.1.1 "/root/github_backup_optimized.sh test"
```

---

## 📚 相关文档

- [系统维护文档](../docs/System_Maintenance.md)
- [自动备份配置](../docs/OpenWrt_AutoBackup.md)
- [主README](../README.md)

---

**最后更新**: 2025年12月2日
