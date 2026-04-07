# ImmortalWrt Overlay and Extroot Expansion (Advanced)

This guide only applies when:

- you are sure the router is using a `squashfs` image
- `mount` shows `overlayfs:/overlay on / type overlay`
- the actual limitation is writable package space in `/overlay`

If you currently see:

```text
/dev/root on / type ext4
```

stop here and go back to:

- [Storage Expansion and Partitioning Guide](./Storage_Expansion_Guide.md)

For an `ext4` root filesystem, the correct path is usually root partition expansion, not `extroot`.

## Core idea

`extroot` does not simply mean “add another partition”.

It means:

**move the writable layer of a `squashfs` system to a new ext4 partition.**

That is why it is very different from adding a normal data partition.  
If the migration is incomplete, the router may reboot into a state that looks like:

- configuration loss
- missing packages
- a reset-like first boot

## When `extroot` is worth considering

Continue only when all of the following are true:

1. the router is still on `squashfs + overlay`
2. `/overlay` is frequently too small for package installs
3. you already created a backup
4. you are prepared to roll back if needed

If your real goal is only to:

- make room for Git repositories
- store backup archives
- keep large OpenClash assets

choose the data partition route instead of `extroot`.

## Confirm the starting point

Run:

```bash
mount | grep overlay
df -h
block info
```

If you do not see `overlayfs:/overlay`, this guide is not the right one for your system.

## Preparation

### 1. Back up first

```bash
sysupgrade -b /tmp/pre-extroot-$(date +%F).tar.gz
```

### 2. Install the required tools

First identify your OpenWrt branch:

- `OpenWrt 24.10 and earlier stable releases`: use `opkg`
- `OpenWrt 25.12 and newer`: use `apk`

For `24.10 and earlier`:

```bash
opkg update
opkg install block-mount kmod-fs-ext4 e2fsprogs fdisk cfdisk rsync
```

For `25.12 and newer`:

```bash
apk update
apk add block-mount kmod-fs-ext4 e2fsprogs fdisk cfdisk rsync
```

If `rsync` is unavailable in your feed, use `cp -a` later instead.

### 3. Confirm there is actual free space

```bash
fdisk -l /dev/mmcblk0
```

Only continue after confirming that unallocated space really exists on the card.

## Step 1: create the ext4 partition

```bash
cfdisk /dev/mmcblk0
```

Order of operations:

1. select `Free space`
2. choose `[ New ]`
3. enter a size such as `8G`
4. keep the type as `Linux`
5. choose `[ Write ]`
6. type `yes`
7. choose `[ Quit ]`

Assume the new partition is:

```text
/dev/mmcblk0p3
```

## Step 2: format the new partition

```bash
umount /dev/mmcblk0p3 2>/dev/null
mkfs.ext4 -L extroot /dev/mmcblk0p3
e2fsck -f /dev/mmcblk0p3
```

If the command warns that the partition already contains a filesystem, stop and inspect before formatting.

## Step 3: temporary mount

```bash
mkdir -p /mnt/extroot
mount -t ext4 /dev/mmcblk0p3 /mnt/extroot
df -h | grep mmcblk0p3
```

## Step 4: migrate the current overlay data

This is the critical step.

Prepare the directories first:

```bash
mkdir -p /mnt/extroot/upper
mkdir -p /mnt/extroot/work
```

Preferred method with `rsync`:

```bash
rsync -aHAX /overlay/ /mnt/extroot/
sync
```

Fallback with `cp`:

```bash
cp -a /overlay/. /mnt/extroot/
sync
```

Inspect the result:

```bash
ls -la /mnt/extroot
```

You should at least see:

- `upper`
- `work`

## Step 5: write the `fstab` entry by UUID

```bash
UUID="$(block info /dev/mmcblk0p3 | sed -n 's/.*UUID=\"\\([^\"]*\\)\".*/\\1/p')"
echo "$UUID"
```

Then configure:

```bash
uci set fstab.extroot=mount
uci set fstab.extroot.target='/overlay'
uci set fstab.extroot.uuid="$UUID"
uci set fstab.extroot.fstype='ext4'
uci set fstab.extroot.enabled='1'
uci commit fstab

/etc/init.d/fstab enable
```

## Step 6: reboot and verify

```bash
reboot
```

After reboot:

```bash
mount | grep -E 'overlay|mmcblk0p3'
df -h
```

A successful result typically looks like:

```text
/dev/mmcblk0p3 on /overlay type ext4
overlayfs:/overlay on / type overlay
```

## If the router looks “reset” after reboot

Check these items first:

1. was `/dev/mmcblk0p3` really mounted on `/overlay`
2. is the `UUID` in `fstab` correct
3. was `/overlay` fully copied into the new partition before reboot
4. do `upper` and `work` exist on the new partition

## Why disabling the ext4 journal is not recommended

You may see other tutorials suggesting:

```bash
tune2fs -O ^has_journal /dev/mmcblk0p3
```

For a long-running router, this is usually not worth it.

Why:

- the write reduction is limited
- the failure risk after power loss or abnormal reboot is higher

## One-line reminder

The important part of `extroot` is not just “mounting the new partition”.

It is **migrating the old overlay correctly**.

If you only need more room for repositories, backup archives, or large files, go back to:

- [Storage Expansion and Partitioning Guide](./Storage_Expansion_Guide.md)
