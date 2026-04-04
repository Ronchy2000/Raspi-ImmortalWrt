[🇨🇳 中文文档](./Storage_Expansion_Guide.md) | [🇺🇸 English](./en/Storage_Expansion_Guide.md)

# ImmortalWrt 存储扩容与分区指南

这篇文档用于回答 3 个最容易混淆的问题：

1. 你当前刷的是 `ext4` 固件，还是 `squashfs` 固件。
2. 你应该扩根分区、单独建数据分区，还是使用 `extroot`。
3. 哪些命令可以直接执行，哪些情况必须先停下来检查。

如果你的情况是下面这些之一，建议先看完本文再动手：

- `git clone` 空间不够
- 想安装 iStore、OpenClash、quickstart 等插件
- 备份包、规则文件、仓库越来越大
- 不确定该不该碰 `/overlay`

## 一句话结论

树莓派上常见的安全路线其实分两种：

- 如果系统已经是 `ext4` 根分区，且你准备安装较多插件，优先扩 `rootfs` 所在分区。
- 如果系统是 `squashfs + overlay`，而你的主要需求只是放仓库、备份包和大文件，优先新建数据分区。

`extroot` 不是默认答案。它只适用于特定场景，而且前提是你已经确认自己仍在 `squashfs` 路线。

## 第一步：先判断你现在是哪种系统

先执行：

```bash
mount
df -h
block info
```

### 情况 A：`ext4` 根分区

如果你看到类似输出：

```text
/dev/root on / type ext4
```

这表示你当前是：

- `ext4` 固件
- 根分区直接挂载到 `/`
- 软件、配置、插件都直接写在根分区

这种情况下，插件空间不够时，优先考虑：

**扩容根分区，不要去折腾 `/overlay` 或 extroot。**

### 情况 B：`squashfs + overlay`

如果你看到类似输出：

```text
overlayfs:/overlay on / type overlay
```

这表示你当前是：

- `squashfs` 固件
- 系统只读层在下方
- 可写层在 `/overlay`

这种情况下：

- 只缺存储空间时，优先考虑数据分区
- 只有在 `/overlay` 长期不够装软件时，才考虑 `extroot`

## 先把几个名词说清楚

### 分区

一张 TF 卡可以看成一整块存储介质。

分区就是把它划成几块逻辑区域，例如：

- `p1` 放启动文件
- `p2` 放系统
- `p3` 放你自己的数据

### 文件系统

分区只是空间划分，还需要格式化成文件系统后才能存文件。

ImmortalWrt 常见的是：

- `ext4`
- `vfat`

### 挂载

挂载就是把一个分区接到系统目录树中的某个位置。

例如：

- 把 `/dev/mmcblk0p3` 挂到 `/srv/storage`

之后访问 `/srv/storage`，实际就是在访问这个分区。

### `rootfs`

`rootfs` 就是系统根目录 `/` 对应的文件系统。

### `/overlay`

`/overlay` 是 `squashfs` 固件常见的可写层。

安装软件、修改配置时，很多变化都落在这里。

### `extroot`

`extroot` 的本质不是“多一个分区”，而是：

**把 `squashfs` 系统原本的可写层迁移到一个更大的 ext4 分区。**

它比单独建数据分区更敏感，也更依赖迁移步骤是否正确。

## 先选路线，不要先执行 `mkfs`

| 你的目标 | 当前系统 | 推荐方案 | 是否建议新手直接做 |
|---|---|---|---|
| 安装很多插件，让 `/` 直接变大 | `ext4` 根分区 | 扩容根分区 `p2` | 是 |
| 给仓库、备份包、规则文件腾空间 | `squashfs` 或 `ext4` | 新建数据分区并挂载到 `/srv/storage` | 是 |
| 扩大 `squashfs` 的可写层 | `squashfs + overlay` | `extroot` | 否，先确认自己理解风险 |

## 路线一：`ext4` 根分区扩容

这条路线适用于：

- 你刷的是 `ext4` 固件
- `mount` 里能看到 `/dev/root on / type ext4`
- 你准备安装 iStore、OpenClash、quickstart、Git 等较多插件

