# SSH 连接实时监控可视化面板

> 一个轻量级的 Web 端 SSH 连接监控工具，实时采集本机 SSH 连接、SSH Agent 状态，并通过代理集成远程多 Agent 管理平台，提供统一的监控与管理界面。

---

## 目录

- [项目定位](#项目定位)
- [技术栈](#技术栈)
- [系统架构](#系统架构)
- [模块结构](#模块结构)
- [原子级设计原则](#原子级设计原则)
- [功能模块说明](#功能模块说明)
- [快速启动](#快速启动)
- [API 文档](#api-文档)
- [局域网访问](#局域网访问)
- [部署到 VM](#部署到-vm)
- [故障隔离](#故障隔离)
- [项目结构](#项目结构)

---

## 项目定位

在同一局域网内，提供以下核心能力：

| 能力 | 说明 |
|------|------|
| **本机 SSH 监控** | 实时采集 Windows 本机所有 SSH 连接，识别连接用户、进程、状态 |
| **SSH Agent 监控** | 检测本机 ssh-agent 运行状态、已加载密钥列表 |
| **远程服务器监控** | 通过 SSH 连接到远程 Linux 服务器，采集 SSHD 状态、Agent 状态、活跃连接、在线用户 |
| **多 Agent 管控** | 通过 HTTP 代理集成远程 Agent 管理平台，提供统一的 Agent 启动/停止/重启操作 |
| **实时通知** | 新 SSH 连接/断开时推送浏览器通知 + 声音提示 |

---

## 技术栈

### 后端

| 技术 | 用途 | 版本 |
|------|------|------|
| **Node.js** | 运行时环境 | v24.16.0 |
| **Express** | HTTP 服务器框架 | ^4.18.2 |
| **Socket.IO** | 实时双向通信（WebSocket） | ^4.7.4 |
| **child_process** | 执行 PowerShell / SSH 命令 | 内置模块 |
| **PowerShell 5.1** | Windows 端数据采集（Get-NetTCPConnection） | 系统内置 |

### 前端

| 技术 | 用途 |
|------|------|
| **纯 HTML5 + CSS3** | 页面结构 + 样式（无框架依赖） |
| **Vanilla JS (ES6+)** | 全部前端逻辑（无框架依赖） |
| **Canvas API** | 连接趋势图绘制 |
| **Socket.IO Client** | 实时数据推送接收 |
| **Linear 设计风格** | 深色侧边栏 + 浅色卡片区 + 双层阴影 |

### 远程交互

| 技术 | 用途 |
|------|------|
| **OpenSSH Client** | 远程服务器 SSH 命令采集 |
| **HTTP 反向代理** | 嵌入远程 Agent 管理平台 |
| **WebSocket 代理** | 实时 Agent 日志流转发 |

---

## 系统架构

### 整体架构

```
┌─ 浏览器 ─────────────────────────────────────┐
│  http://localhost:4521 或 127.0.0.1:4521  │
│                                                │
│  app.js ← modules/*.js ← socket.io.js          │
│       ↓                                        │
│  Server-Sent Events (Socket.IO)                │
└──────────────────────┬─────────────────────────┘
                       │
┌─ 后端 Node.js ───────▼─────────────────────────┐
│                                                  │
│  server.js（入口）                                │
│   ├── config.js        ← 全局常量                │
│   ├── state.js         ← 全局状态管理             │
│   ├── utils.js         ← 命令执行工具             │
│   ├── socket.js        ← WebSocket 事件分发       │
│   ├── collectors/      ← 数据采集模块             │
│   │   ├── ssh.js       ← 本机 SSH 连接           │
│   │   ├── local.js     ← 本机 Agent/系统          │
│   │   ├── remote.js    ← 远程服务器状态           │
│   │   └── loop.js      ← 采集循环编排            │
│   ├── proxy/           ← 代理模块                │
│   │   ├── http.js      ← HTTP 请求转发           │
│   │   ├── rewrite.js   ← HTML/JS 路径重写        │
│   │   └── ws.js        ← WebSocket 代理          │
│   └── routes/          ← API 路由                │
│       └── api.js       ← status/history/health   │
│                                                  │
│   ┌─────────────── 数据采集流向 ──────────────┐   │
│   │                                            │   │
│   │   PowerShell (本机)                        │   │
│   │   ├── Get-NetTCPConnection :22             │   │
│   │   ├── Get-Process ssh-agent/sshd          │   │
│   │   └── ssh-add -l                          │   │
│   │                                            │   │
│   │   SSH (远程 configured SSH host)                │   │
│   │   ├── ps aux | grep ssh[d]                │   │
│   │   ├── ss -tnp | grep :22                  │   │
│   │   ├── who / cat /proc/loadavg             │   │
│   │   └── ssh-add -l                          │   │
│   │                                            │   │
│   │   HTTP (Agent 平台 configured SSH host:9100)    │   │
│   │   ├── POST /login                         │   │
│   │   └── GET /api/agents                     │   │
│   └────────────────────────────────────────────┘   │
│                                                  │
└──────────────────────────────────────────────────┘
```

### 三层采集体系

```
第一层：本机（PowerShell）
  采集项：SSH 连接（netstat/Get-NetTCPConnection）
          ssh-agent 进程、密钥
          sshd 进程
          系统信息（CPU/内存/负载）

第二层：远程（SSH 命令）
  采集项：sshd 进程数
          ssh-agent 进程
          活跃 ESTABLISHED 连接
          登录用户列表
          系统负载（loadavg）
          ssh-agent 已加载密钥

第三层：Agent 管理平台（HTTP API）
  采集项：Agent 列表（ID/名称/状态/端口/PID/角色）
          通过反向代理实现：启动/停止/重启/审计
```

---

## 模块结构

### 后端原子模块（server/）

| 文件 | 职责 | 导出函数 | 行数 |
|------|------|----------|------|
| `config.js` | 全局常量 | `PORT, SSH_PORT, POLL_INTERVAL, ...` | 14 |
| `state.js` | 状态管理 | `getState, setState, getHistory, ...` | 48 |
| `utils.js` | 命令/HTTP 工具 | `execPS, execSSH, httpPostJson, httpGet, fetchAgentList` | 83 |
| `socket.js` | WebSocket 事件 | `setupSocket` | 19 |
| `collectors/ssh.js` | 本机 SSH 采集 | `collectSSHConnections`, `getProcessUser` | 74 |
| `collectors/local.js` | 本机状态采集 | `collectAgentStatus`, `collectSystemInfo`, `checkSSHDStatus` | 57 |
| `collectors/remote.js` | 远程采集 | `collectRemoteStatus`（内部 6 个原子解析函数） | 90 |
| `collectors/loop.js` | 采集编排 | `collectAll`, `collectRemoteLoop` | 77 |
| `proxy/http.js` | HTTP 代理转发 | `setupHttpProxy` | 83 |
| `proxy/rewrite.js` | HTML/JS 重写 | `rewriteJsPaths, rewriteHtmlAttrs, injectOptimizedCss, rewriteResponseBody` | 83 |
| `proxy/ws.js` | WebSocket 代理 | `setupWsProxy` | 40 |
| `routes/api.js` | API 路由 | `setupRoutes` | 25 |
| `server.js` | 入口 | 组装各模块、创建服务、启动 | 60 |

### 前端原子模块（public/js/）

| 文件 | 导出函数 | 行数 |
|------|----------|------|
| `modules/utils.js` | `formatUptime, formatBytes, formatTime, escapeHtml` | 55 |
| `modules/ui.js` | `showNotification, playConnectSound, playDisconnectSound` | 82 |
| `modules/render.js` | 11 个渲染函数（每个视图区域一个） | 270 |
| `app.js` | Socket.IO 事件分发 + 导航 + 渲染入口 | 59 |

---

## 原子级设计原则

### 核心原则

1. **一个函数只做一件可命名的事**
   - ✅ `parseSshdCount()` — 只解析 SSHD 进程数输出
   - ✅ `rewriteJsPaths()` — 只替换 JS 中的 API 路径
   - ✅ `renderStats()` — 只渲染统计卡片区域
   - ❌ 反面：一个大函数既采集 SSH 又解析输出又更新状态

2. **纯函数优先**
   - 输入相同 → 输出相同，无副作用
   - 例如：`formatBytes()`、`escapeHtml()`、`rewriteJsPaths()`
   - 便于测试和独立修改

3. **一个模块改动不触发连锁修改**
   - 改 `renderConnectionTable()` → 不需要改 `app.js`
   - 改 `parseRemoteConns()` → 不需要改 `collectRemoteStatus()`
   - 改 `httpPostJson()` → 不需要改 `fetchAgentList()`

4. **每个文件 ≤ 100 行**
   - 超出说明职责不单一，需要拆分
   - 最大文件 `render.js` 270 行 → 由 11 个独立函数组成

### 故障隔离模型

```
config.js 故障 → 所有功能不可用（纯常量，极小概率）
state.js 故障  → 全局状态异常（核心模块，48 行易排查）
utils.js 故障  → 命令执行/HTTP 请求不可用
collectors/ssh.js 故障 → 仅本机 SSH 连接列表异常，远程监控正常
collectors/remote.js 故障 → 仅远程服务器数据异常，本机监控正常
proxy/http.js 故障 → 仅嵌入式 Agent 平台异常
proxy/ws.js 故障 → 仅 Agent 实时日志流异常
routes/api.js 故障 → 仅 HTTP API 异常，Socket.IO 推送正常
modules/render.js 故障 → 仅页面渲染异常，数据采集和推送正常
modules/ui.js 故障 → 仅通知/音效异常，核心功能正常
```

---

## 功能模块说明

### 1. 总览面板

实时展示：
- **活跃连接数** — 当前 ESTABLISHED 状态的 SSH 连接数
- **独立用户** — 去重后的 SSH 登录用户数
- **今日峰值** — 当日最高并发连接数
- **运行时长** — 服务持续运行时间
- **连接趋势图** — 最近 6 分钟的连接数量走势（Canvas 绘制）
- **系统状态** — 本机主机名/平台/CPU/内存/负载
- **SSH Agent 状态** — Agent 运行状态/密钥列表
- **SSHD 服务状态** — 进程数/PID

### 2. 连接列表

支持按状态筛选（全部/ESTABLISHED/CLOSE_WAIT/TIME_WAIT），展示：
- 源地址、源端口、连接目标、状态（彩色药丸标签）、登录用户、进程 PID、检测时间

### 3. 本地 Agent 状态

本机 Windows 的：
- **SSH Agent** — 运行状态/PID/Socket/已加载密钥列表
- **SSHD 服务** — 运行状态/进程 PID

### 4. 远程服务器

通过 SSH 采集远程 Linux 服务器的：
- 连接状态、主机名
- CPU 负载、在线用户
- SSHD 服务运行状态/进程数
- SSH Agent 运行状态/PID/密钥
- 活跃连接列表

### 5. Agent 列表

通过反向代理嵌入远程 Agent 管理平台（configured SSH host:9100）：
- Agent 卡片网格（名称/状态/端口/角色/PID）
- 启动 / 重启 / 停止操作（通过代理 API）
- 详情页、实时日志、Shell 终端
- 拉取审核并对账

### 6. 嵌入式平台

完整嵌入远程多 Agent 管理平台，支持登录后的全部功能：
- Agent 注册/发现
- 实时日志流（WebSocket 代理）
- 审计检查
- 配置修改

---

## 快速启动

### 环境要求

- Windows 10+（PowerShell 5.1）
- Node.js v18+
- OpenSSH Client（系统自带）
- 局域网内可访问远程服务器（configured SSH host）

### 启动步骤

```bash
# 1. 克隆项目
git clone <仓库地址>
cd 可视化ssh连接监测连接

# 2. 安装依赖
npm install

# 3. 启动服务
node server.js

# 4. 打开浏览器
# 本机访问:  http://localhost:4521
# 局域网访问: http://<本机IP>:4521
```

或双击 `start.bat` 一键启动。

---

## API 文档

### 基础路径

```
http://<host>:4521
```

### 接口列表

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/status` | GET | 全量状态（连接/Agent/系统/远程/指标/告警） |
| `/api/history` | GET | 连接趋势历史数据（120 个采样点） |
| `/api/health` | GET | 健康检查（status/uptime/connections/agentRunning） |
| `/api/proxy/*` | ALL | 反向代理到 Agent 管理平台（configured SSH host:9100） |

### WebSocket 事件

| 事件 | 方向 | 说明 |
|------|------|------|
| `init` | 服务端 → 客户端 | 连接初始化，全量状态推送 |
| `update` | 服务端 → 客户端 | 增量更新（3 秒间隔） |
| `remote-update` | 服务端 → 客户端 | 远程服务器数据更新（10 秒间隔） |
| `connection-added` | 服务端 → 客户端 | 新 SSH 连接通知 |
| `connection-removed` | 服务端 → 客户端 | SSH 连接断开通知 |

### 代理 API（Agent 管理平台）

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/proxy/` | GET | Agent 管理平台首页 |
| `/api/proxy/login` | GET/POST | 登录 |
| `/api/proxy/api/agents` | GET | Agent 列表 |
| `/api/proxy/api/agents/{id}` | GET | Agent 详情 |
| `/api/proxy/api/agents/{id}/start` | POST | 启动 Agent |
| `/api/proxy/api/agents/{id}/restart` | POST | 重启 Agent |
| `/api/proxy/api/agents/{id}/stop` | POST | 停止 Agent |
| `/api/proxy/api/agents/{id}/status` | GET | Agent 实时状态 |
| `/api/proxy/api/agents/{id}/log/tail` | GET | 日志尾部 |
| `/api/proxy/agents/{id}` | GET | Agent 详情页（HTML） |

---

## 局域网访问

### 1. 服务端配置

服务默认监听 `0.0.0.0:4521`，从所有网卡可访问。

### 2. 防火墙放行

```powershell
# Windows 防火墙（已添加）
New-NetFirewallRule -DisplayName "SSH Monitor Web (4521)" `
  -Direction Inbound -Protocol TCP -LocalPort 4521 -Action Allow
```

### 3. 访问地址

```
http://127.0.0.1:4521
```

---

## 部署到 VM

使用项目内置的 `deploy/sync_to_vm.ps1` 脚本：

```powershell
.\deploy\sync_to_vm.ps1 -VMHost "your-vm-host" -VMUser "username"
```

执行流程：
1. 备份 VM 旧文件
2. SSH 加密覆盖新文件
3. MD5 校验文件完整性
4. 安装依赖并重启服务
5. 健康检测验证

---

## 故障隔离

### 一个模块出问题 → 只影响一个模块

| 故障位置 | 影响范围 | 修复方式 |
|----------|---------|---------|
| `collectors/ssh.js` | 本机连接列表不更新 | 只改此文件 |
| `collectors/remote.js` | 远程数据不更新 | 只改此文件 |
| `proxy/http.js` | 嵌入式平台不可用 | 只改此文件 |
| `proxy/rewrite.js` | 代理路径不重写 | 只改此文件 |
| `modules/render.js` | 页面渲染异常 | 只改此文件 |
| `modules/ui.js` | 通知/音效异常 | 只改此文件 |

---

## 项目结构

```
可视化ssh连接监测连接/
├── server.js                    # 入口文件（60 行）
├── package.json                 # 依赖配置
├── start.bat                    # 一键启动脚本
│
├── server/                      # 后端模块
│   ├── config.js                # 全局常量
│   ├── state.js                 # 全局状态
│   ├── utils.js                 # 工具函数
│   ├── socket.js                # WebSocket 事件
│   ├── collectors/
│   │   ├── ssh.js               # 本机 SSH 采集
│   │   ├── local.js             # 本机 Agent/系统
│   │   ├── remote.js            # 远程服务器采集
│   │   └── loop.js              # 采集编排
│   ├── proxy/
│   │   ├── http.js              # HTTP 代理
│   │   ├── rewrite.js           # HTML/JS 重写
│   │   └── ws.js                # WebSocket 代理
│   └── routes/
│       └── api.js               # API 路由
│
├── public/                      # 前端静态文件
│   ├── index.html               # 主页面
│   ├── css/
│   │   └── style.css            # 样式表（Linear 风格）
│   └── js/
│       ├── app.js               # 前端入口
│       └── modules/
│           ├── utils.js         # 工具函数
│           ├── ui.js            # 通知/音效
│           └── render.js        # 渲染函数
│
└── deploy/
    └── sync_to_vm.ps1           # VM 同步部署脚本
```

---

## 运行截图

> （建议在此处添加实际运行截图）

| 页面 | 内容 |
|------|------|
| 总览面板 | 统计卡片 + 趋势图 + 系统/Agent 状态 |
| 连接列表 | SSH 连接表格 + 状态过滤 |
| 远程服务器 | 远程 SSHD/Agent/用户/连接 |
| Agent 列表 | 嵌入式 Agent 管理平台 |

---

## 许可证

MIT License

Copyright (c) 2026

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

