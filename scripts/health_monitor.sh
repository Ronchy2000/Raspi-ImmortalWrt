#!/bin/sh
# System Health Monitor
# Description: 
#   - Checks memory usage (>90% triggers alert).
#   - Verifies critical services (openclash, uhttpd, network, dnsmasq).
#   - Monitors network connection count.
#   - Auto-restarts failed services.
# Schedule: Runs every 30 minutes via cron.

LOG="/root/health_monitor.log"
DATE=$(date "+%Y-%m-%d %H:%M:%S")

echo "[$DATE] === 健康检查 ===" >> $LOG

# 检查内存使用率
MEM_TOTAL=$(free | grep Mem | awk '{print $2}')
MEM_USED=$(free | grep Mem | awk '{print $3}')
MEM_PERCENT=$((MEM_USED * 100 / MEM_TOTAL))

if [ $MEM_PERCENT -gt 90 ]; then
    echo "[$DATE] 警告: 内存使用率 ${MEM_PERCENT}%" >> $LOG
fi

# 检查关键服务
for service in openclash uhttpd network dnsmasq; do
    if ! /etc/init.d/$service status > /dev/null 2>&1; then
        echo "[$DATE] 错误: $service 未运行，尝试重启" >> $LOG
        /etc/init.d/$service restart
    fi
done

# 检查连接数
CONN_COUNT=$(netstat -an | wc -l)
if [ $CONN_COUNT -gt 1000 ]; then
    echo "[$DATE] 警告: 连接数过多 $CONN_COUNT" >> $LOG
fi

echo "[$DATE] 健康检查完成 (内存:${MEM_PERCENT}% 连接:${CONN_COUNT})" >> $LOG