### 为什么推荐这条路线

它的优点是：

- 结构简单
- 系统启动逻辑更直观
- 不需要再引入 `extroot`
- 对插件较多的树莓派更合适

### 操作前检查

先执行：

```bash
sysupgrade -b /boot/pre-expand-$(date +%F).tar.gz

uci delete fstab.overlay 2>/dev/null
uci commit fstab
/etc/init.d/fstab restart
```

说明：

- 第一条命令先保存当前配置
- 后三条用于删除残留的错误 `extroot` 配置，避免系统下次启动时误挂载 `/overlay`

### 安装扩容工具

```bash
opkg update
opkg install parted losetup resize2fs blkid e2fsprogs
```

### 查看当前分区

```bash
parted -l -s
```

如果看到类似：

```text
Number  Start   End     Size    Type     File system  Flags
 1      4194kB  71.3MB  67.1MB  primary  fat16        boot, lba
 2      75.5MB  390MB   315MB   primary  ext4
```

且磁盘总容量明显大于 `p2`，就说明后面还有未分配空间，适合继续。

### 更稳的做法：离线扩容

如果方便关机并把 TF 卡插到电脑上，优先使用分区工具离线扩容 `p2`。

推荐流程：

1. 关机并拔下 TF 卡
2. 用电脑打开 `GParted`、`DiskGenius` 或同类分区工具
3. 选中 `mmcblk0p2`
4. 把分区向后扩展到接近卡末尾
5. 写入并安全卸载
6. 插回树莓派启动
7. 进入系统后执行：

```bash
e2fsck -f /dev/mmcblk0p2
resize2fs /dev/mmcblk0p2
df -h
```

### 在线扩容：优先用 OpenWrt 官方脚本

如果当前必须在线操作，可以使用 OpenWrt 官方扩容脚本流程：

```bash
cd /root
wget -U "" -O expand-root.sh "https://openwrt.org/_export/code/docs/guide-user/advanced/expand_root?codeblock=0"
. ./expand-root.sh
sh /etc/uci-defaults/70-rootpt-resize
```

这个流程通常会自动完成：

- 扩展根分区
- 扩展 ext4 文件系统
- 自动重启

执行前请确认：

- 供电稳定
- 不在远程无人值守的环境中冒险操作
- 已经做好备份

### 扩容完成后如何验证

执行：

```bash
mount
df -h
block info
```

成功时通常会看到：

- `/dev/root on / type ext4`
- `/` 的空间明显增大，例如接近整张 32GB 卡

示例：

```text
Filesystem                Size      Used Available Use% Mounted on
/dev/root                29.3G    114.5M     29.2G   0% /
```

### 扩容成功后可以做什么

这时你就可以继续：

```bash
cd /root
git clone https://github.com/Ronchy2000/Immortalwrt-AutoBackup.git
```

以及安装 iStore、OpenClash、quickstart 等插件。

建议顺序：

1. 先确认 `df -h` 空间已经变大
2. 先配置 Git 与备份
3. 再安装 iStore 和其他插件
4. 每次大改动前先做一份备份

## 路线二：新建数据分区并挂载到 `/srv/storage`

这条路线适用于：

- 当前主要缺的是仓库空间、备份空间、大文件空间
- 你不想改系统根分区结构
- 你想把 Git 仓库、备份包、OpenClash 大文件放到独立区域

### 什么时候适合优先选它

如果你的问题更像下面这些：

- `git clone` 放不下
- 自动备份包越来越多
- 规则文件、下载内容占空间

那这条路线通常比 `extroot` 更稳。

### 先检查分区状态

先执行：

```bash
mount
df -h
block info
uci show fstab
parted -l -s
```

如果你发现：

- 已经存在 `mmcblk0p3`
- 或者 `mkfs.ext4` 提示 `contains a ext4 file system labelled 'overlay'`

这时不要继续格式化。先停下来确认这个分区原本是不是已经在被系统使用。

### 安装工具

```bash
opkg update
opkg install block-mount kmod-fs-ext4 e2fsprogs fdisk cfdisk
```

### 新建分区

```bash
cfdisk /dev/mmcblk0
```

