# OpenClash Network Access Configuration

You can read this guide in the following order:

- first get OpenClash working and start using it
- then learn how to add your own direct/proxy rules
- finally review the built-in scenarios such as academic-library direct access, custom routing, LinkedIn fixes, and GitHub SSH port `22`

You only need to choose between these two supported OpenClash YAML files:

| File | Use case |
| --- | --- |
| [config_linkedin_auto.yaml](../../config_linkedin_auto.yaml) | Default choice for most users |
| [config_linkedin_auto_ssh22_redir.yaml](../../config_linkedin_auto_ssh22_redir.yaml) | Use only when GitHub SSH port `22` fails under OpenClash |

The older `config.yaml` and `config_linkedin.yaml` were legacy transition files and are now deprecated.

These YAMLs are useful starting points because they already include:

- room for your own custom `rules:` entries
- direct-routing ideas for academic libraries, so paper downloads need less proxy toggling
- a LinkedIn international-access fix
- automatic failover in the default config, so daily use needs less manual node switching

## What OpenClash Is

If this is your first time using OpenClash, the simplest way to think about it is:

- it is a common proxy plugin for OpenWrt / ImmortalWrt
- it gives you one place to manage subscriptions, nodes, DNS, routing rules, and policy groups
- after setup, you can decide which sites go direct and which sites go through a proxy

For most users, OpenClash is mainly used to:

- manage subscription links and nodes
- route home devices through proxy or split-routing rules
- send different websites to direct, proxy, or specific groups

You do not need to understand every internal detail before using it. Install the plugin, import the YAML, confirm a few UI settings, and you can already start using it.

## How To Download And Install OpenClash

Before installing, confirm two things:

1. whether your system is `24.10 and earlier` or `25.12+`
2. whether the package you downloaded matches both your system version and device architecture

There are two common ways to install it.

### Option 1: install directly from the system

If your firmware source already provides OpenClash, you can install it directly.

For `24.10 and earlier`:

```bash
opkg update
opkg install luci-app-openclash
```

For `25.12+`:

```bash
apk update
apk add luci-app-openclash
```

### Option 2: download a matching package and install it manually

If your package source does not include OpenClash, the usual path is to download a package that matches your system and then install it manually.

Check these points:

- the plugin build should match your OpenWrt / ImmortalWrt version
- the package architecture should match your device
- do not reuse the older `opkg/.ipk` flow on newer `apk` systems

Typical install commands:

```bash
# 24.10 and earlier
opkg install /tmp/example.ipk

# 25.12+
apk add --allow-untrusted /tmp/example.apk
```

After installation, the entry is usually available in LuCI under:

`Services -> OpenClash`

## Quick Start

1. Check your OpenWrt release:

```bash
cat /etc/openwrt_release
```

2. Use `opkg` on `24.10` and earlier, and `apk` on `25.12+`.

3. Edit your subscription URL:

```yaml
proxy-providers:
  Airport1:
    url: "your-subscription-url"
```

4. Import the YAML into OpenClash and apply it.

## Step 1 After Import: UI Settings For `config_linkedin_auto.yaml`

Do this first. Get the config working before you start customizing it.

- Disable `Bypass Mainland China / Bypass China`
- Disable DNS override options such as `Custom Upstream DNS`, `Respect-Rules`, and any appended upstream/default DNS options
- Do not change this config to `redir-host`; it is written around the `fake-ip` flow

The LinkedIn fix depends on three pieces working together:

- the `fake-ip-filter` exclusion
- the `cn_domain` exclusion
- explicit proxy rules for `linkedin.com`, `linkedin.cn`, `licdn.com`, and `lnkd.in`

`nameserver-policy` is not required in the current solution; it is kept only as a fallback idea.

## At This Point, You Can Already Use It

If your goal is simply to get OpenClash working and start using it, stopping after the steps above is already enough.

At this point you can already:

- import and enable the config
- start browsing through the proxy normally
- use the YAML's built-in routing behavior as-is

The rest of this guide is advanced customization. Use it as a self-check section if you want to:

- add extra direct/proxy rules
- understand how Steam, academic-library routing, LinkedIn, and SSH `22` are handled
- keep tuning the YAML for your own usage

## Advanced Custom Rules

The main place users should customize is the `rules:` block.

- put your own rules near the top of `rules:`
- keep them above broad `RULE-SET` entries
- remember that matching is top to bottom

Example:

```yaml
rules:
  - DOMAIN-SUFFIX,example.edu,DIRECT
  - DOMAIN-SUFFIX,example.com,🚀 默认代理
  - RULE-SET,private_ip,直连
  - RULE-SET,private_domain,直连
```

Common formats:

- `DOMAIN-SUFFIX,example.com,DIRECT`
- `DOMAIN,sub.example.com,DIRECT`
- `IP-CIDR,1.2.3.0/24,DIRECT,no-resolve`
- `DST-PORT,22,DIRECT`

Common targets:

- `DIRECT` or `直连`: direct connection
- `🚀 默认代理`: default proxy group
- `🤖 ChatGPT`: ChatGPT group
- `👨🏿‍💻 GitHub`: GitHub group

Examples:

```yaml
- DOMAIN-SUFFIX,library.example.edu,DIRECT
- DOMAIN-SUFFIX,openai.com,🤖 ChatGPT
- DOMAIN-SUFFIX,download.example.com,DIRECT
- DOMAIN-SUFFIX,www.example.com,🚀 默认代理
- DST-PORT,22,DIRECT
```

After editing:

1. save the YAML
2. re-upload it or replace the active config
3. reload/apply the config in OpenClash

## Built-In Scenarios In These YAML Files

### Steam: store via proxy, downloads via direct routing

The idea is not to force every Steam request into one routing mode. Instead:

- store/community pages can use proxy routing
- downloads and CN game-distribution resources stay direct where appropriate

This reduces manual switching and usually keeps downloads more suitable for local routing.

### Academic libraries: direct routing for institution IP recognition

The point of these direct rules is not just saving proxy traffic. The practical goal is to let academic platforms recognize your campus or institution egress IP more directly.

That reduces the need to repeatedly disable and re-enable the proxy just to download papers, and helps avoid the common case where the site opens but PDF/download permissions are identified incorrectly.

### LinkedIn international access

LinkedIn is only one built-in scenario, not the whole point of the guide. The config keeps the usual mainland-direct / non-mainland-proxy logic, but excludes LinkedIn from the mainland path and forces LinkedIn-related domains into the default proxy group.

## When To Use `config_linkedin_auto_ssh22_redir.yaml`

Use this file only when GitHub SSH `22` is broken and errors look like `Connection closed by remote host` or `kex_exchange_identification`.

Required UI settings:

- select [config_linkedin_auto_ssh22_redir.yaml](../../config_linkedin_auto_ssh22_redir.yaml)
- switch OpenClash mode to `Redir` or `redir-host`
- disable `TUN`
- keep `DST-PORT,22,DIRECT`
- still disable mainland-bypass and DNS override options

If you do not have an SSH `22` problem, keep using the default `config_linkedin_auto.yaml`.

## References

- OpenWrt `apk`: https://openwrt.org/docs/guide-user/additional-software/apk
- OpenWrt `opkg`: https://openwrt.org/docs/guide-user/additional-software/opkg
- OpenWrt `opkg -> apk` cheatsheet: https://openwrt.org/docs/guide-user/additional-software/opkg-to-apk-cheatsheet
- OpenClash maintenance notes: https://blog.dreamtobe.cn/openclash_maintain/
- Custom rules reference: https://github.com/Aethersailor/Custom_OpenClash_Rules
