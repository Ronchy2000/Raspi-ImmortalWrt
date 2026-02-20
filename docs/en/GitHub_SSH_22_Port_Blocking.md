# GitHub SSH Port 22 Blocking: Troubleshooting Notes

## 1. Example Network (Not a Prerequisite)

| Device | IP | Role |
| --- | --- | --- |
| ONT/Modem | 192.168.1.1 | Management only |
| Main Router | 192.168.1.2 | PPPoE uplink |
| ImmortalWrt (Raspberry Pi 4B) | 192.168.1.5 | OpenClash |
| Windows PC | 192.168.1.157 | Gateway/DNS -> 192.168.1.5 |

OpenClash at that time:
- Mode: `TUN`
- Rule mode: `Rule`

Note: this is not a "bypass-router-only" issue. It can happen in both bypass-router and main-router deployments when OpenClash is in use.

## 2. Symptom

```bash
ssh -vvT git@github.com
```

Output:

```text
kex_exchange_identification: Connection closed by remote host
Connection closed by 20.205.243.166 port 22
```

`git pull` failed in the same way.

## 3. Investigation

1. Routing was correct  
Default route on Windows was `192.168.1.5`, so traffic was going through the soft router.

2. Rule existed  
`DST-PORT,22,👨🏿‍💻 GitHub` had already been added.

3. Still blocked  
In this setup, SSH on port 22 was not reliably handled as expected in `TUN` mode, and the handshake was closed early.

## 4. Working Fix

### Switch OpenClash mode

Change from `TUN` to `redir-host` (or `Redir`):

- `OpenClash -> Mode Settings`
- Select `redir-host` (or `Redir`)

### Add direct rule for port 22

```yaml
- DST-PORT,22,DIRECT
```

Path:

- `OpenClash -> Rule Settings -> Custom Rules`

Then verify:

```bash
ssh -T git@github.com
```

## 5. Why It Works

- `redir-host`/`Redir` uses redirect-based traffic handling and can avoid some SSH:22 handling issues seen under `TUN` in real deployments.
- `DIRECT` for port 22 avoids proxy-chain interference for SSH.

## 6. Repo Config Added

Reference config in this repo:

- `config_linkedin_auto_ssh22_redir.yaml`

Included changes:

- `tun.enable: false` (aligned with Redir)
- `- DST-PORT,22,DIRECT`

## 7. Conclusion

This is a common OpenClash issue pattern and should not be treated as topology-specific.  
A practical fix is:

1. Switch to `redir-host` (or `Redir`) mode
2. Add `DIRECT` for port 22
