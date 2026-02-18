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