操作步骤：

1. 选中 `Free space`
2. 选择 `[ New ]`
3. 输入需要的大小
4. 保持 `Linux`
5. 选择 `[ Write ]`
6. 输入 `yes`
7. 选择 `[ Quit ]`

假设你得到的新分区是：

```text
/dev/mmcblk0p3
```

### 格式化并测试挂载

```bash
umount /dev/mmcblk0p3 2>/dev/null
mkfs.ext4 -L storage /dev/mmcblk0p3
e2fsck -f /dev/mmcblk0p3

mkdir -p /srv/storage
mount -t ext4 /dev/mmcblk0p3 /srv/storage
df -h | grep mmcblk0p3
```

### 配置开机自动挂载

```bash
UUID="$(block info /dev/mmcblk0p3 | sed -n 's/.*UUID=\"\\([^\"]*\\)\".*/\\1/p')"
echo "$UUID"
```

如果上面能输出 UUID，再执行：

```bash
uci add fstab mount
uci set fstab.@mount[-1].target='/srv/storage'
uci set fstab.@mount[-1].uuid="$UUID"
uci set fstab.@mount[-1].fstype='ext4'
uci set fstab.@mount[-1].enabled='1'
uci commit fstab

/etc/init.d/fstab enable
reboot
```

### 重启后验证

```bash
mount | grep srv/storage
df -h
```

### 推荐目录结构

```bash
mkdir -p /srv/storage/repos
mkdir -p /srv/storage/backups
mkdir -p /srv/storage/openclash
```

例如：

```bash
cd /srv/storage/repos
git clone https://github.com/Ronchy2000/Immortalwrt-AutoBackup.git
```

如果你仍希望从 `/root` 访问仓库，可以建立软链接：

```bash
ln -s /srv/storage/repos/Immortalwrt-AutoBackup /root/Immortalwrt-AutoBackup
```

## 路线三：`extroot`

只有在下面这些条件同时满足时，再考虑 `extroot`：

1. 你确定自己仍在 `squashfs + overlay` 路线
2. 当前真正不够的是 `/overlay` 软件空间
3. 你已经做过完整备份
4. 你知道如何在失败时回退

对应文档：

- [Overlay / Extroot 扩容（进阶版）](./ExtendOverlaySize.md)

## 这些情况必须先停下来

### 情况 1：`mkfs.ext4` 提示分区里已经有 `overlay`

例如：

```text
/dev/mmcblk0p3 contains a ext4 file system labelled 'overlay'
```

这表示这个分区很可能已经被用过。

此时不要继续格式化，先执行：

```bash
mount
df -h
block info
uci show fstab
```

### 情况 2：你已经是 `ext4` 根分区，却还准备照着 `extroot` 教程做

如果 `mount` 里是：

```text
/dev/root on / type ext4
```

那就不要走 `extroot` 文档。

### 情况 3：打算在空间没有验证前一次性安装很多插件

先确认：

```bash
df -h
```

确认 `/` 或 `/srv/storage` 空间已经准备好，再去安装 iStore、OpenClash、Git、大规则集。

## 如果改完分区后系统异常

优先按这个顺序检查：

1. 有没有残留的 `/overlay` 挂载配置：`uci show fstab`
2. 根分区现在是不是正常挂载：`mount`
3. 当前磁盘空间是不是合理：`df -h`
4. 分区识别是否正确：`block info`
5. 系统日志最后几十行：`logread | tail -50`

如果系统已经无法正常启动，最省时间的方式通常是：

1. 重新刷入已知可用的固件
2. 启动后恢复备份
3. 再回到本文，先确认自己属于哪条路线

## 推荐阅读顺序

1. 先看这篇，确认系统类型与扩容路线
2. 如果只是做备份和恢复，继续看 [OpenWrt_Backup_Resotre.md](./OpenWrt_Backup_Resotre.md)
3. 如果要长期维护，继续看 [System_Maintenance.md](./System_Maintenance.md)
4. 只有在确认自己是 `squashfs + overlay` 时，再看 [ExtendOverlaySize.md](./ExtendOverlaySize.md)
