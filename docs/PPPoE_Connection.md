[🇨🇳 中文文档](./PPPoE_Connection.md) | [🇺🇸 English](./en/PPPoE_Connection.md)

# PPPoE 拨号配置

这篇文档适用于两类场景：

- 家庭宽带 PPPoE，需要让树莓派软路由直接拨号
- 校园网或特殊运营商环境，原有接口配置导致拨号后 WiFi 不稳定、客户端无法上网，甚至无线网络消失

如果你的树莓派只是接在上级路由 `LAN` 口后面上网，这篇不是你的主路径，请优先看 [LAN 连接文档](./Lan_Connectioin.md)。

## 先理解原理

单网口树莓派做 PPPoE 时，最容易犯的错不是“账号填错”，而是把 `LAN` 和 `WAN` 的角色混在一起。

正确思路是：

1. `PPPoE` 只挂在 `WAN` 侧逻辑接口上
2. `LAN` 接口继续保留在 `br-lan`
3. `br-lan` 这个桥设备即使暂时没有桥端口，也必须允许启动

如果把 `LAN` 接口直接改成无线设备、或者把桥关系改乱，常见后果是：

- AP 绑定关系异常
- `br-lan` 启动失败或启动顺序错乱
- WiFi 看起来能配置，但开机后无线网络消失
- 终端能连上 WiFi，却没有正确的转发和 NAT

所以，这篇文档的重点不是“把 PPPoE 填进去”，而是“不要破坏 `LAN -> br-lan -> WiFi` 这条链路”。

## 常见错误现象

校园网和部分运营商环境下，拨号失败时常见症状如下：

<div align="center">
  <img src="../figures/PPPoE_Connection/pppoe-dial-error-example.png" width="80%" alt="拨号失败时的错误提示示例" />
  <p><em>图 1：PPPoE 拨号异常时的典型报错界面。</em></p>
</div>

