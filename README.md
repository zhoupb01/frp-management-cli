# FRP Management CLI · frpm

- 全屏交互式仪表盘：仅输入 `frpm` 即可进入可选、可滚动的连接列表与快捷键操作。
- 命令驱动：`frpm list/add/copy/edit/start/stop/restart/logs` 一应俱全；适合脚本集成。
- 连接复制：快速复制现有连接配置，自动生成新名称，提升配置效率。
- 实时日志：内置轻量"tail -f"查看器，支持颜色高亮与文件轮询。
- 数据持久化：在用户主目录 `~/.frpm/connections.json` 保存连接配置，简单直观。
- 可配置 frpc 路径：在 `~/.frpm/settings.json` 指定 `frpcPath`；首次运行若未配置会弹出输入提示。
- Windows 友好：进程停止使用 `taskkill`，仓库已包含 `bin/frpc.exe`（Windows）。
- CJK 对齐：表格与列表对齐考虑中日韩宽字符，终端阅读更整齐。CLI · frpm

Ink/React 打造的交互式终端 CLI，用于管理 frpc 连接（启动/停止/日志/增删改查）。

![node-badge](https://img.shields.io/badge/node-%E2%89%A518-orange) ![license-badge](https://img.shields.io/badge/license-MIT-green)

📦 **GitHub 仓库**: [https://github.com/zhoupb01/frp-management-cli](https://github.com/zhoupb01/frp-management-cli)

## 特性

- 全屏交互式仪表盘：仅输入 `frpm` 即可进入可选、可滚动的连接列表与快捷键操作。
- 命令驱动：`frpm list/add/edit/start/stop/restart/logs` 一应俱全；适合脚本集成。
- 实时日志：内置轻量“tail -f”查看器，支持颜色高亮与文件轮询。
- 数据持久化：在用户主目录 `~/.frpm/connections.json` 保存连接配置，简单直观。
- 可配置 frpc 路径：在 `~/.frpm/settings.json` 指定 `frpcPath`；首次运行若未配置会弹出输入提示。
- Windows 友好：进程停止使用 `taskkill`，仓库已包含 `bin/frpc.exe`（Windows）。
- CJK 对齐：表格与列表对齐考虑中日韩宽字符，终端阅读更整齐。

> 当前版本已支持连接复制功能，以 TCP/UDP 基础代理为主。

---

## 预览

仪表盘（仅运行 `frpm`）：

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ FRP 管理 - 仪表盘                                                            │
├──────────────────────────────────────────────────────────────────────────────┤
│ 总数 2 | 运行 1 | 停止 1 | 异常 0                                            │
│                                                                              │
│ > 运行   12345  my-web-server  tcp  127.0.0.1:80   ->  server.com:8080       │
│   停止   -      ssh-service    tcp  127.0.0.1:22   ->  server.com:6022       │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
[↑/↓] 导航  [Enter] 启动/停止  [l] 日志  [d] 删除  [a] 新增  [c] 复制  [e] 修改  [q] 退出
```text

列表（`frpm list`）：

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ FRP 管理 - 列表                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│ 总数 2 | 运行 1 | 停止 1 | 异常 0                                            │
│                                                                              │
│   状态   PID    名称            类型  本地               ->  远端             │
│   运行   12345  my-web-server   tcp   127.0.0.1:80       ->  server:8080     │
│   停止   -      ssh-service     tcp   127.0.0.1:22       ->  server:6022     │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 安装与运行

前置要求：

- Node.js 18 或更高版本。
- frpc 二进制：
  - Windows：仓库已自带 `bin/frpc.exe`。
  - Linux/macOS：请自行放置 `frpc` 到 `bin/frpc` 并赋予可执行权限（`chmod +x bin/frpc`）。

开发调试（热重载）：

```powershell
# 安装依赖
npm i
# 进入交互式仪表盘（默认）
npm run dev
```

本地构建并以全局命令使用：

```powershell
npm run build
npm link   # 使 frpm 可作为全局命令使用

# 示例
frpm            # 全屏仪表盘
frpm list       # 列表模式
```

运行构建产物（无需 link）：

```powershell
node dist/cli.js
node dist/cli.js list
```

---

## 用法

- 无参数：`frpm` 进入全屏仪表盘。
  - 快捷键：
    - ↑/↓ 导航行；Enter 启动/停止；l 查看日志；a 新增；c 复制；e 修改；d 删除；q 退出。

- 子命令：
  - `frpm list` / `frpm ls`：显示所有连接的概览表。
  - `frpm add`：交互式向导新增连接（逐项输入，末尾确认）。
  - `frpm copy <name>`：复制指定连接（交互式向导，预填充配置）。
  - `frpm edit <name>`：交互式编辑指定连接。
  - `frpm start <name>`：启动指定连接（后台运行，日志写入文件）。
  - `frpm stop <name>`：停止指定连接（Windows 使用 taskkill）。
  - `frpm restart <name>`：重启指定连接。
  - `frpm logs <name>`：实时查看日志（按 Esc 或 q 返回）。

### 使用示例

```bash
# 列出所有连接
frpm list

# 新增连接
frpm add

# 复制现有连接（自动添加 " - 复制" 后缀避免名称冲突）
frpm copy my-web-server

# 在仪表盘中复制连接
frpm  # 进入仪表盘，选择连接后按 'c' 键复制

# 发布到npmjs
npm publish --registry https://registry.npmjs.org/
```

---

## 数据与运行目录

- 配置存储（持久化）：
  - Windows：`%USERPROFILE%\.frpm\connections.json`
  - Linux/macOS：`~/.frpm/connections.json`

- 应用设置：
  - `~/.frpm/settings.json`
  - 示例：

```jsonc
{
  "frpcPath": "C:/Users/you/.frpm/frpc.exe" // 或 /home/you/.frpm/frpc
}
```

- 运行时目录（临时配置与日志）：
  - `~/.frpm/runtime/`
  - 每个连接会生成：
    - 配置：`<id>.json`
    - 日志：`<id>.log`

连接对象字段（与 `connections.json` 一致）：

```jsonc
{
  "id": "uuid",
  "name": "连接名称",
  "frp_server_addr": "服务器地址",
  "frp_server_port": 7000,
  "token": "令牌(可选)",
  "type": "tcp | udp",
  "local_ip": "127.0.0.1",
  "local_port": 8080,
  "remote_port": 8080,
  "status": "running | stopped | error",
  "log_file_path": "~/.frpm/runtime/<id>.log",
  "pid": 12345
}
```

安全提示：令牌（token）会以明文保存在本地 JSON 文件中；请妥善保护该文件权限。

---

## 平台与注意事项

- Windows：停止进程通过 `taskkill /PID <pid> /T /F`，通常无需管理员权限；若杀进程失败会依然将状态置为停止。
- frpc 二进制：
  - Windows 已内置 `bin/frpc.exe`；
  - 其他平台需自行放置 `bin/frpc` 并确保可执行；当前未内置自动下载。
  - 也可通过 `~/.frpm/settings.json` 的 `frpcPath` 指定任意绝对路径；当内置二进制不存在时会优先读取该设置。
- 功能范围：当前每个连接仅对应一个 proxy（简化模式），支持 `tcp/udp` 基础转发；尚未覆盖 HTTP/HTTPS 等高级特性。

---

## 开发

- 技术栈：TypeScript、Ink 6、React 19、Commander。
- 脚本：
  - `npm run dev` 开发模式（tsx 直跑）。
  - `npm run build` 使用 tsup 构建到 `dist/`（ESM、node18、sourcemap）。
  - `npm start` 运行构建产物。

目录结构（节选）：

```text
src/
  cli.tsx                 # 主入口：仪表盘 + 子命令
  components/             # UI 组件（列表/表单/日志/状态）
  hooks/useConnections.ts # 加载/保存/增删改封装
  utils/
    storage.ts            # ~/.frpm/connections.json 读写
    frpcManager.ts        # 启停 frpc、生成配置、写入日志
    text.ts               # CJK 对齐工具
bin/
  frpc.exe                # Windows frpc 二进制（其他平台请自备 bin/frpc）
```

---

## 路线图（Roadmap）

- 支持多 proxy/连接的高级配置（http/https、域名、带宽限制等）。
- 连接状态自动探测与健康检查。
- 跨平台二进制管理（自动下载/校验）。
- 服务化运行（Windows 服务 / systemd）。
- 导入/导出配置。

---

## 许可证

MIT © 本仓库作者。详见 `LICENSE`。

## 鸣谢

- [fatedier/frp](https://github.com/fatedier/frp)
- [vadimdemedes/ink](https://github.com/vadimdemedes/ink)
- [tj/commander.js](https://github.com/tj/commander.js)

