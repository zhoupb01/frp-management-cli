#!/usr/bin/env node
import { Command } from 'commander';
import { Box, render, Text, useInput } from 'ink';
import { useEffect, useState } from 'react';
import ConnectionList from './components/ConnectionList.js';
import InteractiveForm from './components/InteractiveForm.js';
import LogViewer from './components/LogViewer.js';
import StatusMessage from './components/StatusMessage.js';
import FrpcPathPrompt from './components/FrpcPathPrompt.js';
import { useConnections } from './hooks/useConnections.js';
import { loadConnections, type Connection } from './utils/storage.js';
import { loadSettings } from './utils/settings.js';
import { startConnection, stopConnection, getEffectiveFrpcPath } from './utils/frpcManager.js';
import fs from 'node:fs/promises';

const program = new Command();
program
    .name('frpm')
    .description('FRP Management CLI')
    .version('0.0.1');

// Full-screen dashboard with shortcuts
function Dashboard() {
    const { connections, loading, error, reload, add, updateById, removeById } = useConnections();
    const [mode, setMode] = useState<'list' | 'add' | 'edit' | 'logs'>('list');
    const [toast, setToast] = useState<{ kind: 'success' | 'error' | 'info'; text: string } | null>(null);
    const [selected, setSelected] = useState(0);
    const [logTarget, setLogTarget] = useState<Connection | null>(null);
    const [inputGuardUntil, setInputGuardUntil] = useState<number>(0);
    const [needFrpcPath, setNeedFrpcPath] = useState<boolean>(true);
    const [frpcPath, setFrpcPath] = useState<string>('');

    // On mount, check settings
    useEffect(() => {
        (async () => {
            try {
                const s = await loadSettings();
                const p = (s.frpcPath || '').trim();
                if (!p) { setNeedFrpcPath(true); return; }
                try {
                    const st = await fs.stat(p);
                    if (st.isFile()) setNeedFrpcPath(false); else setNeedFrpcPath(true);
                } catch {
                    setNeedFrpcPath(true);
                }
            } catch {
                setNeedFrpcPath(true);
            }
        })();
    }, []);

    // Resolve effective frpc path for display
    useEffect(() => {
        (async () => {
            try { setFrpcPath(await getEffectiveFrpcPath()); } catch {}
        })();
    }, []);

    useEffect(() => {
        if (selected >= connections.length) setSelected(Math.max(0, connections.length - 1));
    }, [connections, selected]);

    useInput((input, key) => {
        if (Date.now() < inputGuardUntil) return; // 临时屏蔽输入，避免日志页返回时触发退出
        if (mode === 'add') return; // 表单内部处理输入
        if (mode === 'logs') return; // 日志页由组件自身处理 q/esc

        // 仅在列表模式允许 q/esc 退出
        if (mode === 'list' && (key.escape || input?.toLowerCase() === 'q')) process.exit(0);

        // 列表模式的快捷键
        if (mode === 'list' && key.upArrow) setSelected(i => Math.max(0, i - 1));
        if (mode === 'list' && key.downArrow) setSelected(i => Math.min(connections.length - 1, i + 1));

        // a: 新增（即使列表为空也响应）
        if (mode === 'list' && input?.toLowerCase() === 'a') {
            setMode('add');
            return;
        }

        const sel = connections[selected];

        // e: 编辑当前（需要选中项）
        if (mode === 'list' && input?.toLowerCase() === 'e' && sel) {
            if (sel.status === 'running') {
                setToast({ kind: 'error', text: `运行中不允许修改：'${sel.name}'` });
                setTimeout(() => setToast(null), 1600);
                return;
            }
            setMode('edit');
            return;
        }

        if (!sel) return; // 为空时，其它操作无意义

        if (mode === 'list' && key.return) {
            // Enter 启停切换（真实启动/停止）
            if (sel.status === 'running') {
                void stopConnection(sel.name)
                    .then(async () => {
                        await reload();
                        setToast({ kind: 'success', text: `已停止 '${sel.name}'` });
                        setTimeout(() => setToast(null), 1200);
                    })
                    .catch((e: any) => {
                        setToast({ kind: 'error', text: `停止失败：${e?.message || e}` });
                        setTimeout(() => setToast(null), 1600);
                    });
            } else {
                void startConnection(sel.name)
                    .then(async ({ pid }) => {
                        await reload();
                        setToast({ kind: 'success', text: `已启动 '${sel.name}' (PID: ${pid})` });
                        setTimeout(() => setToast(null), 1200);
                    })
                    .catch((e: any) => {
                        setToast({ kind: 'error', text: `启动失败：${e?.message || e}` });
                        setTimeout(() => setToast(null), 1600);
                    });
            }
        }
        if (mode === 'list' && input?.toLowerCase() === 'l') {
            setLogTarget(sel);
            setMode('logs');
        }
        if (mode === 'list' && input?.toLowerCase() === 'd') {
            if (sel.status === 'running') {
                setToast({ kind: 'error', text: `运行中不允许删除：'${sel.name}'` });
                setTimeout(() => setToast(null), 1600);
                return;
            }
            // 简化：直接删除（后续可加确认弹窗）
            void removeById(sel.id).then(() => {
                setToast({ kind: 'success', text: `已删除 '${sel.name}'` });
                setTimeout(() => setToast(null), 1200);
            });
        }
    });

    if (needFrpcPath) {
        return <FrpcPathPrompt onSaved={() => setNeedFrpcPath(false)} onCancel={() => process.exit(1)} />;
    }

    if (mode === 'add') {
        return (
            <InteractiveForm
                onComplete={async () => {
                    await reload();
                    setToast({ kind: 'success', text: '连接已保存' });
                    setMode('list');
                    setTimeout(() => setToast(null), 1200);
                }}
                onCancel={() => setMode('list')}
            />
        );
    }

    if (mode === 'edit') {
        const current = connections[selected];
        if (!current) return null;
        return (
            <InteractiveForm
                mode="edit"
                initial={current}
                onComplete={async () => {
                    await reload();
                    setToast({ kind: 'success', text: '连接已更新' });
                    setMode('list');
                    setTimeout(() => setToast(null), 1200);
                }}
                onCancel={() => setMode('list')}
            />
        );
    }

    if (mode === 'logs' && logTarget) {
        return <LogViewer name={logTarget.name} onExit={() => { setMode('list'); setInputGuardUntil(Date.now() + 200); }} />;
    }

    const total = connections.length;
    const running = connections.filter(c => c.status === 'running').length;
    const errorCount = connections.filter(c => c.status === 'error').length;
    const stopped = total - running - errorCount;

    return (
        <Box borderStyle="round" paddingX={1} paddingY={1} flexDirection="column">
            <Text inverse> FRP 管理 - 仪表盘 </Text>
            {frpcPath && (
                <Box marginTop={1}><Text color="gray">frpc: {frpcPath}</Text></Box>
            )}

            <Box marginTop={1}>
                <Text>
                    总数 {total} | <Text color="green">运行 {running}</Text> | <Text color="red">停止 {stopped}</Text> | <Text color="yellow">异常 {errorCount}</Text>
                </Text>
            </Box>

            <Box marginTop={1} flexDirection="column">
                {loading && <Text color="blue">ℹ 正在加载...</Text>}
                {error && <Text color="red">✖ {error}</Text>}
                {!loading && !error && (
                    <ConnectionList items={connections} selectedIndex={selected} />
                )}
                {toast && <StatusMessage borderless kind={toast.kind} message={toast.text} />}
            </Box>

            <Box marginTop={1}>
                <Text color="gray">[↑/↓] 导航  [Enter] 启动/停止  [l] 日志  [d] 删除  [a] 新增  [e] 修改  [q] 退出</Text>
            </Box>
        </Box>
    );
}

