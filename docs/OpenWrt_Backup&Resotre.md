<a id="chinese"></a>
[🇨🇳 中文文档](#chinese) | [🇺🇸 English](#english)

# 备份与恢复
> 由于题主的SD卡是128GB，全部挂载到了Openwrt系统上，但整个系统一共消耗的资源只有287MB，有点大材小用了。遂计划备份后换到一个4GB的内存卡上。

![](../figures/Openclash_config/openclash占用情况.png)

## 备份

1. 前往系统设置填写`备份列表`。
![](../figures/填写备份配置列表.png)
![](../figures/文件备份列表.png)

2. 在`系统 -> 备份与升级 -> 生成备份`
备份系统相关配置：（保存文件到本地）

如果备份文件只有170B那么这个大小一定是出错了！请把你的IDM或者NDM插件关掉，用浏览器默认下载。
![](../figures/openwrt备份.png)
备份结束。

> 如果在系统设置中导出了备份，那么openclash也会被包含在备份中；以下仅为单独备份插件的方式。（可以不用）
备份openclash相关配置：（保存文件到本地

![](../figures/Openclash_config/openclashBackup.png)
备份结束。

## 恢复

拿出新卡 or U盘
### 烧录固件
烧录树莓派相关的版本的固件。请见Openwrt[固件选择](../README.md#firmware_selection_cn)以及[烧录教程](./Write_Image.md)

### 恢复备份

<strong>重要：如果您不执行以以下操作，直接从`备份与恢复`设置`上传备份`，会报错！且难以解决！最好的方式就是新系统自行安装好插件，再进行备份文件上传。</strong>

烧录固件后，请先配置好网络，即，openwrt能够更新软件包，并安装相关内容如下；
> 安装 cargo luci 主题，提升界面美观度（参考视频 33:12）https://www.youtube.com/watch?v=JfSJmPFiL_s&t=1992s

如果您自己会安装，请直接按照以下步骤操作：

`系统--软件包--更新列表--没有报错--安装luci-theme-argon--安装luci-i18n-ttyd-zh-cn`

插件安装：
- luci-app-openclash
- luci-i18n-passwall-zh-cn
- luci-i18n-homeproxy-zh-cn

插件位置在：侧边栏的“服务”标签页。

重要：如果您不执行<strong>以上操作</strong>，直接从`备份与恢复`设置`上传备份`，会报错！且难以解决！

安装好插件后，去系统设置中上传备份：

![](../figures/Openwrt恢复备份.png)



恢复结束。可以退出本文档了！

如果您是命令行选手，那么请跟我来。
---


### 命令行备份及恢复。

1. 给openwrt安装sftp服务：
```bash
opkg update 
opkg install openssh-sftp-server
```
2. 安装`luci-theme-argon`后，在系统--备份与升级--上传备份。
3. 安装插件：luci-app-openclash
4. 还原文件openclash配置(经实验，这个可以不用，openclash相关备份已经包含在系统备份中)

成功！

---

<a id="english"></a>
[🇨🇳 中文文档](#chinese) | [🇺🇸 English](#english)

# Backup and Restore

> Since the author's SD card is 128GB, all mounted to the OpenWrt system, but the entire system only consumes 287MB of resources, which is a bit overkill. Therefore, the plan is to backup and switch to a 4GB memory card.

![](../figures/Openclash_config/openclash占用情况.png)

## Backup

1. Go to system settings and fill in the `Backup List`.
![](../figures/填写备份配置列表.png)
![](../figures/文件备份列表.png)

2. In `System -> Backup & Upgrade -> Generate Backup`
Backup system-related configurations: (Save file to local)

If the backup file is only 170B, this size definitely indicates an error! Please turn off your IDM or NDM plugin and use the browser's default download.
![](../figures/openwrt备份.png)
Backup complete.

> If you exported the backup in system settings, OpenClash will also be included in the backup; the following is just a separate plugin backup method. (Optional)
Backup OpenClash-related configurations: (Save file to local)

![](../figures/Openclash_config/openclashBackup.png)
Backup complete.

## Restore

Take out new card or USB drive.

### Flash Firmware
Flash the Raspberry Pi related version firmware. Please see OpenWrt [Firmware Selection](../README.md#firmware_selection_en) and [Flashing Tutorial](./Write_Image.md)

### Restore Backup

<strong>Important: If you do not perform the following operations and directly upload the backup from `Backup & Restore` settings, it will report errors! And it's difficult to resolve! The best way is to install plugins on the new system first, then upload the backup file.</strong>

After flashing the firmware, please configure the network first, i.e., OpenWrt can update software packages, and install the following content:
> Install cargo luci theme to enhance interface aesthetics (refer to video at 33:12) https://www.youtube.com/watch?v=JfSJmPFiL_s&t=1992s

If you know how to install it yourself, follow these steps directly:

`System--Software Packages--Update Lists--No errors--Install luci-theme-argon--Install luci-i18n-ttyd-zh-cn`

Plugin Installation:
- luci-app-openclash
- luci-i18n-passwall-zh-cn
- luci-i18n-homeproxy-zh-cn

Plugin location: In the "Services" tab on the sidebar.

Important: If you do not perform the <strong>above operations</strong> and directly upload the backup from `Backup & Restore` settings, it will report errors! And it's difficult to resolve!

After installing the plugins, go to system settings to upload the backup:

![](../figures/Openwrt恢复备份.png)

Restore complete. You can exit this document now!

If you are a command-line user, please follow me.
---

### Command Line Backup and Restore

1. Install SFTP service for OpenWrt:
```bash
opkg update 
opkg install openssh-sftp-server
```
2. After installing `luci-theme-argon`, go to System--Backup & Upgrade--Upload Backup.
3. Install plugin: luci-app-openclash
4. Restore OpenClash configuration files (after testing, this is not necessary, OpenClash-related backup is already included in the system backup)

Success!

---