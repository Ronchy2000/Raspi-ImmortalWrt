<a id="chinese"></a>
[🇨🇳 中文文档](#chinese) | [🇺🇸 English](#english)

### 拨号解决方案
> 如果要家庭拨号，那么此时的软路由做主路由。相关的拨号账户的获取，这里不再展开。请见[桥接模式的教程](https://github.com/Ronchy2000/Home-Network-Router-Bridging-Solution)。

校园网拨号较为复杂，可能会识别出设备类型导致连接失败。

<div align="center">
  <img src="../figures/拨号出错图.png" width="80%" />
</div>

#### 解决方法：
> Reference该教程解决拨号问题：[树莓派安装OpenWrt作为主路由及解决校园网登录界面无法访问_哔哩哔哩_bilibili](https://www.bilibili.com/video/BV1ni4y1d76Z/?vd_source=f63c5bad02603bd4f2c19cf640c71d1f)

1. 新建 WAN0 接口，配置拨号账户

![](../figures/新建WAN0.png)

这个防火墙设置很重要！否则wifi无法上网！

![](../figures/WAN防火墙设置.png)

2. LAN口 设置：将设备改为无线网络

<div align="center">
  <img src="../figures/拨号上网.png" width="80%" />
</div>

![](../figures/lan口防火墙.png)

3. 如遇问题，请将 WiFi 放置在最高优先级后再测试！（本条针对macOS，windows请断开以太网连接，即考虑网络优先级）

最后效果如下图。
<div align="center">
  <img src="../figures/拨号成功.png" width="80%" />
</div>

## 至此，你的全屋设备连接到树莓派wifi，都可以成功上网了！

---

<a id="english"></a>
[🇨🇳 中文文档](#chinese) | [🇺🇸 English](#english)

# PPPoE Dial-up Connection Solution

> For home dial-up, the software router acts as the main router. Related dial-up account acquisition is not covered here. Please see [Bridging Mode Tutorial](https://github.com/Ronchy2000/Home-Network-Router-Bridging-Solution).

Campus network dial-up is more complex and may fail due to device type detection.

<div align="center">
  <img src="../figures/拨号出错图.png" width="80%" />
</div>

## Solution:
> Reference this tutorial to solve dial-up issues: [Installing OpenWrt on Raspberry Pi as Main Router and Solving Campus Network Login Page Access Issues](https://www.bilibili.com/video/BV1ni4y1d76Z/?vd_source=f63c5bad02603bd4f2c19cf640c71d1f)

### 1. Create WAN0 Interface and Configure Dial-up Account

![](../figures/新建WAN0.png)

This firewall setting is very important! Otherwise WiFi won't work!

![](../figures/WAN防火墙设置.png)

### 2. LAN Port Settings: Change Device to Wireless Network

<div align="center">
  <img src="../figures/拨号上网.png" width="80%" />
</div>

![](../figures/lan口防火墙.png)

### 3. Troubleshooting: Set WiFi to Highest Priority

If you encounter issues, set WiFi to the highest priority and test again! (This applies to macOS; for Windows, disconnect Ethernet connection to consider network priority)

Final result as shown below:
<div align="center">
  <img src="../figures/拨号成功.png" width="80%" />
</div>

---
## At this point, all devices in your home connected to the Raspberry Pi WiFi can successfully access the internet!