// list command minimal output
program
    .command('list')
    .alias('ls')
    .description('列出已配置的连接')
    .action(async () => {
        const list = await loadConnections();
        const App = () => {
            const total = list.length;
            const running = list.filter(c => c.status === 'running').length;
            const errorCount = list.filter(c => c.status === 'error').length;
            const stopped = total - running - errorCount;
            return (
                <Box borderStyle="round" paddingX={1} paddingY={1} flexDirection="column">
                    <Text inverse> FRP 管理 - 列表 </Text>
                    <Box marginTop={1}>
                        <Text>
                            总数 {total} | <Text color="green">运行 {running}</Text> | <Text color="red">停止 {stopped}</Text> | <Text color="yellow">异常 {errorCount}</Text>
                        </Text>
                    </Box>
                    <Box marginTop={1} flexDirection="column">
                        {list.length === 0 ? (
                            <Text color="gray">暂无连接。使用 `frpm add` 新增，或运行 `frpm` 进入仪表盘。</Text>
                        ) : (
                            <ConnectionList items={list} selectedIndex={-1} />
                        )}
                    </Box>
                </Box>
            );
        };
        render(<App />);
    });

program
    .command('add')
    .description('新增连接（交互式）')
    .action(() => {
        const App = () => (
            <InteractiveForm
                onComplete={() => {
                    // 保存后给出提示
                    render(<Box><Text color="green">✔ 已保存；你可以运行 `frpm list` 查看。</Text></Box>);
                }}
                onCancel={() => {
                    render(<Box><Text color="gray">已取消。</Text></Box>);
                }}
            />
        );
        render(<App />);
    });

