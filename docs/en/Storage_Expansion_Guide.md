# ImmortalWrt Storage Expansion and Partitioning Guide

This guide answers the three questions that usually get mixed together:

1. Are you running an `ext4` image or a `squashfs` image?
2. Should you expand the root partition, create a separate data partition, or use `extroot`?
3. Which commands are safe to run directly, and when should you stop and inspect first?

Read this page first if any of these apply:

- `git clone` fails because storage is too small
- you plan to install iStore, OpenClash, quickstart, or many other packages
- backup archives, rule files, or repositories keep growing
- you are not sure whether `/overlay` should be touched

## Start with the conclusion

On Raspberry Pi, the safe path usually depends on the image type:

- If the system already boots as an `ext4` root filesystem and you want many plugins, expand the root partition.
- If the system is `squashfs + overlay` and you mainly need room for repositories, archives, or large files, create a separate data partition.

`extroot` is not the default answer. It only makes sense on the `squashfs` path and only after you confirm that this is really your layout.

## Step 1: identify your current system type

Run:

```bash
mount
df -h
block info
```

1. If you see an `ext4` root filesystem

If the output looks like:

```text
/dev/root on / type ext4
```

your system is using:

- an `ext4` image
- a root partition mounted directly on `/`
- packages, configs, and plugins written directly to that root partition

In this case, when space is tight, the preferred path is:

**expand the root partition, not `/overlay` and not `extroot`.**

2. If you see `squashfs + overlay`

If the output looks like:

```text
overlayfs:/overlay on / type overlay
```

your system is using:

- a `squashfs` image
- a read-only system layer
- a writable layer mounted at `/overlay`

In this case:

- choose a data partition first if you only need more storage
- choose `extroot` only when `/overlay` itself is too small for packages

## Quick glossary

If terms such as `rootfs`, `/overlay`, or `extroot` slow you down, read this section first. If you already know them, you can jump straight to Step 2.

1. **Partition**

A TF card is one physical storage device. A partition splits it into logical areas, for example `p1` for boot files, `p2` for the operating system, and `p3` for your own data.

2. **Filesystem**

A partition is only a chunk of space until it is formatted. Common filesystems on ImmortalWrt include `ext4` and `vfat`.

3. **Mounting**

Mounting attaches a partition to a directory in the system tree. For example, if you mount `/dev/mmcblk0p3` to `/srv/storage`, then `/srv/storage` becomes the entry point to that partition.

4. **`rootfs`**

`rootfs` is the filesystem that provides the root directory `/`.

5. **`/overlay`**

`/overlay` is the writable layer commonly used by `squashfs` images. Many package installs and configuration changes end up there.

6. **`extroot`**

`extroot` does not simply add another partition. It means moving the writable layer of a `squashfs` system to a larger ext4 partition, which is why it is more sensitive than creating a separate data partition.

## Step 2: choose the route before you run `mkfs`

| Goal | Current system | Recommended path | Beginner-safe |
|---|---|---|---|
| Install many plugins and make `/` much larger | `ext4` root filesystem | Expand root partition `p2` | Yes |
| Store repositories, backup archives, and large files | `squashfs` or `ext4` | Create a data partition and mount it at `/srv/storage` | Yes |
| Increase writable package space on a `squashfs` image | `squashfs + overlay` | `extroot` | No, advanced only |

## Route A: expand the `ext4` root partition

Use this path when:

- you flashed an `ext4` image
- `mount` shows `/dev/root on / type ext4`
- you plan to install iStore, OpenClash, quickstart, Git, and other packages

In practice, if you are already on an `ext4` root filesystem, this is usually the most direct and stable route.

Advantages:

- simpler layout
- easier to reason about during boot
- no need to introduce `extroot`
- a better fit for plugin-heavy Raspberry Pi setups

Follow this route in order. Do not skip straight to partition changes.

1. **Back up first, and clear stale mount settings.**

Run:

```bash
sysupgrade -b /boot/pre-expand-$(date +%F).tar.gz

uci delete fstab.overlay 2>/dev/null
uci commit fstab
/etc/init.d/fstab restart
```

Why:

- the first command creates a config backup
- the next commands remove stale `extroot` settings so the router does not try to mount `/overlay` incorrectly on the next boot

2. **Then install the required tools.**

First identify your OpenWrt branch:

- `OpenWrt 24.10 and earlier stable releases`: use `opkg`
- `OpenWrt 25.12 and newer`: use `apk`

