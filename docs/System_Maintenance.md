# OpenWrt 系统维护与故障排查

> **文档说明**: 本文档记录树莓派 OpenWrt 软路由的日常维护、监控配置和故障排查方法。

## 📋 目录

- [系统信息](#系统信息)
- [自动化监控](#自动化监控)
- [故障排查](#故障排查)
- [SD卡寿命优化](#sd卡寿命优化)
- [日常维护](#日常维护)

---

## 系统信息

### 硬件配置
- **设备**: 树莓派 4B (aarch64_cortex-a72)
- **系统**: ImmortalWrt 24.10.3 r33451-5531f6bc76a3
- **内存**: 4GB
- **存储**: 32GB SD卡 (10GB分区)

### 网络配置
- **IP地址**: 192.168.1.1
- **SSH端口**: 22
- **Web管理**: http://192.168.1.1

---

## 自动化监控

系统已配置三个自动化监控脚本，确保系统稳定运行。

### 1. 健康监控 (每30分钟)

**脚本位置**: `/root/health_monitor.sh`

**监控内容**:
- 内存使用率 (>90% 告警)
- 关键服务状态 (openclash, uhttpd, network, dnsmasq)
- 网络连接数 (>1000 告警)
- 服务异常自动重启

**查看日志**:
```bash
tail -50 /root/health_monitor.log
```

### 2. LuCI看门狗 (每5分钟)

**脚本位置**: `/root/luci_watchdog.sh`

**监控内容**:
- uhttpd 进程状态
- LuCI CGI 可执行性
- HTTP 响应测试
- 权限和服务自动修复

**查看日志**:
```bash
tail -50 /root/luci_watchdog.log
```

### 3. 智能备份 (Smart Backup)

**脚本位置**: `/root/smart_backup.sh` (替代旧版 `github_backup_optimized.sh`)

**核心特性**:
- **按需备份**: 智能识别 `/etc/config` 变更，无修改不备份。
- **变更追踪**: 自动提取配置文件到 Git，实现代码级的配置版本管理。
- **语义化提交**: 自动生成 Commit Message (如 `Update: network, wireless`)。
- **双重存档**: 同时保存 `sysupgrade` 恢复包 (tar.gz) 和明文配置 (configs/)。

**工作流程**:
1. **稳定性检查**:
    - **运行时间**: 检查系统运行时间，若不足 10 分钟则自动等待，确保系统完全启动且稳定。
    - **时间同步**: 检查系统时间是否准确 (NTP)。
    - **网络连通**: 检查互联网连接 (Ping 8.8.8.8/223.5.5.5)，自动重试直到连通。
2. **生成备份**: 生成备份到内存 (`/tmp`)。
3. **差异比对**: 解压并比对配置差异。
4. **执行备份**:
    - 若有变更: 提交 Git (包含变更列表) -> 推送 GitHub。
    - 若无变更: 跳过，节省空间。
5. **保留策略**:
    - 本地: 保留最近 3 份 `.tar.gz`。
    - 远程 (GitHub): 保留最近 30 份 `.tar.gz`，配置文件永久保留历史记录。

**查看日志**:
```bash
tail -50 /root/smart_backup.log
```

**手动备份**:
```bash
/root/smart_backup.sh
```

### 定时任务配置

建议配置在每天下午 15:00 执行。脚本内置了稳定性检查，即使开机时间晚于 15:00 (通过开机自启触发) 或网络不稳定，脚本也会自动等待直到系统就绪。

1. **Crontab (定时任务)**:
```bash
# 每天 15:00 执行智能备份
0 15 * * * /root/smart_backup.sh
```

2. **开机自检 (rc.local)**:
为了防止 15:00 关机导致错过备份，建议在 `/etc/rc.local` 中添加启动执行。脚本会自动判断运行时间，不足 10 分钟会等待。
```bash
# 在 exit 0 之前添加
/root/smart_backup.sh &
```
# 每天 15:00 执行智能备份
0 15 * * * /root/smart_backup.sh
```

2. **开机自检 (rc.local)**:
为了防止 15:00 关机导致错过备份，建议在 `/etc/rc.local` 中添加启动执行。脚本内置了变更检测，即使多次运行也不会产生重复备份。
```bash
# 在 exit 0 之前添加
/root/smart_backup.sh &
```
# 查看所有定时任务
crontab -l

# 主要定时任务列表
0 15 * * * /root/github_backup.sh cron >> /root/github_backup.log 2>&1  # 每天15:00备份
*/30 * * * * /root/health_monitor.sh      # 每30分钟健康检查
*/5 * * * * /root/luci_watchdog.sh        # 每5分钟LuCI看门狗

# OpenClash自动更新
0 3 * * 5 /usr/share/openclash/openclash_rule.sh         # 每周五03:00更新规则
0 3 * * 1 /usr/share/openclash/openclash_ipdb.sh         # 每周一03:00更新IP库
0 0 * * 1 /usr/share/openclash/openclash_geosite.sh      # 每周一00:00更新GeoSite
0 0 * * 1 /usr/share/openclash/openclash_geoip.sh        # 每周一00:00更新GeoIP
0 4 * * 2 /usr/share/openclash/openclash_chnroute.sh     # 每周二04:00更新中国路由
```

---

## 故障排查

### haproxy 崩溃循环问题 ⚠️

**症状**: 系统日志显示 `haproxy::instance1 is in a crash loop`

**原因**: haproxy 默认配置中的后端服务器地址不存在，导致服务不断重启。

**解决方案** (如果不需要负载均衡):
```bash
# 停止并禁用 haproxy
/etc/init.d/haproxy stop
/etc/init.d/haproxy disable

# 验证状态
/etc/init.d/haproxy enabled && echo "已启用" || echo "已禁用"
```

### WiFi 连接但无网络

**排查步骤**:
```bash
# 1. 检查 OpenClash 状态
/etc/init.d/openclash status

# 2. 重启 OpenClash
/etc/init.d/openclash restart

# 3. 检查 DNS
nslookup google.com

# 4. 查看日志
logread | grep -i "openclash\|error"
```

### LuCI 无法访问

**排查步骤**:
```bash
# 1. 检查 uhttpd 状态
/etc/init.d/uhttpd status

# 2. 检查进程
pgrep uhttpd

# 3. 检查 CGI 权限
ls -la /www/cgi-bin/luci
chmod +x /www/cgi-bin/luci  # 如果不可执行

# 4. 重启 uhttpd
/etc/init.d/uhttpd restart

# 5. 查看看门狗日志
tail -20 /root/luci_watchdog.log
```

### 系统性能检查

```bash
# 查看运行时间和负载
uptime

# 查看内存使用
free -h

# 查看磁盘空间
df -h

# 查看 CPU 温度 (除以1000得摄氏度)
cat /sys/class/thermal/thermal_zone0/temp

# 查看运行的服务
ls /etc/rc.d/ | grep "^S"

# 查看系统日志
logread | tail -50

# 查看进程列表
ps aux | sort -k4 -r | head -10
```

### 内存不足

```bash
# 查看内存占用最高的进程
ps aux | sort -k4 -r | head -10

# 释放缓存 (临时)
echo 3 > /proc/sys/vm/drop_caches

# 重启占用内存大的服务
/etc/init.d/openclash restart
```

---

## SD卡寿命优化

### 空间分配说明

你的 32GB SD卡空间分配:
```
总容量:   32GB (29.72 GiB)
分区1:    64MB   (boot分区)
分区2:    300MB  (rootfs 只读系统)
分区3:    10GB   (overlay 数据分区) ← 用户数据在这里
未分配:   ~20GB  (安装时未使用)
```

**为什么只有10GB可用?**
- 这是 ImmortalWrt 安装时的默认分区策略
- 10GB 足够日常使用 (目前仅用11%)
- 剩余20GB未分配，不影响功能

**如需扩容**:
```bash
# 使用 fdisk 扩展分区3，然后
resize2fs /dev/mmcblk0p3
```

### 写入寿命评估

**SD卡耐久性**: 典型320GB TBW (Total Bytes Written)

**优化前**:
- 每天写入: ~71MB (备份21MB + 系统50MB)
- 年写入量: 25.9GB
- 预计寿命: 12.4年 ✓

**优化后**:
- 每天写入: ~65MB (优化备份策略)
- 年写入量: 23.7GB
- 预计寿命: 13.5年 ✓✓

### 优化措施

1. **备份策略优化**
   - 本地保留: 7天 → 3份最新 (节省58%)
   - 使用 tmpfs 减少 SD 卡写入
   - GitHub 远程30天备份不变

2. **日志管理** (可选)
   ```bash
   # 限制日志大小
   logread -S 256
   
   # 清理旧日志
   > /root/health_monitor.log
   > /root/luci_watchdog.log
   ```

3. **避免频繁重启**
   - 每次重启都有大量写入
   - 使用服务重启代替系统重启

### 数据安全

✅ 本地: 3个最新备份 (~62MB)  
✅ GitHub: 30天历史备份  
✅ 自动化: 每天15:00自动备份  
✅ 日志: 所有操作都有记录

**验证备份**:
```bash
# 查看本地备份
ls -lh /root/immortalwrt-backup/*.tar.gz

# 查看备份空间
du -sh /root/immortalwrt-backup/

# 查看 SD 卡使用
df -h /overlay
```

---

## 日常维护

### 每周检查

```bash
# 查看监控日志
tail -100 /root/health_monitor.log

# 查看系统日志
logread | tail -100

# 检查磁盘空间
df -h

# 检查内存使用
free -h

# 检查服务状态
/etc/init.d/openclash status
/etc/init.d/uhttpd status
```

### 每月维护

```bash
# 1. 验证备份
# 访问 GitHub 仓库: https://github.com/ronchy2000/immortalwrt-backup

# 2. 清理日志 (可选)
> /root/health_monitor.log
> /root/luci_watchdog.log
> /root/github_backup.log

# 3. 检查系统更新
opkg update
opkg list-upgradable

# 4. 查看系统运行时间
uptime
```

### 重要提醒

**不要做**:
- ❌ 不要启用 haproxy (除非需要负载均衡)
- ❌ 不要删除监控脚本
- ❌ 不要随意修改 OpenClash 配置
- ❌ 不要频繁重启系统

**推荐做**:
- ✅ 定期查看监控日志
- ✅ 保持备份正常运行
- ✅ 遇到问题先查日志
- ✅ 使用服务重启而非系统重启

---

## 快速参考命令

### 服务管理
```bash
# OpenClash
/etc/init.d/openclash start|stop|restart|status

# LuCI Web界面
/etc/init.d/uhttpd start|stop|restart|status

# 网络服务
/etc/init.d/network restart

# DNS/DHCP
/etc/init.d/dnsmasq restart
```

### 系统操作
```bash
# 重启系统
reboot

# 查看系统信息
cat /etc/openwrt_release
uname -a

# 查看网络配置
ifconfig
ip addr show
```

### 备份相关
```bash
# 手动备份
/root/github_backup.sh manual

# 查看备份状态
cat /root/github_backup_state.json

# 查看备份日志
tail -50 /root/github_backup.log
```

---

## 重要文件位置

```
/root/
├── health_monitor.sh              # 健康监控脚本
├── health_monitor.log             # 监控日志
├── luci_watchdog.sh               # LuCI看门狗
├── luci_watchdog.log              # 看门狗日志
├── github_backup_optimized.sh     # 优化备份脚本
├── github_backup.log              # 备份日志
├── github_backup_state.json       # 备份状态
├── immortalwrt-backup/            # Git备份仓库
├── QUICK_REFERENCE.txt            # 快速参考 (系统内)
├── SD_CARD_OPTIMIZATION_SUMMARY.txt  # SD卡优化说明 (系统内)
└── SYSTEM_MAINTENANCE_LOG.md      # 维护日志 (系统内)

/etc/
├── config/                        # 系统配置
├── openclash/                     # OpenClash配置
└── init.d/                        # 服务脚本

/var/log/                          # 系统日志目录
```

---

## 联系和支持

- **SSH登录**: `ssh root@192.168.1.1`
- **密码**: lrq200075
- **Web管理**: http://192.168.1.1
- **备份仓库**: https://github.com/ronchy2000/immortalwrt-backup

---

**文档版本**: v1.0  
**创建日期**: 2025年12月2日  
**最后更新**: 2025年12月2日  
**维护者**: ronchy2000
# 系统文档整理建议

## 当前状况

系统中存在多个文档文件，部分内容重复，建议进行整理。

### 系统中的文档文件

```
/root/
├── QUICK_REFERENCE.txt                   # 2.2KB - 快速参考
├── SD_CARD_OPTIMIZATION_SUMMARY.txt      # 4.1KB - SD卡优化说明
├── SYSTEM_MAINTENANCE_LOG.md             # 10.0KB - 维护日志
├── health_monitor.log                    # 监控日志
├── luci_watchdog.log                     # 看门狗日志
└── github_backup.log                     # 备份日志
```

## 整理方案

### 保留的文件 (系统中)

**运行脚本** (必须保留):
- `/root/health_monitor.sh`
- `/root/luci_watchdog.sh`
- `/root/github_backup_optimized.sh`
- `/root/github_backup.sh` (兼容性)

**日志文件** (自动生成，定期清理):
- `/root/health_monitor.log`
- `/root/luci_watchdog.log`  
- `/root/github_backup.log`

**状态文件**:
- `/root/github_backup_state.json`

**快速参考** (可选保留):
- `/root/QUICK_REFERENCE.txt` - 方便SSH后快速查看

### 可以删除或合并的文档

这些文档的内容已整理到项目中，系统中可以删除：

```bash
# 连接到路由器
ssh root@192.168.1.1

# 备份后删除
mkdir -p /root/docs_archive
mv /root/SD_CARD_OPTIMIZATION_SUMMARY.txt /root/docs_archive/
mv /root/SYSTEM_MAINTENANCE_LOG.md /root/docs_archive/

# 或直接删除 (内容已保存到GitHub项目)
rm /root/SD_CARD_OPTIMIZATION_SUMMARY.txt
rm /root/SYSTEM_MAINTENANCE_LOG.md
```

## 优化后的文档结构

### 项目中 (GitHub)

```
Raspi-ImmortalWrt/
├── README.md                          # 主文档 + 快速参考
├── docs/
│   ├── System_Maintenance.md         # 系统维护完整文档 (NEW)
│   ├── OpenWrt_AutoBackup.md         # 自动备份配置
│   ├── OpenWrt_Backup&Resotre.md     # 手动备份恢复
│   ├── PPPoE_Connection.md           # 拨号配置
│   ├── ExtendOverlaySize.md          # 空间扩容
│   ├── Write_Image.md                # 烧录教程
│   └── Openclash_Config.md           # OpenClash配置
└── scripts/
    ├── README.md                      # 脚本说明 (NEW)
    ├── health_monitor.sh              # 健康监控 (NEW)
    ├── luci_watchdog.sh               # LuCI看门狗 (NEW)
    └── github_backup_optimized.sh     # 优化备份 (NEW)
```

### 系统中 (OpenWrt)

```
/root/
├── 运行脚本/
│   ├── health_monitor.sh              # 从项目部署
│   ├── luci_watchdog.sh               # 从项目部署
│   ├── github_backup_optimized.sh     # 从项目部署
│   └── github_backup.sh               # 兼容性保留
├── 日志文件/
│   ├── health_monitor.log
│   ├── luci_watchdog.log
│   └── github_backup.log
├── 状态文件/
│   └── github_backup_state.json
└── 快速参考/ (可选)
    └── QUICK_REFERENCE.txt            # SSH后快速查看
```

## 执行整理

### 方案1: 保守整理 (推荐)

保留快速参考，删除其他文档：

```bash
ssh root@192.168.1.1 << 'EOF'
# 创建归档目录
mkdir -p /root/docs_archive

# 移动到归档 (不删除，以防万一)
mv /root/SD_CARD_OPTIMIZATION_SUMMARY.txt /root/docs_archive/ 2>/dev/null
mv /root/SYSTEM_MAINTENANCE_LOG.md /root/docs_archive/ 2>/dev/null

# 保留 QUICK_REFERENCE.txt 在 /root/

echo "✅ 文档已归档到 /root/docs_archive/"
ls -lh /root/docs_archive/
EOF
```

### 方案2: 彻底清理

删除所有文档，只保留脚本和日志：

```bash
ssh root@192.168.1.1 << 'EOF'
# 删除文档 (内容已在GitHub项目中)
rm -f /root/QUICK_REFERENCE.txt
rm -f /root/SD_CARD_OPTIMIZATION_SUMMARY.txt  
rm -f /root/SYSTEM_MAINTENANCE_LOG.md

echo "✅ 系统文档已清理"
echo "📚 完整文档见项目: https://github.com/ronchy2000/Raspi-ImmortalWrt"
EOF
```

## 日志维护

定期清理日志文件，保持系统整洁：

```bash
# 手动清理
ssh root@192.168.1.1 << 'EOF'
# 清空日志 (保留文件)
> /root/health_monitor.log
> /root/luci_watchdog.log
> /root/github_backup.log

# 或者保留最近100行
tail -100 /root/health_monitor.log > /tmp/health.log && mv /tmp/health.log /root/health_monitor.log
tail -100 /root/luci_watchdog.log > /tmp/luci.log && mv /tmp/luci.log /root/luci_watchdog.log
tail -100 /root/github_backup.log > /tmp/backup.log && mv /tmp/backup.log /root/github_backup.log

echo "✅ 日志已清理"
EOF
```

### 自动日志清理 (可选)

添加到 crontab，每月自动清理：

```bash
# 每月1号 凌晨2点清理日志
0 2 1 * * tail -100 /root/health_monitor.log > /tmp/health.log && mv /tmp/health.log /root/health_monitor.log
0 2 1 * * tail -100 /root/luci_watchdog.log > /tmp/luci.log && mv /tmp/luci.log /root/luci_watchdog.log  
0 2 1 * * tail -100 /root/github_backup.log > /tmp/backup.log && mv /tmp/backup.log /root/github_backup.log
```

## 文档维护原则

### 单一信息源

- ✅ **项目 (GitHub)**: 完整文档、配置说明、脚本源码
- ✅ **系统 (OpenWrt)**: 运行脚本、日志、状态文件
- ❌ **避免**: 在系统中保存大量静态文档

### 优势

1. **版本控制**: GitHub 提供版本历史
2. **备份安全**: 项目代码永久保存
3. **易于更新**: 修改项目后重新部署脚本
4. **减少写入**: 系统中只保留必要文件
5. **便于维护**: 一处更新，随时部署

## 推荐流程

1. **查文档**: 优先查看 GitHub 项目
2. **看状态**: SSH到系统查看实时日志
3. **修配置**: 在项目中修改，提交到GitHub
4. **更新系统**: 从项目重新部署脚本

```bash
# 标准更新流程
cd Raspi-ImmortalWrt/scripts
git pull  # 获取最新版本
scp *.sh root@192.168.1.1:/root/  # 部署到系统
ssh root@192.168.1.1 "chmod +x /root/*.sh"  # 设置权限
```

---

**建议**: 采用方案1 (保守整理)，保留 QUICK_REFERENCE.txt 方便SSH后快速查看命令。
