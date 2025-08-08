import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { type Connection, loadConnections, saveConnections, getStoragePaths } from './storage.js';
import { loadSettings } from './settings.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function resolveFrpcPath(): Promise<string> {
    // 优先从 ~/.frpm/settings.json 的 frpcPath 读取
    const win = process.platform === 'win32';
    try {
        const settings = await loadSettings();
        const cfg = (settings.frpcPath || '').trim();
        if (cfg) return cfg;
    } catch {}
    // 回退到项目内置的 bin 目录
    const local = path.resolve(__dirname, '../../bin', win ? 'frpc.exe' : 'frpc');
    return local;
}

export async function getEffectiveFrpcPath(): Promise<string> {
    return await resolveFrpcPath();
}

function getRuntimeDir() {
    const base = path.join(os.homedir(), '.frpm');
    return path.join(base, 'runtime');
}

async function ensureRuntimeDir() {
    await fs.mkdir(getRuntimeDir(), { recursive: true });
}

function buildJson(c: Connection) {
    const config: any = {
        serverAddr: c.frp_server_addr,
        serverPort: c.frp_server_port,
        proxies: [
            {
                name: c.name,
                type: c.type,
                localIP: c.local_ip,
                localPort: c.local_port,
                remotePort: c.remote_port,
            },
        ],
    };
    if (c.token) {
        config.auth = { method: 'token', token: c.token };
    }
    return JSON.stringify(config, null, 2);
}

export type StartResult = { pid: number; configPath: string; logPath: string };

export async function startConnection(name: string): Promise<StartResult> {
    await ensureRuntimeDir();
    const list = await loadConnections();
    const c = list.find(x => x.name === name);
    if (!c) throw new Error(`未找到连接 '${name}'`);

    if (c.status === 'running' && c.pid) {
        throw new Error(`连接 '${name}' 已在运行 (PID: ${c.pid})`);
    }

    const runtime = getRuntimeDir();
    const configPath = path.join(runtime, `${c.id}.json`);
    const logPath = path.join(runtime, `${c.id}.log`);
    await fs.writeFile(configPath, buildJson(c), 'utf8');

    const frpcPath = await resolveFrpcPath();
    try {
        await fs.access(frpcPath);
    } catch {
        throw new Error(`未找到 frpc 可执行文件：${frpcPath}\n请在 ~/.frpm/settings.json 配置 frpcPath 为绝对路径，或将可执行文件放置于项目 bin 目录。`);
    }

    // Spawn detached background process; redirect stdio to log
    const out = await fs.open(logPath, 'a');
    const child = spawn(frpcPath, ['-c', configPath], {
        detached: true,
        stdio: ['ignore', out.fd, out.fd],
        windowsHide: true,
    });
    // Close our handle; child has inherited it
    try { await out.close(); } catch {}

    const pid = child.pid ?? 0;
    child.unref();

    // Update connection status, pid, and log path
    const next = list.map(x => x.id === c.id ? { ...x, status: 'running' as const, pid, log_file_path: logPath } : x);
    await saveConnections(next);

    return { pid, configPath, logPath };
}

export async function stopConnection(name: string): Promise<void> {
    const list = await loadConnections();
    const c = list.find(x => x.name === name);
    if (!c) throw new Error(`未找到连接 '${name}'`);
    if (c.status !== 'running' || !c.pid) {
        // Already stopped
        const next = list.map(x => x.id === c.id ? { ...x, status: 'stopped' as const, pid: null } : x);
        await saveConnections(next);
        return;
    }

    // Try to terminate process by PID
    try {
        if (process.platform === 'win32') {
            // /T to terminate child processes, /F to force
            await new Promise<void>((resolve, reject) => {
                const proc = spawn('taskkill', ['/PID', String(c.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
                proc.on('error', reject);
                proc.on('exit', () => resolve());
            });
        } else {
            process.kill(c.pid, 'SIGTERM');
        }
    } catch {
        // ignore, we'll still mark stopped
    }

    const runtime = getRuntimeDir();
    const jsonPath = path.join(runtime, `${c.id}.json`);
    try { await fs.unlink(jsonPath); } catch {}

    const next = list.map(x => x.id === c.id ? { ...x, status: 'stopped' as const, pid: null } : x);
    await saveConnections(next);
}

export function getLogPathByName(name: string): string | null {
    return null; // we keep log path on the connection; the UI can read from storage
}