For `24.10 and earlier`:

```bash
opkg update
opkg install parted losetup resize2fs blkid e2fsprogs
```

For `25.12 and newer`:

```bash
apk update
apk add parted losetup resize2fs blkid e2fsprogs
```

3. **Then confirm the current partition layout.**

```bash
parted -l -s
```

If you see something like:

```text
Number  Start   End     Size    Type     File system  Flags
 1      4194kB  71.3MB  67.1MB  primary  fat16        boot, lba
 2      75.5MB  390MB   315MB   primary  ext4
```

and the total disk size is much larger than `p2`, there is unallocated space available for expansion.

4. **Once you confirm expansion is possible, choose offline or online.**

If you can power off and move the TF card to another computer, offline expansion is the safer method.

Recommended flow:

1. power off and remove the TF card
2. open it in `GParted`, `DiskGenius`, or an equivalent partition tool
3. select `mmcblk0p2`
4. extend it to near the end of the card
5. apply the change and eject the card safely
6. boot the Raspberry Pi again
7. then run:

```bash
e2fsck -f /dev/mmcblk0p2
resize2fs /dev/mmcblk0p2
df -h
```

If you must do it online, the OpenWrt official expansion script is the safer software path:

```bash
cd /root
wget -U "" -O expand-root.sh "https://openwrt.org/_export/code/docs/guide-user/advanced/expand_root?codeblock=0"
. ./expand-root.sh
sh /etc/uci-defaults/70-rootpt-resize
```

This normally happens in stages:

- `70-rootpt-resize`: expand the root partition first, then trigger an automatic reboot
- `80-rootfs-resize`: after the system comes back, resize the ext4 filesystem, and it may reboot once more if needed

Before you run it, make sure:

- power is stable
- you are not gambling on an unattended remote site
- you already have a backup

There are a few details here that matter a lot:

1. If the SSH session drops soon after `sh /etc/uci-defaults/70-rootpt-resize`, and the router reboots automatically, that is usually normal.
2. Do not assume failure just because the first `df -h` after reconnect still shows a few hundred MB. Online expansion is staged, and partition expansion does not always finish at the exact same moment as filesystem expansion.
3. The safer way to judge the result is: wait for the reboot to finish, log in again, check `parted -l -s` first, and then check `df -h`. If `p2` has already grown to the end of the card but `/dev/root` is still small, run:

```bash
sh /etc/uci-defaults/80-rootfs-resize
reboot
```

4. If `70-rootpt-resize` does not trigger a reboot and `parted -l -s` still shows the old partition size, do not guess that it "probably worked". Check dependencies, marker files, and the actual partition state first:

```bash
type parted losetup resize2fs blkid
parted -l -s
ls -l /etc/uci-defaults/70-rootpt-resize /etc/uci-defaults/80-rootfs-resize /etc/rootpt-resize /etc/rootfs-resize 2>/dev/null
```

5. **Verify the result before moving on.**

Run:

```bash
mount
df -h
block info
```

If you used the online method, read the result in this order as well:

1. `parted -l -s`: confirm that `mmcblk0p2` has grown close to the end of the card
2. `df -h`: confirm that `/dev/root` has actually become larger
3. `mount` and `block info`: confirm that the root partition is still mounted correctly as `ext4`

Success usually looks like:

- `/dev/root on / type ext4`
- `/` is now much larger, often close to the full SD card size

Example:

```text
Filesystem                Size      Used Available Use% Mounted on
/dev/root                29.3G    114.5M     29.2G   0% /
```

After verification, it is reasonable to continue with:

```bash
cd /root
git clone https://github.com/Ronchy2000/Immortalwrt-AutoBackup.git
```

and then install iStore, OpenClash, quickstart, and similar packages.

Suggested order:

1. confirm `df -h` shows the larger root filesystem
2. configure Git and backups first
3. install iStore and the rest afterwards
4. create a backup before major changes

## Route B: create a data partition and mount it at `/srv/storage`

Use this path when:

- the main shortage is repository space, backup space, or large-file space
- you do not want to change the root filesystem layout
- you want Git repos, archives, and large rule files to live in a separate area

This route is for the case where you want to leave the system layout alone and move repositories, backups, and large files elsewhere.

If your situation looks more like:

- `git clone` does not fit
- automatic backup archives keep growing
- rules, downloads, or media consume space

this route is usually more stable than `extroot`.

