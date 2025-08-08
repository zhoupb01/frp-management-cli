import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

export type Connection = {
    id: string;
    name: string;
    frp_server_addr: string;
    frp_server_port: number;
    token?: string | null;
    type: 'tcp' | 'udp';
    local_ip: string;
    local_port: number;
    remote_port: number;
    status: 'running' | 'stopped' | 'error';
    log_file_path: string | null;
    pid?: number | null;
};

const dataDir = path.join(os.homedir(), '.frpm');
const dataFile = path.join(dataDir, 'connections.json');

async function ensureDataDir() {
    await fs.mkdir(dataDir, { recursive: true });
}

export async function loadConnections(): Promise<Connection[]> {
    try {
        await ensureDataDir();
        const buf = await fs.readFile(dataFile);
        const json = JSON.parse(String(buf));
        if (Array.isArray(json)) return json as Connection[];
        return [];
    } catch (e: any) {
        if (e && (e.code === 'ENOENT' || e.code === 'ERR_MODULE_NOT_FOUND')) {
            return [];
        }
        // fallback: if file content invalid, return empty
        return [];
    }
}

export async function saveConnections(list: Connection[]): Promise<void> {
    await ensureDataDir();
    await fs.writeFile(dataFile, JSON.stringify(list, null, 4), 'utf8');
}

export function getStoragePaths() {
    return { dataDir, dataFile };
}