program
    .command('start <name>')
    .description('启动指定连接')
    .action(async (name: string) => {
        const App = ({ msg, color }: { msg: string; color: string }) => (<Box><Text color={color}>{msg}</Text></Box>);
        try {
            const { pid } = await startConnection(name);
            render(<App msg={`✔ 成功: 连接 '${name}' 已启动 (PID: ${pid})。`} color="green" />);
        } catch (e: any) {
            render(<App msg={`✖ 失败: ${e?.message || e}`} color="red" />);
        }
    });

program
    .command('stop <name>')
    .description('停止指定连接')
    .action(async (name: string) => {
        const App = ({ msg, color }: { msg: string; color: string }) => (<Box><Text color={color}>{msg}</Text></Box>);
        try {
            await stopConnection(name);
            render(<App msg={`✔ 成功: 连接 '${name}' 已停止。`} color="green" />);
        } catch (e: any) {
            render(<App msg={`✖ 失败: ${e?.message || e}`} color="red" />);
        }
    });

program
    .command('restart <name>')
    .description('重启指定连接')
    .action(async (name: string) => {
        const App = ({ msg, color }: { msg: string; color: string }) => (<Box><Text color={color}>{msg}</Text></Box>);
        try {
            await stopConnection(name);
            const { pid } = await startConnection(name);
            render(<App msg={`✔ 成功: 连接 '${name}' 已重启 (PID: ${pid})。`} color="green" />);
        } catch (e: any) {
            render(<App msg={`✖ 失败: ${e?.message || e}`} color="red" />);
        }
    });

program
    .command('logs <name>')
    .description('显示指定连接的实时日志')
    .action(async (name: string) => {
        const App = () => (
            <LogViewer name={name} onExit={() => process.exit(0)} />
        );
        render(<App />);
    });

program
    .command('edit <name>')
    .description('编辑指定连接（交互式）')
    .action(async (name: string) => {
        const list = await loadConnections();
        const target = list.find(c => c.name === name);
        const App = () => {
            if (!target) return <Box><Text color="red">✖ 未找到名为 '{name}' 的连接。</Text></Box>;
            if (target.status === 'running') return <Box><Text color="red">✖ 运行中不允许修改：'{name}'</Text></Box>;
            return (
                <InteractiveForm
                    mode="edit"
                    initial={target}
                    onComplete={() => {
                        render(<Box><Text color="green">✔ 已更新；你可以运行 `frpm list` 查看。</Text></Box>);
                    }}
                    onCancel={() => {
                        render(<Box><Text color="gray">已取消。</Text></Box>);
                    }}
                />
            );
        };
        render(<App />);
    });

if (process.argv.length <= 2) {
    render(<Dashboard />);
} else {
    program.parse(process.argv);
}