This route should also be done in order. Do not start by running `mkfs.ext4`.

1. **Inspect the current state first.**

Run:

```bash
mount
df -h
block info
uci show fstab
parted -l -s
```

If you discover:

- `mmcblk0p3` already exists
- or `mkfs.ext4` warns `contains a ext4 file system labelled 'overlay'`

stop there. Do not format the partition until you confirm whether it is already used by the system.

2. **Only after that should you install the required tools.**

First identify your OpenWrt branch:

- `OpenWrt 24.10 and earlier stable releases`: use `opkg`
- `OpenWrt 25.12 and newer`: use `apk`

For `24.10 and earlier`:

```bash
opkg update
opkg install block-mount kmod-fs-ext4 e2fsprogs fdisk cfdisk
```

For `25.12 and newer`:

```bash
apk update
apk add block-mount kmod-fs-ext4 e2fsprogs fdisk cfdisk
```

3. **Then create the partition.**

```bash
cfdisk /dev/mmcblk0
```

Steps:

1. select `Free space`
2. choose `[ New ]`
3. enter the size you want
4. keep the type as `Linux`
5. choose `[ Write ]`
6. type `yes`
7. choose `[ Quit ]`

Assume the new partition is:

```text
/dev/mmcblk0p3
```

4. **Format it and test-mount it first.**

```bash
umount /dev/mmcblk0p3 2>/dev/null
mkfs.ext4 -L storage /dev/mmcblk0p3
e2fsck -f /dev/mmcblk0p3

mkdir -p /srv/storage
mount -t ext4 /dev/mmcblk0p3 /srv/storage
df -h | grep mmcblk0p3
```

5. **Once that works, configure boot-time mounting.**

```bash
UUID="$(block info /dev/mmcblk0p3 | sed -n 's/.*UUID=\"\\([^\"]*\\)\".*/\\1/p')"
echo "$UUID"
```

If that prints a UUID, continue with:

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

6. **Verify again after reboot.**

```bash
mount | grep srv/storage
df -h
```

After that, organize the directory layout:

```bash
mkdir -p /srv/storage/repos
mkdir -p /srv/storage/backups
mkdir -p /srv/storage/openclash
```

Example:

```bash
cd /srv/storage/repos
git clone https://github.com/Ronchy2000/Immortalwrt-AutoBackup.git
```

If you still want the old `/root` path, create a symlink:

```bash
ln -s /srv/storage/repos/Immortalwrt-AutoBackup /root/Immortalwrt-AutoBackup
```

## Route C: only consider `extroot` under these conditions

Only consider `extroot` when all of these are true:

1. you are certain the router is still on the `squashfs + overlay` path
2. the actual problem is writable package space in `/overlay`
3. you already have a full backup
4. you know how to back out if migration fails

See:

- [Overlay / Extroot Expansion (Advanced)](./ExtendOverlaySize.md)

## Situations where you should stop and reassess

1. **`mkfs.ext4` reports an existing `overlay`.**

Example:

```text
/dev/mmcblk0p3 contains a ext4 file system labelled 'overlay'
```

That usually means the partition has already been used.

Do not continue formatting. Check first:

```bash
mount
df -h
block info
uci show fstab
```

2. **You are already on `ext4` root but still plan to follow an `extroot` tutorial.**

If `mount` shows:

```text
/dev/root on / type ext4
```

do not use the `extroot` guide.

3. **Installing many packages before verifying the storage state.**

Check first:

```bash
df -h
```

Make sure `/` or `/srv/storage` is ready before installing iStore, OpenClash, Git, or large rule sets.

## If the system behaves abnormally after partition changes, check in this order

Check in this order:

1. leftover `/overlay` mount settings: `uci show fstab`
2. root filesystem mount state: `mount`
3. actual free space: `df -h`
4. partition recognition: `block info`
5. recent logs: `logread | tail -50`

If the router no longer boots correctly, the fastest recovery path is usually:

1. reflash a known-good image
2. restore your backup after the first boot
3. return to this guide and re-check which route matches your actual system type

## What to read next

1. read this guide first to identify the system type and choose a route
2. if you only need backup and restore, continue with [OpenWrt_Backup_Resotre.md](./OpenWrt_Backup_Resotre.md)
3. for ongoing operations, continue with [System_Maintenance.md](./System_Maintenance.md)
4. open [ExtendOverlaySize.md](./ExtendOverlaySize.md) only after confirming you are on `squashfs + overlay`
