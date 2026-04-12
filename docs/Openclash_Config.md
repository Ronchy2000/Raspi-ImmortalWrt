<a id="chinese"></a>
[🇨🇳 中文文档](#chinese) | [🇺🇸 English](#english)

# OpenClash 配置手册

这份手册按这个顺序来写：

- 先让用户用最短时间把 OpenClash 配好并直接用起来
- 再讲清楚怎么自己添加“直连”和“代理”规则
- 最后再介绍这两份 YAML 已经内置好的几个常见场景，例如文献库直连、自定义分流、LinkedIn 修复和 GitHub SSH `22`

## 先看结论

仓库现在只保留 2 份 OpenClash YAML：

| 文件 | 适合谁 | 界面要求 |
| --- | --- | --- |
| [config_linkedin_auto.yaml](../config_linkedin_auto.yaml) | 大多数人 | 保持 `fake-ip` 思路，关闭“绕过大陆”和 DNS 覆写类选项 |
| [config_linkedin_auto_ssh22_redir.yaml](../config_linkedin_auto_ssh22_redir.yaml) | GitHub SSH `22` 端口握手异常的人 | 使用 `Redir/redir-host`，关闭 `TUN`，同时保留 LinkedIn 配置 |

这两份配置的共同特点是：

- 支持用户自己在 `rules:` 里继续加直连或代理规则
- 已经内置了文献库直连思路，减少下载论文时频繁切换代理
- 已经处理了 LinkedIn 国际版访问问题
- 推荐版默认使用自动故障切换，日常不需要频繁手动切节点

如果你只是想正常代理上网，并能稳定打开国际版 LinkedIn，直接用 [config_linkedin_auto.yaml](../config_linkedin_auto.yaml)。

只有在下面这种情况才切到 [config_linkedin_auto_ssh22_redir.yaml](../config_linkedin_auto_ssh22_redir.yaml)：

```bash
ssh -T git@github.com
```

仍然报 `Connection closed by remote host`、`kex_exchange_identification` 之类的 `22` 端口握手错误。

## 旧 4 份文件现在怎么理解

你前面记混的 4 份文件，原本分工是这样的：

| 旧文件 | 原来作用 | 现在状态 |
| --- | --- | --- |
| `config.yaml` | 最早的基础模板，曾尝试用 `nameserver-policy` 修 LinkedIn | 已废弃，可删除 |
| `config_linkedin.yaml` | 在基础模板上改 LinkedIn，但仍偏手动切节点 | 已废弃，可删除 |
| `config_linkedin_auto.yaml` | 在 LinkedIn 修复版基础上，把常用分组改成自动故障切换 | 当前推荐 |
| `config_linkedin_auto_ssh22_redir.yaml` | 在自动版基础上，额外处理 GitHub SSH `22` 端口 | 当前保留 |

也就是说，现在不用再让用户在 `config.yaml` 和 `config_linkedin.yaml` 之间纠结了。

## 第 0 步：先判断你的系统版本

先 SSH 进去执行：

```bash
cat /etc/openwrt_release
```

重点看 `DISTRIB_RELEASE`：

- `24.10.x`、`23.x`、更早稳定版：按 `opkg` 路线
- `25.12.x`、后续新版本：按 `apk` 路线

常见命令：

```bash
# 24.10 及更早
opkg update
opkg install <package-name>

# 25.12 及更新
apk update
apk add <package-name>
```

不要把旧教程里的 `opkg install` 直接照搬到 `25.12+`。

## 第 1 步：准备 YAML

打开你要使用的配置文件，先把订阅链接改掉：

```yaml
proxy-providers:
  Airport1:
    url: "这里填写机场订阅"
```

只改这里即可，其余 LinkedIn 和 DNS 相关内容不要先动。

## 第 2 步：导入到 OpenClash

导入顺序很简单：

1. 打开 `OpenClash`
2. 进入 `配置文件订阅` 或 `配置文件管理`
3. 上传 YAML，或者把 YAML 放到 OpenClash 配置目录后在界面里选择
4. 切换到这份配置
5. 应用配置并启动 OpenClash

真正关键的不在“上传”，而在下面这些界面开关。

## 第 3 步：普通用户用 `config_linkedin_auto.yaml` 时，界面要怎么点

这一步应该先做。目标很简单：先把它用起来，再考虑后面按自己需求加规则。

### 必须确认的界面设置

1. **关闭“绕过中国大陆 / 绕过大陆”相关功能。**

原因不是这份 YAML 不做大陆直连，而是 OpenClash 界面里的这套功能会在插件层额外接管流量逻辑，可能导致 LinkedIn 还没按 YAML 里的排除规则处理，就先被系统链路改写，最终又跳回 `linkedin.cn`。

2. **关闭 DNS 覆写相关选项。**

至少确认这些是关闭状态：

- `自定义上游 DNS 服务器`
- `遵循规则（Respect-Rules）`
- `追加上游 DNS`
- `追加默认 DNS`
- 其他会覆盖配置文件 DNS 的选项

3. **不要把这份配置改成 `redir-host`。**

这份 YAML 按 `fake-ip` 思路写的，LinkedIn 的修复依赖这一套 DNS / fake-ip / rule 组合，不建议再手动改成 `redir-host`。

### 这份 YAML 实际做了什么

它并不是“特殊为 LinkedIn 单开一套完全不同的代理逻辑”，而是在原本“大陆直连 / 非大陆代理”的分流基础上，额外做了 3 件事：

1. 在 `fake-ip-filter` 里排除了 LinkedIn
2. 在 `cn_domain` 规则集中排除了 LinkedIn
3. 在 `rules:` 里把 `linkedin.com`、`linkedin.cn`、`licdn.com`、`lnkd.in` 单独指定到 `🚀 默认代理`

所以正常情况下：

- 大陆站点仍然走直连
- 其他非大陆站点仍然按原策略走代理
- LinkedIn 不会被“绕大陆”逻辑错误带回中国站

### 为什么现在不默认启用 `nameserver-policy`

当前方案里，`nameserver-policy` 只是备用兜底，不是必需项。

实测只要：

- 保留 `fake-ip-filter` 中这条规则  
  `geosite:cn:!linkedin.com:!linkedin.cn:!*.linkedin.com:!*.linkedin.cn`
- 关闭“绕过大陆”
- 关闭 DNS 覆写

就能正常访问国际版 LinkedIn。

而且目前这套配置里，直接使用运营商 DNS 往往比强行指定 `1.1.1.1`、`8.8.8.8` 更快。

> 到这里就可以安心使用了

如果你只是想先把 OpenClash 配好并正常使用，那么做到前面第 `1` 到第 `3` 步就已经够了。

也就是说，到这里你已经可以：

- 正常导入并启用配置
- 直接开始代理上网
- 使用当前 YAML 内置的默认分流能力

后面的内容属于进阶配置，主要面向这些需求：

- 想自己额外添加直连或代理规则
- 想理解 Steam、文献库、LinkedIn、SSH `22` 这些场景是怎么实现的
- 想在现有 YAML 基础上继续按自己的使用习惯微调

---

## 进阶配置：自己改 `rules:`

真正值得掌握的，不是“怎么上传 YAML”，而是“以后我想让哪个网站直连，哪个网站走代理，应该加到哪里”。

结论先说：

- 主要改 `rules:` 区块
- 你自己新增的规则，尽量放在前面
- 通用 `RULE-SET` 往往放在后面，所以你的自定义规则应该写在它们前面

### 应该加在哪里

就在 YAML 的 `rules:` 下面加，优先放在 `# Custom` 附近，也就是这些通用规则之前：

```yaml
rules:
  # 先放你自己的规则
  - DOMAIN-SUFFIX,example.edu,DIRECT
  - DOMAIN-SUFFIX,example.com,🚀 默认代理

  # 后面才是通用规则集
  - RULE-SET,private_ip,直连
  - RULE-SET,private_domain,直连
```

原因很简单：OpenClash 按“从上到下”匹配，前面命中就不会继续往后看。

### 最常用的格式怎么写

1. **整站或某个主域名都按同一策略处理**

用 `DOMAIN-SUFFIX`：

```yaml
- DOMAIN-SUFFIX,example.com,DIRECT
- DOMAIN-SUFFIX,example.com,🚀 默认代理
```

适合：

- `linkedin.com`
- `nature.com`
- `steamserver.net`

2. **只匹配一个精确域名**

用 `DOMAIN`：

```yaml
- DOMAIN,sub.example.com,DIRECT
- DOMAIN,api.example.com,🤖 ChatGPT
```

适合只想命中某一个子域名，而不想影响整个主域名的场景。

3. **按 IP 段处理**

用 `IP-CIDR`：

```yaml
- IP-CIDR,1.2.3.0/24,DIRECT,no-resolve
```

这类写法一般用于你已经明确知道某段 IP 必须直连或必须代理的情况。

4. **按端口处理**

用 `DST-PORT`：

```yaml
- DST-PORT,22,DIRECT
```

这就是 GitHub SSH `22` 修复版里使用的写法。

### 规则最后一列填什么

最后一列就是“交给哪个策略组”：

- `DIRECT` 或 `直连`：直接连接，不走代理
- `🚀 默认代理`：交给默认代理组
- `🤖 ChatGPT`：交给 ChatGPT 分组
- `👨🏿‍💻 GitHub`：交给 GitHub 分组

如果你只是想让某个网站正常翻墙，通常直接写到 `🚀 默认代理` 就够了。

### 给几个最常见的例子

1. **学校或机构网站直连**

```yaml
- DOMAIN-SUFFIX,example.edu.cn,DIRECT
- DOMAIN-SUFFIX,library.example.edu,DIRECT
```

2. **某些 AI 或海外服务强制代理**

```yaml
- DOMAIN-SUFFIX,openai.com,🤖 ChatGPT
- DOMAIN-SUFFIX,anthropic.com,🚀 默认代理
```

3. **某个下载站直连，但官网走代理**

```yaml
- DOMAIN-SUFFIX,download.example.com,DIRECT
- DOMAIN-SUFFIX,www.example.com,🚀 默认代理
```

4. **只给单一端口直连**

```yaml
- DST-PORT,22,DIRECT
```

### 改完后怎么生效

1. 保存 YAML
2. 重新上传到 OpenClash，或者替换当前配置文件
3. 在 OpenClash 里重新应用或重载配置

如果改了规则但没重载，效果通常不会立刻变化。

## 这两份 YAML 已经内置了哪些常见场景

前面讲的是“你以后怎么自己加规则”。下面这些则是这两份 YAML 已经帮你处理好的常见用法。

### 1. Steam：商店代理，下载直连

这类需求的核心不是“所有 Steam 流量都必须同一种处理方式”，而是不同部分按用途分开：

- 商店、社区、海外页面可以走代理
- 下载分发、国内游戏相关资源尽量直连

这样做的好处是：

- 浏览和访问海外页面更稳定
- 下载速度通常更合适
- 不需要频繁手动在“全局代理 / 直连”之间来回切

当前配置里已经内置了这类直连规则，例如：

```yaml
- GEOSITE,category-games@cn,DIRECT
- DOMAIN-SUFFIX,steamserver.net,DIRECT
- DOMAIN-SUFFIX,cm.steampowered.com,DIRECT
```

如果你后续还想补更多 Steam 相关规则，就继续按前面 `rules:` 的写法追加即可。

### 2. 文献库直连

这里的思路不是“为了省代理流量”，而是让文献站点尽量直接识别你当前校园网、机构网或已有授权网络的出口 IP。

这样做的实际意义是：

- 打开文献库时更容易被识别为学校或机构网络
- 下载论文时不需要频繁手动关代理、开代理来回切换
- 避免出现“首页能打开，但 PDF 下载权限识别不对”的情况

当前配置里已经内置了这些直连示例：

```yaml
- DOMAIN-SUFFIX,dl.acm.org,DIRECT
- DOMAIN-SUFFIX,ieeexplore.ieee.org,DIRECT
- DOMAIN-SUFFIX,sciencedirect.com,DIRECT
- DOMAIN-SUFFIX,nature.com,DIRECT
- DOMAIN-SUFFIX,science.org,DIRECT
```

如果你学校还有别的数据库、图书馆站点，也按同样方式往 `rules:` 里加即可。

### 3. LinkedIn 国际版访问

LinkedIn 只是这份配置的一个现成场景，不是整篇文档的重点。

它当前的处理方式是：

- 保留“大陆直连 / 非大陆代理”的主分流思路
- 但把 LinkedIn 从大陆分流逻辑里单独排除
- 再通过显式规则让 `linkedin.com`、`linkedin.cn`、`licdn.com`、`lnkd.in` 走 `🚀 默认代理`

因此只要不乱改 DNS、`fake-ip-filter`、`cn_domain` 和 LinkedIn 规则，通常就可以稳定访问国际版 LinkedIn。

## 什么时候用 `config_linkedin_auto_ssh22_redir.yaml`

只有你明确遇到 GitHub SSH `22` 端口问题时，才切到这一份。

典型现象：

```bash
ssh -vvT git@github.com
```

出现：

```text
kex_exchange_identification: Connection closed by remote host
Connection closed by 20.205.x.x port 22
```

### 这份 SSH22 配置比默认版多了什么

它在保留 LinkedIn 配置的同时，额外做了两件事：

- `tun.enable: false`
- 在 `rules:` 前部加入 `DST-PORT,22,DIRECT`

### 界面里要怎么配

1. 配置文件选择 [config_linkedin_auto_ssh22_redir.yaml](../config_linkedin_auto_ssh22_redir.yaml)
2. `OpenClash -> 模式设置` 中使用 `Redir` 或 `redir-host`
3. 不要开启 `TUN`
4. 仍然关闭“绕过中国大陆 / 绕过大陆”
5. 仍然关闭 DNS 覆写相关选项

这份文件不是给所有人常驻替换默认版的，而是给 `SSH 22` 这类特殊场景准备的兼容版。

## 哪些配置不要乱动

如果你当前 LinkedIn 已经正常，就尽量不要随便改下面这些地方：

- `dns:` 整块
- `fake-ip-filter` 里的 LinkedIn 排除项
- `cn_domain` 的 LinkedIn 过滤
- `rules:` 里 LinkedIn 的单独代理规则

这些内容是联动的。只改其中一处，最容易把“又跳到中国站”“又不按预期分流”重新改回来。

## 常见问题

### 1. 为什么我还是在手动切节点

先检查两件事：

- 你导入的是不是 [config_linkedin_auto.yaml](../config_linkedin_auto.yaml)
- 当前生效配置是不是它，而不是旧配置

### 2. 为什么 LinkedIn 又跳到中国区了

优先看这几项：

- 有没有把“绕过大陆”重新打开
- 有没有开启 DNS 覆写
- 有没有改动 `fake-ip-filter`、`cn_domain`、LinkedIn 规则

### 3. 为什么 GitHub SSH 还是不通

确认这 4 项是不是同时满足：

- 使用的是 [config_linkedin_auto_ssh22_redir.yaml](../config_linkedin_auto_ssh22_redir.yaml)
- OpenClash 模式已经切到 `Redir/redir-host`
- `TUN` 已关闭
- `DST-PORT,22,DIRECT` 没被删掉

## 官方参考

- OpenWrt `apk` 文档：https://openwrt.org/docs/guide-user/additional-software/apk
- OpenWrt `opkg` 文档：https://openwrt.org/docs/guide-user/additional-software/opkg
- OpenWrt `opkg -> apk` 对照表：https://openwrt.org/docs/guide-user/additional-software/opkg-to-apk-cheatsheet
- OpenClash 维护参考：https://blog.dreamtobe.cn/openclash_maintain/
- 自定义 OpenClash 规则参考：https://github.com/Aethersailor/Custom_OpenClash_Rules

## 图示

- OpenClash 更新

![](../figures/Openclash_config/openclashUpdate.png)

- OpenClash 备份

![](../figures/Openclash_config/openclashBackup.png)

---

<a id="english"></a>
[🇨🇳 中文文档](#chinese) | [🇺🇸 English](#english)

# OpenClash Guide

This guide follows the shortest practical path:

- get OpenClash working first
- then learn how to add your own direct/proxy rules
- then review the built-in scenarios such as academic-library direct access, custom routing, LinkedIn fixes, and GitHub SSH port `22`

This repo now keeps only two supported YAML files:

| File | Use case |
| --- | --- |
| [config_linkedin_auto.yaml](../config_linkedin_auto.yaml) | Default choice for most users |
| [config_linkedin_auto_ssh22_redir.yaml](../config_linkedin_auto_ssh22_redir.yaml) | Use only when GitHub SSH port `22` fails under OpenClash |

`config.yaml` and `config_linkedin.yaml` were legacy transition files and are now deprecated.

These YAMLs are useful starting points because they already include:

- room for your own custom `rules:` entries
- direct-routing ideas for academic libraries, so paper downloads need less proxy toggling
- a LinkedIn international-access fix
- automatic failover in the default config, so daily use needs less manual node switching

## Quick Start

1. Check your OpenWrt release:

```bash
cat /etc/openwrt_release
```

2. Use `opkg` for `24.10` and earlier, `apk` for `25.12+`.

3. Edit the subscription URL in the YAML:

```yaml
proxy-providers:
  Airport1:
    url: "your-subscription-url"
```

4. Import the YAML into OpenClash and apply it.

## Step 1 After Import: UI Settings For `config_linkedin_auto.yaml`

Do this first. Get the config working before you start customizing it.

- Keep the YAML's `fake-ip` logic
- Disable `Bypass Mainland China / Bypass China`
- Disable DNS override options such as `Custom Upstream DNS`, `Respect-Rules`, and any appended upstream/default DNS options
- Do not switch this config to `redir-host`

The LinkedIn fix depends on the combination of:

- the `fake-ip-filter` exclusion
- the `cn_domain` exclusion
- explicit proxy rules for `linkedin.com`, `linkedin.cn`, `licdn.com`, and `lnkd.in`

`nameserver-policy` is not required in the current solution; it remains only as a fallback idea.

## Step 2: Custom Rules

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

## Step 3: Built-In Scenarios In These YAML Files

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

## Step 4: When To Use `config_linkedin_auto_ssh22_redir.yaml`

Use this file only when GitHub SSH `22` is broken and errors look like `Connection closed by remote host` or `kex_exchange_identification`.

- Select [config_linkedin_auto_ssh22_redir.yaml](../config_linkedin_auto_ssh22_redir.yaml)
- Switch OpenClash mode to `Redir` or `redir-host`
- Disable `TUN`
- Keep `DST-PORT,22,DIRECT`
- Still disable mainland-bypass and DNS override options

## Notes

- If LinkedIn works, avoid changing the `dns`, `fake-ip-filter`, `cn_domain`, and LinkedIn-specific rules.
