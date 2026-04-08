[🇨🇳 中文文档](./ExtendOverlaySize.md) | [🇺🇸 English](./en/ExtendOverlaySize.md)

# ImmortalWrt Overlay 与 Extroot 扩容（进阶版）

本文只适用于：

- 你确认自己刷的是 `squashfs` 固件
- `mount` 中能看到 `overlayfs:/overlay on / type overlay`
- 你真正不够的是 `/overlay` 软件空间

如果你当前看到的是：

```text
/dev/root on / type ext4
```

请不要继续读这篇。你应该回到：

- [存储扩容与分区指南](./Storage_Expansion_Guide.md)

对于 `ext4` 根分区系统，正确路线通常是扩容根分区，而不是配置 `extroot`。

## 先说结论

`extroot` 不是“多挂一个分区”。

它的本质是：

**把 `squashfs` 系统原本的可写层完整迁移到新的 ext4 分区。**

因此它和单独创建数据分区完全不同。  
如果迁移过程漏了任何一步，重启后系统可能表现为：

- 配置丢失
- 插件消失
- 像重新初始化一样启动

## 哪些情况才值得考虑 `extroot`

只有在下面这些条件同时成立时，才建议继续：

1. 当前系统仍是 `squashfs + overlay`
2. `/overlay` 经常因为安装软件而空间不足
3. 你已经完成备份
4. 你能接受出问题后自己回滚

如果你只是想：

- 给 Git 仓库腾空间
- 存备份包
- 放 OpenClash 大文件

那优先考虑数据分区方案，而不是 `extroot`。

## 动手前先确认

先执行：

```bash
mount | grep overlay
df -h
block info
```

如果这里看不到 `overlayfs:/overlay`，就说明你不在本文的适用范围内。

## 操作前准备

按下面顺序做。

1. **先备份。**

```bash
sysupgrade -b /tmp/pre-extroot-$(date +%F).tar.gz
```

2. **再安装工具。**

先判断系统版本：

- `OpenWrt 24.10 及更早稳定版`：使用 `opkg`
- `OpenWrt 25.12 及更新版本 / 新分支`：使用 `apk`

`24.10 及更早稳定版`：

```bash
opkg update
opkg install block-mount kmod-fs-ext4 e2fsprogs fdisk cfdisk rsync
```

`25.12 及更新版本 / 新分支`：

```bash
apk update
apk add block-mount kmod-fs-ext4 e2fsprogs fdisk cfdisk rsync
```

如果仓库里没有 `rsync`，后面可以改用 `cp -a`。

3. **然后确认确实还有可用空闲空间。**

```bash
fdisk -l /dev/mmcblk0
```

只有在确认卡上确实还有未分配空间时，才继续新建分区。

## 步骤一：新建 ext4 分区

```bash
cfdisk /dev/mmcblk0
```

操作顺序：

1. 选中 `Free space`
2. 选择 `[ New ]`
3. 输入大小，例如 `8G`
4. 保持 `Linux`
5. 选择 `[ Write ]`
6. 输入 `yes`
7. 选择 `[ Quit ]`

下面假设新分区为：

```text
/dev/mmcblk0p3
```

## 步骤二：格式化新分区

```bash
umount /dev/mmcblk0p3 2>/dev/null
mkfs.ext4 -L extroot /dev/mmcblk0p3
e2fsck -f /dev/mmcblk0p3
```

如果此时提示新分区中已经包含某个文件系统，先停下来，不要无脑继续格式化。

## 步骤三：临时挂载

```bash
mkdir -p /mnt/extroot
mount -t ext4 /dev/mmcblk0p3 /mnt/extroot
df -h | grep mmcblk0p3
```

## 步骤四：迁移当前 overlay 数据

这是最关键的一步。

先准备目录：

```bash
mkdir -p /mnt/extroot/upper
mkdir -p /mnt/extroot/work
```

优先使用 `rsync`：

```bash
rsync -aHAX /overlay/ /mnt/extroot/
sync
```

如果没有 `rsync`，改用：

```bash
cp -a /overlay/. /mnt/extroot/
sync
```

迁移后检查：

```bash
ls -la /mnt/extroot
```

你至少应当能看到：

- `upper`
- `work`

## 步骤五：用 UUID 写入 `fstab`

```bash
UUID="$(block info /dev/mmcblk0p3 | sed -n 's/.*UUID=\"\\([^\"]*\\)\".*/\\1/p')"
echo "$UUID"
```

然后写入：

```bash
uci set fstab.extroot=mount
uci set fstab.extroot.target='/overlay'
uci set fstab.extroot.uuid="$UUID"
uci set fstab.extroot.fstype='ext4'
uci set fstab.extroot.enabled='1'
uci commit fstab

/etc/init.d/fstab enable
```

## 步骤六：重启并验证

```bash
reboot
```

重启后执行：

```bash
mount | grep -E 'overlay|mmcblk0p3'
df -h
```

成功时通常会看到：

```text
/dev/mmcblk0p3 on /overlay type ext4
overlayfs:/overlay on / type overlay
```

## 如果重启后像“系统被重置”

优先检查：

1. `/dev/mmcblk0p3` 是否真的挂到了 `/overlay`
2. `fstab` 里是不是写对了 `UUID`
3. `/mnt/extroot` 中原先是否完整复制了 `/overlay`
4. 新分区里是否存在 `upper` 和 `work`

## 不建议关闭 ext4 journal

你可能会在其他教程里看到：

```bash
tune2fs -O ^has_journal /dev/mmcblk0p3
```

对长期在线的路由器，我不建议这么做。

原因是：

- 节省的写入量有限
- 但掉电或异常重启后的风险更高

## 一句话提醒

`extroot` 的关键不是“挂上去”，而是“把旧的 overlay 完整迁移过去”。

如果你的目标只是多放一些仓库、备份包或大文件，请回到：

- [存储扩容与分区指南](./Storage_Expansion_Guide.md)