> 参考视频：  
> [树莓派安装 OpenWrt 作为主路由及解决校园网登录界面无法访问](https://www.bilibili.com/video/BV1ni4y1d76Z/?vd_source=f63c5bad02603bd4f2c19cf640c71d1f)

## 步骤 1：新建 WAN0 接口并填写 PPPoE 账号

在 `网络 -> 接口` 中新建 `WAN0`，协议选择 `PPPoE`，然后填写运营商或校园网提供的账号和密码。

<div align="center">
  <img src="../figures/PPPoE_Connection/pppoe-create-wan0-interface.png" width="80%" alt="新建 WAN0 并填写 PPPoE 账号" />
  <p><em>图 2：新建 WAN0 接口，并将协议设为 PPPoE。</em></p>
</div>

这一步之后，`WAN0` 的防火墙区域必须放到 `wan`。  
如果 `WAN0` 没有放进 `wan` 防火墙区域，最常见的表现就是：

- 路由器自己能拨上号
- 客户端也能连上 WiFi
- 但终端无法正常访问互联网

原因是 `LAN -> WAN` 的转发、NAT 和出站策略都依赖正确的防火墙区域。

<div align="center">
  <img src="../figures/PPPoE_Connection/pppoe-wan-firewall-zone.png" width="80%" alt="WAN0 接口的防火墙区域应设为 WAN" />
  <p><em>图 3：WAN0 所属防火墙区域应设置为 <code>wan</code>。</em></p>
</div>

## 步骤 2：LAN 接口仍然保持在 br-lan

`LAN` 的“设备”不要乱改。它应该继续绑定到：

- `网络: "br-lan" (lan)`

而不是直接改成无线设备、也不是直接挂到 PPPoE 接口上。

<div align="center">
  <img src="../figures/PPPoE_Connection/pppoe-lan-device-br-lan.png" width="70%" alt="LAN 接口设备应保持为 br-lan" />
  <p><em>图 4：LAN 接口的设备保持为 <code>br-lan</code>。</em></p>
</div>

因为无线网络本质上是挂载到 `LAN` 侧桥设备上的，不应该反过来让 `LAN` 去依赖无线设备本身。  
正确的无线挂载方式请直接看 [步骤 5：无线网络继续挂在 LAN 下](#wifi-lan-bind)。

一旦你把 `LAN` 接口错误地改成无线设备，接口依赖关系就会变成：

- `LAN` 依赖无线
- 无线又需要依赖 `LAN / bridge` 提供承载

这会导致启动顺序和桥接关系变得不稳定，典型现象就是：

- 开机后 WiFi 不出现
- 无线网络一会儿有一会儿没有
- 终端拿不到正常地址

下面这个配置就是不要照着做的错误样例：

<div align="center">
  <img src="../figures/PPPoE_Connection/pppoe-wrong-lan-bind-wireless.png" width="68%" alt="错误样例：把 LAN 设备改成无线网络或错误接口" />
  <p><em>图 5：错误样例，LAN 设备不要改成无线网络或其他错误接口。</em></p>
</div>

## 步骤 3：继续检查 LAN 所属防火墙区域

`LAN` 接口应该继续留在 `lan` 区域，而不是混到 `wan` 中去。

如果这里配错，终端通常会出现：

- 可以连上 WiFi，但内网 DHCP 或访问路径异常
- 局域网访问行为混乱
- 与 `WAN0` 的策略边界不清晰

<div align="center">
  <img src="../figures/PPPoE_Connection/pppoe-lan-firewall-zone.png" width="80%" alt="LAN 接口继续使用 LAN 防火墙区域" />
  <p><em>图 6：LAN 接口继续保留在 <code>lan</code> 防火墙区域。</em></p>
</div>

## 步骤 4：配置 br-lan 这个桥设备

这一步是很多人漏掉的关键点。

进入 `网络 -> 接口 -> 设备`，找到 `br-lan`，然后点“配置”。

<div align="center">
  <img src="../figures/PPPoE_Connection/pppoe-open-bridge-device-config.png" width="92%" alt="在设备页面打开 br-lan 的配置" />
  <p><em>图 7：在“设备”页打开 <code>br-lan</code> 的配置页面。</em></p>
</div>

在 `br-lan` 的配置页中，`网桥端口` 保持为空，不要把 `eth0`、`pppoe-WAN0` 或其他设备硬塞进去。

<div align="center">
  <img src="../figures/PPPoE_Connection/pppoe-bridge-ports-empty.png" width="72%" alt="br-lan 的桥端口保持为空" />
  <p><em>图 8：<code>br-lan</code> 的“网桥端口”保持为空。</em></p>
</div>

原因是这里描述的是这个桥设备自身的桥接成员关系。  
如果你把 `WAN` 侧设备或 PPPoE 隧道错误加进来，就会把原本清晰的内外网边界打乱。

同时，这一步非常重要：勾选“允许启动空网桥”。  
它的作用是：即使桥上暂时没有成员端口，`br-lan` 也允许先启动。

<div align="center">
  <img src="../figures/PPPoE_Connection/pppoe-enable-empty-bridge.png" width="72%" alt="勾选允许启动空网桥" />
  <p><em>图 9：勾选“允许启动空网桥”，避免 <code>br-lan</code> 因端口为空而启动失败。</em></p>
</div>

如果不勾选，在某些启动顺序下会出现：

- `br-lan` 没有及时起来
- 无线 AP 无法正确附着到 `LAN`
- 开机后 WiFi 消失或无法正常广播

<!-- 图注扩展位：此处可继续补充不同 LuCI 主题下该选项的位置差异。 -->

<a id="wifi-lan-bind"></a>
## 步骤 5：无线网络继续挂在 LAN 下

如果你新增了一个或多个无线配置，无论是主 SSID 还是额外 SSID，它们都应该继续挂在 `lan` 下，而不是挂到 `WAN0`。

先进入 `网络 -> 无线`，找到对应无线配置，点击“编辑”。

<div align="center">
  <img src="../figures/PPPoE_Connection/pppoe-wireless-open-edit.png" width="92%" alt="在无线页面编辑要绑定到 LAN 的无线配置" />
  <p><em>图 10：进入“无线”页面，编辑需要继续挂在 LAN 下的无线配置。</em></p>
</div>

然后在无线接口配置里，把“网络”明确选为 `lan`，不要选 `WAN0`。  
如果你新增了两个无线配置，也都按这个规则处理。

<div align="center">
  <img src="../figures/PPPoE_Connection/pppoe-wireless-bind-lan.png" width="82%" alt="无线接口的网络应绑定到 LAN 而不是 WAN0" />
  <p><em>图 11：无线接口的“网络”应绑定到 <code>lan</code>，不要绑定到 <code>WAN0</code>。</em></p>
</div>

这样配置的原因是：

- 无线 AP 属于内网接入侧，本质上应该交给 `LAN` 桥承载
- `WAN0` 是外网拨号出口，不应该承载客户端接入
- 如果无线错误绑定到 `WAN0`，就会把客户端直接挂到外网侧逻辑上，导致 DHCP、隔离、转发和防火墙边界全部错位

## 步骤 6：保存并验证最终状态

应用配置后，回到接口列表，理想状态通常是：

- `lan` 仍然存在，设备是 `br-lan`
- `WAN0 / pppoe-WAN0` 成功拨号
- WiFi 正常广播
- 客户端接入后可以正常上网

<div align="center">
  <img src="../figures/PPPoE_Connection/pppoe-final-status.png" width="92%" alt="PPPoE 拨号成功后的接口状态" />
  <p><em>图 12：配置完成后的正确状态示例，LAN 与 WAN0 分工清晰。</em></p>
</div>

## 常见排查

这里不要把三种现象看成新的章节，按现象对照检查即可。

1. **开机后 WiFi 消失。**

优先检查这三项：

1. `LAN` 设备是否仍然是 `br-lan`
2. `br-lan` 的桥端口是否保持为空
3. 是否勾选了“允许启动空网桥”

2. **WiFi 能连上，但没有外网。**

优先检查：

1. `WAN0` 是否真的拨号成功
2. `WAN0` 是否在 `wan` 防火墙区域
3. `LAN` 是否还在 `lan` 区域

3. **macOS 能上，Windows 不能上，或者反过来。**

这时先不要怀疑 PPPoE 本身，先检查终端的网络优先级。

- `macOS`：把 WiFi 放到更高优先级后再测
- `Windows`：先断开以太网，只保留 WiFi 再测

这是因为终端本机可能仍在优先走另一张网卡，导致你误以为软路由配置没生效。

## 完成

至此，树莓派就可以作为主路由进行 PPPoE 拨号，终端连接到树莓派的 WiFi 后即可正常上网。
