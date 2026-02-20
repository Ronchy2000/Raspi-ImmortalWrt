# GitHub SSH 22 端口被拦截：排查与解决记录

## 1. 示例网络环境（非问题前提）

家庭网络结构如下：

| 设备 | IP | 作用 |
| --- | --- | --- |
| 光猫 | 192.168.1.1 | 保留后台 |
| 主路由 | 192.168.1.2 | 拨号上网 |
| 软路由 ImmortalWrt（树莓派 4B） | 192.168.1.5 | OpenClash |
| Windows PC | 192.168.1.157 | 默认网关和 DNS 指向 192.168.1.5 |

当时 OpenClash 为：
- 模式：`TUN`
- 代理模式：`规则模式`

说明：该问题不是“旁路由专属问题”。无论是旁路由还是软路由做主路由，只要使用 OpenClash，均可能出现 SSH 22 端口握手被断开的情况。

## 2. 问题现象

执行：

```bash
ssh -vvT git@github.com
```

出现：

```text
kex_exchange_identification: Connection closed by remote host
Connection closed by 20.205.243.166 port 22
```

`git pull` 同样失败。

## 3. 排查过程

1. 路由确认正常  
Windows 默认路由为 `192.168.1.5`，说明流量确实经软路由转发。

2. Clash 规则已存在  
已添加 `DST-PORT,22,👨🏿‍💻 GitHub`，理论上应走代理。

3. 实际仍被拦截  
在 `TUN` 模式下，22 端口连接可能未按预期进入规则链，最终表现为 SSH 握手被提前断开。

## 4. 最终可行方案

### OpenClash 模式切换

将 OpenClash 从 `TUN` 改为 `redir-host`（或 `Redir`）：

- 入口：`OpenClash -> 模式设置`
- 选择：`redir-host`（或 `Redir`）模式

### 22 端口单独直连

在自定义规则中加入：

```yaml
- DST-PORT,22,DIRECT
```

规则入口：

- `OpenClash -> 规则设置 -> 自定义规则`

保存并应用后验证：

```bash
ssh -T git@github.com
```

## 5. 原理简述

- `redir-host`/`Redir` 模式基于重定向链路转发，可规避 `TUN` 下 SSH 22 端口在部分环境中的异常处理问题。
- 对 `22` 端口使用 `DIRECT`，避免 SSH 流量被代理链路和节点策略干扰。

## 6. 本仓库对应配置

已提供可直接参考的配置文件：

- `config_linkedin_auto_ssh22_redir.yaml`

该文件基于 `config_linkedin_auto.yaml`，已包含：

- `tun.enable: false`（与 Redir 方案一致）
- `- DST-PORT,22,DIRECT` 规则

## 7. 结论

这是 OpenClash 使用中的一类通用问题，不应被特殊化为某一种拓扑才会发生。  
实测可行方案是：

1. 切换到 `redir-host`（或 `Redir`）模式
2. 为 `22` 端口添加 `DIRECT` 规则
