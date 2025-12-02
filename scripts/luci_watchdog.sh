#!/bin/sh
# LuCI 看门狗 - 检测并自动修复 LuCI 问题
# 每5分钟运行一次

LOG="/root/luci_watchdog.log"
DATE=$(date "+%Y-%m-%d %H:%M:%S")

# 测试 LuCI 是否响应
check_luci() {
    # 测试 uhttpd 进程
    if ! pgrep uhttpd > /dev/null; then
        echo "[$DATE] 错误: uhttpd 进程不存在" >> $LOG
        return 1
    fi
    
    # 测试 LuCI CGI 是否可执行
    if [ ! -x /www/cgi-bin/luci ]; then
        echo "[$DATE] 错误: /www/cgi-bin/luci 不可执行" >> $LOG
        chmod +x /www/cgi-bin/luci
        return 1
    fi
    
    # 测试 HTTP 响应
    if ! wget -q --spider --timeout=5 http://127.0.0.1/ 2>/dev/null; then
        echo "[$DATE] 错误: LuCI HTTP 无响应" >> $LOG
        return 1
    fi
    
    return 0
}

# 修复 LuCI
fix_luci() {
    echo "[$DATE] 尝试修复 LuCI..." >> $LOG
    
    # 确保权限正确
    chmod +x /www/cgi-bin/luci 2>/dev/null
    chmod 755 /www/cgi-bin 2>/dev/null
    
    # 重启 uhttpd
    /etc/init.d/uhttpd restart
    sleep 3
    
    # 再次检查
    if check_luci; then
        echo "[$DATE] ✓ LuCI 修复成功" >> $LOG
        return 0
    else
        echo "[$DATE] ✗ LuCI 修复失败，可能需要重启系统" >> $LOG
        return 1
    fi
}

# 主逻辑
if ! check_luci; then
    echo "[$DATE] 检测到 LuCI 问题，开始修复..." >> $LOG
    fix_luci
else
    # 只在有问题时记录，避免日志过大
    : # 正常，不记录
fi

# 保持日志文件不超过 1000 行
if [ -f "$LOG" ]; then
    line_count=$(wc -l < "$LOG")
    if [ $line_count -gt 1000 ]; then
        tail -500 "$LOG" > "$LOG.tmp"
        mv "$LOG.tmp" "$LOG"
    fi
fi
