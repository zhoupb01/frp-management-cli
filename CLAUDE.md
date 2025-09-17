# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概览

FRP Management CLI (frpm) 是一个基于 Ink/React 的交互式终端应用，用于管理 frpc 连接。项目使用 TypeScript + React + Ink 构建终端 UI。

## 常用命令

### 开发与构建
```bash
# 安装依赖
npm i

# 开发模式（热重载）
npm run dev

# 构建项目
npm run build

# 运行构建产物
npm start
# 或
node dist/cli.js

# 全局安装
npm link
```

### 应用命令
```bash
# 进入交互式仪表盘
frpm

# 列出所有连接
frpm list

# 添加新连接
frpm add

# 复制连接
frpm copy <name>

# 编辑连接
frpm edit <name>

# 启动/停止/重启连接
frpm start <name>
frpm stop <name>
frpm restart <name>

# 查看日志
frpm logs <name>
```

## 架构要点

### 核心数据结构
- **Connection**: 连接配置对象，包含 frp 服务器信息、本地/远程端口映射、运行状态等
- 数据持久化在 `~/.frpm/connections.json`
- 运行时配置和日志存储在 `~/.frpm/runtime/`

### 主要模块
- **src/cli.tsx**: 应用入口，处理命令行参数，渲染 Dashboard 或执行子命令
- **src/utils/storage.ts**: 连接数据的读写操作
- **src/utils/frpcManager.ts**: frpc 进程管理（启动、停止、配置生成）
- **src/utils/settings.ts**: 应用设置管理（如 frpcPath 配置）
- **src/hooks/useConnections.ts**: React Hook，封装连接的增删改查逻辑
- **src/components/**: UI 组件（ConnectionList、InteractiveForm、LogViewer 等）

### 关键技术点
- 使用 Ink 6 + React 19 构建终端 UI
- Commander 处理命令行参数
- 通过 child_process.spawn 管理 frpc 进程
- Windows 使用 taskkill 终止进程，Unix 使用 process.kill
- 支持 CJK 字符对齐（src/utils/text.ts）

### frpc 配置
- Windows: 项目自带 `bin/frpc.exe`
- Linux/macOS: 需手动放置 `bin/frpc` 或配置 `~/.frpm/settings.json` 的 frpcPath
- 首次运行若未配置会弹出输入提示

## 注意事项
- 当前仅支持 tcp/udp 基础代理，每个连接对应一个 proxy
- 连接运行中不允许编辑
- 令牌以明文保存在本地 JSON 文件中