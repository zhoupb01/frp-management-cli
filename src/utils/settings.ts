import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

export type Settings = {
    // 绝对路径到 frpc 可执行文件，例如：
    // - Linux/macOS: /home/user/.frpm/frpc
    // - Windows: C:\\Users\\user\\.frpm\\frpc.exe
    frpcPath?: string | null;
};

const settingsDir = path.join(os.homedir(), '.frpm');
const settingsFile = path.join(settingsDir, 'settings.json');

async function ensureSettingsDir() {
    await fs.mkdir(settingsDir, { recursive: true });
}

export async function loadSettings(): Promise<Settings> {
    try {
        await ensureSettingsDir();
        const buf = await fs.readFile(settingsFile);
        const json = JSON.parse(String(buf));
        if (json && typeof json === 'object') return json as Settings;
        return {};
    } catch (e: any) {
        if (e && (e.code === 'ENOENT' || e.code === 'ERR_MODULE_NOT_FOUND')) {
            return {};
        }
        return {};
    }
}

export async function saveSettings(s: Settings): Promise<void> {
    await ensureSettingsDir();
    await fs.writeFile(settingsFile, JSON.stringify(s, null, 4), 'utf8');
}

export function getSettingsPaths() {
    return { settingsDir, settingsFile };
}
