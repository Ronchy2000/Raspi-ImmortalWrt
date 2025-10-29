<a id="chinese"></a>
[🇨🇳 中文文档](#chinese) | [🇺🇸 English](#english)
# ImmortalWrt TF 卡系统的安全扩容

下面为一份 **最简洁、完整、无坑版的扩容教程**，包含从分区、格式化、挂载到验证的全部命令。
这份可以直接保存以后复用（刷机后、换 TF 卡都通用）。

# 🧱 ImmortalWrt TF 卡扩容完整教程（稳定通用版）

> 适用于：ImmortalWrt / OpenWrt / FriendlyWrt / NanoPi / R2S / R4S / X86 等设备
> 目标：将 TF 卡剩余空间（例如 10G）扩容为 `/overlay` 软件安装区

## 🧩 一、准备阶段

1️⃣ **插入 TF 卡并查看现有分区**

```bash
fdisk -l /dev/mmcblk0
```

或使用更直观的：

```bash
cfdisk /dev/mmcblk0
```

2️⃣ **典型原始分区布局：**

```
Device          Boot        Start        End    Sectors    Size   Id Type
/dev/mmcblk0p1  *            8192     139263     131072     64M    c W95 FAT32 (LBA)
/dev/mmcblk0p2             147456     761855     614400    300M   83 Linux
Free space               761856   62333951   61572096   29.4G
```


## 🧰 二、分区操作（使用 cfdisk）

1️⃣ 打开分区工具：

```bash
cfdisk /dev/mmcblk0
```

2️⃣ 在 **Free space** 区域新建分区：

* 选择 `[ New ]`
* 输入大小，例如 `10G`
* 类型选 **ext4**

3️⃣ 写入修改：

* 选择 `[ Write ]`
* 输入 `yes`
* 再选 `[ Quit ]`

结果类似：

```
/dev/mmcblk0p3    761856   21733375   20971520   10G   83 Linux
```


## ⚙️ 三、格式化新分区

```bash
umount /dev/mmcblk0p3 2>/dev/null
mkfs.ext4 -L overlay /dev/mmcblk0p3
fsck.ext4 -f /dev/mmcblk0p3
```

输出中应出现：

```
Creating filesystem with ...
Writing superblocks and filesystem accounting information: done
```

✅ 表示格式化成功。


## 🗂 四、挂载测试

```bash
mkdir -p /mnt/overlay
mount -t ext4 /dev/mmcblk0p3 /mnt/overlay
df -h | grep mmcblk0p3
```

看到：

```
/dev/mmcblk0p3   9.7G   2.0M   9.2G   0% /mnt/overlay
```

说明挂载成功。


## 🧩 五、设置为系统 Overlay（扩容生效）

1️⃣ 安装必须组件：

```bash
opkg update
opkg install block-mount kmod-fs-ext4
```

2️⃣ 写入挂载配置：

```bash
mkdir -p /overlay
uci set fstab.overlay=mount
uci set fstab.overlay.target='/overlay'
uci set fstab.overlay.device='/dev/mmcblk0p3'
uci set fstab.overlay.fstype='ext4'
uci set fstab.overlay.enabled='1'
uci commit fstab
```

3️⃣ 启用并重启：

```bash
/etc/init.d/fstab enable
/etc/init.d/fstab start
reboot
```


## 🚀 六、验证扩容是否成功

重启后运行：

```bash
mount | grep -E 'overlay|mmcblk0p3'
df -h
```

输出应类似：

```
/dev/mmcblk0p3 on /overlay type ext4 (rw,relatime)
overlayfs:/overlay on / type overlay (rw,noatime,lowerdir=/,upperdir=/overlay/upper,workdir=/overlay/work)
```

空间显示：

```
Filesystem         Size  Used Avail Use% Mounted on
/dev/mmcblk0p3      9.7G  9.1M  9.2G   0% /overlay
overlayfs:/overlay  9.7G  9.1M  9.2G   0% /
```

✅ 表示系统已成功使用 `/dev/mmcblk0p3` 作为 overlay，
安装的软件、配置、缓存都写入 10G 分区。

---

## ⚙️ 七、可选优化

### （1）关闭日志以减少 TF 写入：

```bash
tune2fs -O ^has_journal /dev/mmcblk0p3
e2fsck -f /dev/mmcblk0p3
```

### （2）未来扩容更多空间：

如果 TF 卡还有剩余 free space，可以再在 cfdisk 中新建 `/dev/mmcblk0p4`，挂载到 `/mnt/data` 或 `/opt`。

---

## 🧱 八、验证软件安装位置

```bash
opkg update
opkg install htop
df -h
```

你会看到 `/`（overlay） 的使用率增加，这说明软件确实装进了 `/dev/mmcblk0p3`。

---

## ✅ 总结

> 通过 cfdisk 新建 10G 分区 → mkfs.ext4 格式化 → fstab 设置 `/overlay` → 重启。
> 系统根目录自动切换为 10G overlayfs，
> ImmortalWrt 扩容成功，空间持久可写，软件随意安装 🚀。

---

<a id="english"></a>
[🇨🇳 中文文档](#chinese) | [🇺🇸 English](#english)

# Safe Expansion of ImmortalWrt TF Card System

Below is **the most concise, complete, and pitfall-free expansion tutorial**, including all commands from partitioning, formatting, mounting to verification.
This can be saved for future reuse (universal for post-flashing and TF card replacement).

# 🧱 ImmortalWrt TF Card Expansion Complete Tutorial (Stable Universal Version)

> Applicable to: ImmortalWrt / OpenWrt / FriendlyWrt / NanoPi / R2S / R4S / X86 and other devices
> Goal: Expand TF card remaining space (e.g., 10G) as `/overlay` software installation area

## 🧩 Phase 1: Preparation

1️⃣ **Insert TF card and view existing partitions**

```bash
fdisk -l /dev/mmcblk0
```

Or use a more intuitive approach:

```bash
cfdisk /dev/mmcblk0
```

2️⃣ **Typical original partition layout:**

```
Device          Boot        Start        End    Sectors    Size   Id Type
/dev/mmcblk0p1  *            8192     139263     131072     64M    c W95 FAT32 (LBA)
/dev/mmcblk0p2             147456     761855     614400    300M   83 Linux
Free space               761856   62333951   61572096   29.4G
```

## 🧰 Phase 2: Partitioning (Using cfdisk)

1️⃣ Open partitioning tool:

```bash
cfdisk /dev/mmcblk0
```

2️⃣ Create a new partition in the **Free space** area:

* Select `[ New ]`
* Enter size, e.g., `10G`
* Select type **ext4**

3️⃣ Write changes:

* Select `[ Write ]`
* Type `yes`
* Then select `[ Quit ]`

Result should be similar to:

```
/dev/mmcblk0p3    761856   21733375   20971520   10G   83 Linux
```

## ⚙️ Phase 3: Format New Partition

```bash
umount /dev/mmcblk0p3 2>/dev/null
mkfs.ext4 -L overlay /dev/mmcblk0p3
fsck.ext4 -f /dev/mmcblk0p3
```

Output should show:

```
Creating filesystem with ...
Writing superblocks and filesystem accounting information: done
```

✅ Indicates successful formatting.

## 🗂 Phase 4: Mount Test

```bash
mkdir -p /mnt/overlay
mount -t ext4 /dev/mmcblk0p3 /mnt/overlay
df -h | grep mmcblk0p3
```

You should see:

```
/dev/mmcblk0p3   9.7G   2.0M   9.2G   0% /mnt/overlay
```

This indicates successful mounting.

## 🧩 Phase 5: Set as System Overlay (Expansion Takes Effect)

1️⃣ Install required components:

```bash
opkg update
opkg install block-mount kmod-fs-ext4
```

2️⃣ Write mount configuration:

```bash
mkdir -p /overlay
uci set fstab.overlay=mount
uci set fstab.overlay.target='/overlay'
uci set fstab.overlay.device='/dev/mmcblk0p3'
uci set fstab.overlay.fstype='ext4'
uci set fstab.overlay.enabled='1'
uci commit fstab
```

3️⃣ Enable and reboot:

```bash
/etc/init.d/fstab enable
/etc/init.d/fstab start
reboot
```

## 🚀 Phase 6: Verify Expansion Success

After reboot, run:

```bash
mount | grep -E 'overlay|mmcblk0p3'
df -h
```

Output should be similar to:

```
/dev/mmcblk0p3 on /overlay type ext4 (rw,relatime)
overlayfs:/overlay on / type overlay (rw,noatime,lowerdir=/,upperdir=/overlay/upper,workdir=/overlay/work)
```

Space display:

```
Filesystem         Size  Used Avail Use% Mounted on
/dev/mmcblk0p3      9.7G  9.1M  9.2G   0% /overlay
overlayfs:/overlay  9.7G  9.1M  9.2G   0% /
```

✅ This indicates the system successfully uses `/dev/mmcblk0p3` as overlay.
Installed software, configurations, and cache are all written to the 10G partition.

---

## ⚙️ Phase 7: Optional Optimization

### (1) Disable journaling to reduce TF card writes:

```bash
tune2fs -O ^has_journal /dev/mmcblk0p3
e2fsck -f /dev/mmcblk0p3
```

### (2) Future expansion for more space:

If the TF card still has remaining free space, you can create `/dev/mmcblk0p4` again in cfdisk and mount it to `/mnt/data` or `/opt`.

---

## 🧱 Phase 8: Verify Software Installation Location

```bash
opkg update
opkg install htop
df -h
```

You will see the usage of `/` (overlay) increase, indicating that software is indeed installed into `/dev/mmcblk0p3`.

---

## ✅ Summary

> Create 10G partition via cfdisk → Format with mkfs.ext4 → Set `/overlay` in fstab → Reboot.
> System root directory automatically switches to 10G overlayfs.
> ImmortalWrt expansion successful, space persistently writable, install software freely 🚀.

---