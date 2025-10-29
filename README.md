<a id="chinese"></a>
[🇨🇳 中文文档](#chinese) | [🇺🇸 English](#english)

# 树莓派 OpenWrt 软路由配置指南

![项目状态](https://img.shields.io/badge/状态-维护模式-blue) [![OpenWrt](https://img.shields.io/badge/OpenWrt-ImmortalWrt-blue.svg)](https://immortalwrt.org/) [![Raspberry Pi](https://img.shields.io/badge/Device-Raspberry%20Pi%204-red.svg)](https://www.raspberrypi.org/) [![License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

# 常用设置及文档：
1. 烧录工具及步骤：
  - 烧录软件及使用：[docs/Write_Image.md](docs/Write_Image.md)

2. 拨号设置
  - 家庭或校园网拨号：[docs/PPPoE_Connection.md](docs/PPPoE_Connection.md)

3. OpenWrt备份与恢复：
如果您有备份和恢复的需求：
  - 手动备份与恢复请见：[docs/OpenWrt_Backup&Resotre.md](docs/OpenWrt_Backup&Resotre.md)

  - 定时自动备份设置：[docs/OpenWrt_AutoBackup.md](docs/OpenWrt_AutoBackup.md)

4. 软件空间扩容
  - 扩容Overlay空间：[docs/ExtendOverlaySize.md](docs/ExtendOverlaySize.md)

5. Openclash科学上网设置
  - 科学上网插件配置：[Openclash_Config](Openclash_Config)

---

> 编者按：毕业后买了一块树莓派4B，装了Ubuntu学习linux的相关操作后，但很快就闲置了下来。偶然听说可以刷OpenWRT系统实现多播，以及当软路由科学上网用，于是又走上了一番折腾之路，在此记录下来。

# 前言

官方 OpenWrt 固件过于精简，因此我选择了功能更丰富的 `ImmortalWrt`，它提供了更多插件以及 CDN 加速源，大大提升了使用体验。本文记录了我在`树莓派4B`上配置 OpenWrt 软路由的完整过程，希望能帮助到有类似需求的朋友。
**下文所述的OpenWrt都是指ImmortalWrt**，可以把ImmortalWrt理解成功能更丰富的OpenWrt，但本身还是OpenWrt系统。
# 硬件环境

- 设备：Raspberry Pi 4B/400/CM4 (64bit)

<!-- ```bash
# 确认当前版本/平台
cat /etc/openwrt_release; uname -m
# 执行效果
# root@ImmortalWrt:/# cat /etc/openwrt_release; uname -m
# DISTRIB_ID='ImmortalWrt'
# DISTRIB_RELEASE='24.10.0'
# DISTRIB_REVISION='r32824-6a73dae98c9c'
# DISTRIB_TARGET='bcm27xx/bcm2711'
# DISTRIB_ARCH='aarch64_cortex-a72'
# DISTRIB_DESCRIPTION='ImmortalWrt 24.10.0 r32824-6a73dae98c9c'
# DISTRIB_TAINTS=''
# aarch64
``` -->

<a id="firmware_selection_cn"></a>
## 固件选择

- 固件源：[ImmortalWrt Firmware Selector](https://firmware-selector.immortalwrt.org)
- 注意事项：
  - EXT4 版本会覆盖掉所有的用户设置 `覆盖写入(如果需要重新配置，请刷入此固件！)`
  - SQUASHFS 版本写入后，用户的配置不变。`增量写入`
具体固件包可以在release中找到。

# 烧录固件
> 详细步骤请见文档：[docs/Write_Image.md](docs/Write_Image.md)
- 烧录工具：
    - rufus(windows)：https://rufus.ie
    - etcher(windows/linux/macos)：https://etcher.balena.io/#download-etcher
    - diskgenius(windows)：https://www.diskgenius.cn/download.php
    - 微PE(windows)：https://www.wepe.com.cn/download.html
    - DiskImage(windows)：https://roadkil.net/download.php?FileID=409&ProgramID=12

- 注意事项：
  - 烧录前请先格式化 SD 卡
  - 烧录完成后，SD 卡会自动弹出
  - 烧录过程中，请勿移除 SD 卡

# 初始配置

## 连接到 OpenWrt
1. 无线连接，即ssh连接:（推荐）

  - i. 连接树莓派wifi（默认名称：`ImmortalWrt` ）
  - ii.浏览器输入`192.168.1.1`，进入后台，默认密码为空，直接点击确定。
  - ii.（与上方二选一） 使用本地ssh工具，address: `192.168.1.1`, 端口：`22`, Username: `root`, Password: `默认为空`/`编译固件时候的密码，请见`[固件选择](#firmware_selection_cn)


2. 有线连接：

  - i. 使用网线直连树莓派；
  - ii. 更改本地以太网 IPv4 地址为 `192.168.1.x` 网段， 子网掩码`255.255.255.0`;（末尾`x` 可以是2-255范围中的任意整数）,网关填写：`192.168.1.1`。

  <div align="center">
  <img src="figures/连接openwrt配置图.png" width="80%" />
  </div>

  - iii. 访问 `192.168.1.1` 进入 OpenWrt 的web后台;
  - iiii. 默认账户：root; 默认密码：(空)或烧录时设置的密码。
> `方法2`适用于复杂的校园网环境（尤其是同一个实验室中出现不同局域网的情况）





## 基础设置
> 连接后，第一步先修改密码。第二部关闭IPv6设置。

- 关闭 IPv6 相关设置（参考视频 24:42）https://www.youtube.com/watch?v=JfSJmPFiL_s&t=344s

# 网络配置
> 接下来需要配置网络，如果您将路由器lan口与树莓派的网口连接，那么不用做任何改动，连接到树莓派的wifi即可成功上网。

<a id = "simplest_method"></a>
### 最简单用法
将树莓派的单个网口连接到光猫或路由器的LAN口，此时任何终端设备连接上树莓派的wifi后，都可上网。

> 但如果你是在校园网环境下，或者是想让树莓派当主路由器，即有拨号需求，请看以下方法。

## 单网口树莓派配置 WAN 和 LAN
> 详见：https://www.youtube.com/watch?v=pEf-MjqTFJ4&list=PLma6Xp9L8ZNkhKv2AFYMrwY4_Vb1J3uxG&index=2
<strong> 最初考虑使用 VLAN 技术实现单网口分离 WAN 和 LAN，但由于交换机不支持 VLAN，最终放弃这种方式。 </strong>
说人话：
由于树莓派只有单个网口，所以通过[最简单用法](#simplest_method)，只能做到其他设备只能通过wifi连接，不能再通过网线连接。如何能实现其他设备网线连接到树莓派？答：用一个有VLAN功能的交换机即可实现。（但我没有哈哈哈）

## 校园网拨号解决方案
> 如果要家庭拨号，那么此时的软路由做主路由。相关的拨号账户的获取，这里不再展开。请见[桥接模式的教程](https://github.com/Ronchy2000/Home-Network-Router-Bridging-Solution)。

校园网拨号较为复杂，可能会识别出设备类型导致连接失败。

具体拨号设置步骤请见：[docs/PPPoE_Connection.md](docs/PPPoE_Connection.md)

---
> 至此，你的全屋设备连接到树莓派wifi，都可以成功上网了！

> 接下来配置紧张刺激的科学上网插件，来实现全屋全球漫游！


# 功能扩展

## 主题美化

> 安装 cargo luci 主题，提升界面美观度（参考视频 33:12）https://www.youtube.com/watch?v=JfSJmPFiL_s&t=1992s

如果您自己会安装，请直接按照以下步骤操作：

`系统--软件包--更新列表--没有报错--安装luci-theme-argon--安装luci-i18n-ttyd-zh-cn`

插件安装：
- luci-app-openclash
- luci-i18n-passwall-zh-cn
- luci-i18n-homeproxy-zh-cn

插件位置在：侧边栏的“服务”标签页。

> 插件安装好了，接下来只要完成最后一步，配置代理工具，之后您就可以在全屋的任意终端设备上实现`科 学 上 网`了！
## 科学上网配置
> 说实话，折腾软路由到现在，不就是为了这一刻嘛？
> 当你真正配置好科学上网，看着全屋设备都能自由、快速地访问外网，那一瞬间的畅快，绝对是所有折腾的意义所在。

> 有人说，科学上网只是个工具，我每个设备都安装上代理工具不就行了？但对折腾党来说，要做到优雅的科学上网太值得去花费精力了。从节点选择、DNS分流到透明代理，每一步都暗藏玄机。配得好，你的网络能像丝一样顺滑；配不好，整天都在“连不上”“打不开”的循环里。

> 接下来，就让我们配置openclash，看看怎么让 OpenWrt 的软路由真正“飞”起来。

1. 安装科学上网插件Openclash等
根据个人喜好下载添加即可（不能同时使用！）
- Openclash （强烈推荐，用的人最多，本文教程也是基于此）
- passWall
- 略

>安装好 OpenClash 插件后，先看一遍这段视频，按步骤完成基础配置即可：
链接：https://www.youtube.com/watch?v=1U9xkpexHOE

与视频不同的是，视频里的 `config.yaml` 在实际使用中会出现两个问题：一是 `LinkedIn`无法正常访问，二是像 IEEE 这类`学术网站`无法正确识别学术网络的 IP，导致需要频繁切换网络才能下载文献。本文提供的配置方案针对规则与 DNS 分流做了调整，解决了上述问题，并给出可复现的示例与验证步骤。

请使用[config_linkedin.yaml](config.yaml)作为配置文件。

本配置说明：文献库，steam下载走直连，linkedin利用海外DNS访问，防止跳转回国，更多功能请提PR！

<div align="center">
  <img src="figures/Direct_rules.png" width="80%" />
</div>


2. 高级使用方法
自定义规则添加：

- [OpenClash 维护指南.](https://blog.dreamtobe.cn/openclash_maintain/)
- [自定义 OpenClash 规则.](https://github.com/Aethersailor/Custom_OpenClash_Rules) 配置成功！
- [GitHub 访问优化.](https://github.com/521xueweihan/GitHub520)
    - 添加 GitHub 相关域名到直连规则.
    - 通过修改本地 hosts 文件解决 GitHub 访问速度慢和图片显示不出来的问题.

# 参考资料
[https://www.youtube.com/watch?v=s84CWgKus4U&t=105s](https://www.youtube.com/watch?v=s84CWgKus4U&t=105s)

# 总结

通过以上配置，成功将树莓派打造成了一台功能强大的软路由，解决了校园网环境下的网络连接问题，并实现了科学上网等高级功能。ImmortalWrt 相比官方 OpenWrt 提供了更丰富的插件支持，大大提升了使用体验。

希望这份配置指南能对你有所帮助！如有问题，欢迎在评论区交流讨论。

# 其他
## OpenWrt备份与恢复：
如果您有备份和恢复的需求：
- 手动备份与恢复请见：[docs/OpenWrt_Backup&Resotre.md](docs/OpenWrt_Backup&Resotre.md)

- 定时自动备份设置：[docs/OpenWrt_AutoBackup.md](docs/OpenWrt_AutoBackup.md)

## 软件空间扩容
- 扩容Overlay空间：[docs/ExtendOverlaySize.md](docs/ExtendOverlaySize.md)



---


<a id="english"></a>
[🇨🇳 中文文档](#chinese) | [🇺🇸 English](#english)

# Raspberry Pi OpenWrt Software Router Configuration Guide

![Project Status](https://img.shields.io/badge/status-maintenance-blue) [![OpenWrt](https://img.shields.io/badge/OpenWrt-ImmortalWrt-blue.svg)](https://immortalwrt.org/) [![Raspberry Pi](https://img.shields.io/badge/Device-Raspberry%20Pi%204-red.svg)](https://www.raspberrypi.org/) [![License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

# Common Settings and Documentation:
1. Flashing Tools and Steps:
  - Flashing Software and Usage: [docs/Write_Image.md](docs/Write_Image.md)

2. Dial-up Settings
  - Home or Campus Network Dial-up: [docs/PPPoE_Connection.md](docs/PPPoE_Connection.md)

3. OpenWrt Backup & Restore:
If you have backup and restore needs:
  - Manual Backup & Restore: [docs/OpenWrt_Backup&Resotre.md](docs/OpenWrt_Backup&Resotre.md)

  - Scheduled Automatic Backup Settings: [docs/OpenWrt_AutoBackup.md](docs/OpenWrt_AutoBackup.md)

4. Software Space Expansion
  - Expand Overlay Space: [docs/ExtendOverlaySize.md](docs/ExtendOverlaySize.md)

5. OpenClash Network Access Settings
  - Network Access Plugin Configuration: [Openclash_Config](Openclash_Config)

---

> Editor's Note: After graduation, I bought a Raspberry Pi 4B and installed Ubuntu to learn Linux operations, but it soon became idle. By chance, I heard that it could be flashed with OpenWRT system to achieve multicast and serve as a software router for network access, so I embarked on another journey of tinkering, which I document here.

# Preface

The official OpenWrt firmware is too minimalistic, so I chose the feature-rich `ImmortalWrt`, which provides more plugins and CDN acceleration sources, greatly enhancing the user experience. This article documents my complete process of configuring an OpenWrt software router on a `Raspberry Pi 4B`, hoping to help others with similar needs.

**All references to OpenWrt below refer to ImmortalWrt**. You can understand ImmortalWrt as a more feature-rich OpenWrt, but it is still essentially an OpenWrt system.

# Hardware Environment

- Device: Raspberry Pi 4B/400/CM4 (64bit)

<a id="firmware_selection_en"></a>
## Firmware Selection

- Firmware Source: [ImmortalWrt Firmware Selector](https://firmware-selector.immortalwrt.org)
- Important Notes:
  - EXT4 version will overwrite all user settings `(Overwrite mode - flash this firmware if you need to reconfigure!)`
  - SQUASHFS version preserves user configurations after flashing `(Incremental mode)`

Specific firmware packages can be found in the release section.

# Flashing the Firmware
> For detailed steps, see documentation: [docs/Write_Image.md](docs/Write_Image.md)

- Flashing Tools:
    - rufus (Windows): https://rufus.ie
    - etcher (Windows/Linux/macOS): https://etcher.balena.io/#download-etcher
    - diskgenius (Windows): https://www.diskgenius.cn/download.php
    - WePE (Windows): https://www.wepe.com.cn/download.html
    - DiskImage (Windows): https://roadkil.net/download.php?FileID=409&ProgramID=12

- Important Notes:
  - Format the SD card before flashing
  - The SD card will automatically eject after flashing is complete
  - Do not remove the SD card during the flashing process

# Initial Configuration

## Connecting to OpenWrt

**Method 1: Wireless Connection (SSH) - Recommended**

  - i. Connect to Raspberry Pi WiFi (default name: `ImmortalWrt`)
  - ii. Enter `192.168.1.1` in your browser to access the admin panel, default password is empty, just click confirm
  - ii. (Alternative) Use local SSH tool, address: `192.168.1.1`, port: `22`, Username: `root`, Password: `empty by default` / `password set during firmware compilation, see` [Firmware Selection](#firmware_selection_en)

**Method 2: Wired Connection**

  - i. Connect directly to the Raspberry Pi with an Ethernet cable
  - ii. Change your local Ethernet IPv4 address to the `192.168.1.x` subnet with subnet mask `255.255.255.0` (the last `x` can be any integer from 2-255), set gateway to `192.168.1.1`

  <div align="center">
  <img src="figures/连接openwrt配置图.png" width="80%" />
  </div>

  - iii. Access `192.168.1.1` to enter the OpenWrt web admin panel
  - iv. Default username: root; Default password: (empty) or the password set during flashing

> `Method 2` is suitable for complex campus network environments (especially when different LANs exist in the same laboratory)

## Basic Settings
> After connecting, first change the password. Second, disable IPv6 settings.

- Disable IPv6 related settings (refer to video at 24:42) https://www.youtube.com/watch?v=JfSJmPFiL_s&t=344s

# Network Configuration
> Next, you need to configure the network. If you connect the router's LAN port to the Raspberry Pi's network port, you don't need to make any changes - simply connect to the Raspberry Pi's WiFi to access the internet.

<a id="simplest_method_en"></a>
### Simplest Usage
Connect the Raspberry Pi's single network port to the LAN port of your optical modem or router. Any terminal device connected to the Raspberry Pi's WiFi can then access the internet.

> However, if you're in a campus network environment or want the Raspberry Pi to act as the main router (i.e., you have dial-up requirements), please see the following methods.

## Single Network Port Raspberry Pi WAN and LAN Configuration
> For details, see: https://www.youtube.com/watch?v=pEf-MjqTFJ4&list=PLma6Xp9L8ZNkhKv2AFYMrwY4_Vb1J3uxG&index=2

<strong>Initially considered using VLAN technology to separate WAN and LAN on a single port, but ultimately abandoned this approach as the switch did not support VLAN.</strong>

In plain language:
Since the Raspberry Pi has only a single network port, using the [simplest method](#simplest_method_en), other devices can only connect via WiFi, not through Ethernet cable. How can you enable other devices to connect to the Raspberry Pi via Ethernet? Answer: Use a switch with VLAN functionality (but I don't have one, haha).

## Campus Network Dial-up Solution
> For home dial-up, the software router acts as the main router. Related dial-up account acquisition is not covered here. Please see [Bridging Mode Tutorial](https://github.com/Ronchy2000/Home-Network-Router-Bridging-Solution).

Campus network dial-up is more complex and may fail due to device type detection.

For specific dial-up configuration steps, see: [docs/PPPoE_Connection.md](docs/PPPoE_Connection.md)

---
> At this point, all devices in your home connected to the Raspberry Pi WiFi can successfully access the internet!

> Next, let's configure the exciting network access plugins to achieve whole-home global internet access!

# Feature Extensions

## Theme Customization

> Install cargo luci theme to enhance interface aesthetics (refer to video at 33:12) https://www.youtube.com/watch?v=JfSJmPFiL_s&t=1992s

If you know how to install it yourself, follow these steps directly:

`System--Software Packages--Update Lists--No errors--Install luci-theme-argon--Install luci-i18n-ttyd-zh-cn`

Plugin Installation:
- luci-app-openclash
- luci-i18n-passwall-zh-cn
- luci-i18n-homeproxy-zh-cn

Plugin location: In the "Services" tab on the sidebar.

> Once plugins are installed, complete the final step of configuring the proxy tool, and you'll be able to achieve `network access` on any terminal device in your home!

## Network Access Configuration
> Honestly, isn't this what all the software router tinkering has been for?
> When you successfully configure network access and see all your home devices freely and quickly accessing the internet, that moment of satisfaction is absolutely the meaning of all this effort.

> Some say network access is just a tool - why not just install proxy tools on each device? But for tinkerers, achieving elegant network access is absolutely worth the effort. From node selection, DNS splitting to transparent proxy, every step has its secrets. Configure it well, and your network flows like silk; configure it poorly, and you're stuck in an endless loop of "can't connect" and "won't open".

> Next, let's configure OpenClash and see how to make OpenWrt's software router truly "fly".

**1. Install Network Access Plugins such as OpenClash**

Download and add according to personal preference (cannot use multiple simultaneously!)
- OpenClash (Highly recommended, most widely used, this tutorial is based on it)
- passWall
- etc.

> After installing the OpenClash plugin, watch this video first and complete the basic configuration step by step:
Link: https://www.youtube.com/watch?v=1U9xkpexHOE

Unlike in the video, the `config.yaml` in the video has two issues in actual use: first, `LinkedIn` cannot be accessed normally, and second, `academic websites` like IEEE cannot correctly identify academic network IPs, requiring frequent network switching to download papers. The configuration provided in this article adjusts rules and DNS splitting to solve these issues and provides reproducible examples and verification steps.

Please use [config_linkedin.yaml](config.yaml) as the configuration file.

Configuration notes: Academic literature repositories and Steam downloads use direct connection, LinkedIn uses overseas DNS to prevent redirection to domestic sites. For more features, please submit a PR!

<div align="center">
  <img src="figures/Direct_rules.png" width="80%" />
</div>

**2. Advanced Usage**

Custom rule additions:

- [OpenClash Maintenance Guide](https://blog.dreamtobe.cn/openclash_maintain/)
- [Custom OpenClash Rules](https://github.com/Aethersailor/Custom_OpenClash_Rules) Configuration successful!
- [GitHub Access Optimization](https://github.com/521xueweihan/GitHub520)
    - Add GitHub-related domains to direct connection rules
    - Solve GitHub access speed and image display issues by modifying local hosts file

# References
[https://www.youtube.com/watch?v=s84CWgKus4U&t=105s](https://www.youtube.com/watch?v=s84CWgKus4U&t=105s)

# Conclusion

Through the above configuration, I successfully transformed a Raspberry Pi into a powerful software router, solving network connection issues in campus environments and implementing advanced features like network access. ImmortalWrt provides richer plugin support compared to official OpenWrt, greatly enhancing the user experience.

I hope this configuration guide helps you! If you have any questions, feel free to discuss in the comments section.

# Other
## OpenWrt Backup & Restore:
If you have backup and restore needs:
- Manual Backup & Restore: [docs/OpenWrt_Backup&Resotre.md](docs/OpenWrt_Backup&Resotre.md)

- Scheduled Automatic Backup Settings: [docs/OpenWrt_AutoBackup.md](docs/OpenWrt_AutoBackup.md)

## Software Space Expansion
- Expand Overlay Space: [docs/ExtendOverlaySize.md](docs/ExtendOverlaySize.md)