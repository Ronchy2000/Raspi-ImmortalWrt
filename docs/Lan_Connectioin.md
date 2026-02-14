# LAN 连接（旁路由场景）

本文用于：让树莓派上的 ImmortalWrt 通过上级路由器上网，同时其它设备连接树莓派提供的 Wi-Fi 后也可以正常上网。

## 配置入口

在 LuCI Web 页面中进入：`网络 -> 接口`，找到 `LAN`（或你要修改的接口），点击 `编辑`。

![](../figures/LAN_Connection/lan-01-open-interface.png)

## 接口参数

### 1. 常规设置

按下图设置即可（保持与示例一致）。

![](../figures/LAN_Connection/lan-02-general-settings.png)

### 2. DNS 设置

按下图填写 DNS。

![](../figures/LAN_Connection/lan-03-dns-settings.png)

常见的 DNS 填写位置如下：

![](../figures/LAN_Connection/lan-04-dns-check.png)

### 3. DHCP 设置

如果你不熟悉 DHCP 相关概念，建议直接与下图保持一致。

![](../figures/LAN_Connection/lan-05-dhcp-settings.png)

## 验证

1. 保存并应用配置。
2. 让设备连接树莓派的 Wi-Fi，确认可以正常上网。

如果你在树莓派上同时配置了 OpenClash（代理/分流），那么连接到该 Wi-Fi 的设备也会按你的 OpenClash 规则进行网络访问。

> 参考视频：树莓派旁路由设置教程（YouTube）
> https://www.youtube.com/watch?v=jrqwhug_nO8
