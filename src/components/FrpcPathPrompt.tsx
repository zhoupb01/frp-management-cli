import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import React, { useEffect, useState } from 'react';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { loadSettings, saveSettings } from '../utils/settings.js';

type Props = {
    onSaved: () => void;
    onCancel?: () => void;
};

export default function FrpcPathPrompt({ onSaved, onCancel }: Props) {
    const [value, setValue] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        (async () => {
            const s = await loadSettings();
            if (s.frpcPath) setValue(s.frpcPath);
        })();
    }, []);

    useInput((input, key) => {
        if (key.escape) onCancel?.();
    });

    async function submit() {
        const p = value.trim();
        if (!p) {
            setError('路径不能为空');
            return;
        }
        try {
            const st = await fs.stat(p);
            if (!st.isFile()) {
                setError('指定路径不是文件');
                return;
            }
            // quick exec bit hint on unix can be skipped; existence is enough
        } catch (e: any) {
            setError(`访问失败：${e?.message || e}`);
            return;
        }

        setSaving(true);
        await saveSettings({ frpcPath: p });
        setSaving(false);
        onSaved();
    }

    const example = process.platform === 'win32'
        ? path.join(os.homedir(), '.frpm', 'frpc.exe')
        : path.join(os.homedir(), '.frpm', 'frpc');

    return (
        <Box flexDirection="column">
            <Text bold>首次使用：配置 frpc 路径 (按 Esc 取消)</Text>
            <Box marginTop={1}>
                <Text>请输入 frpc 可执行文件的绝对路径：</Text>
            </Box>
            <Box>
                <Text color="gray">示例: {example}</Text>
            </Box>
            <Box marginTop={1}>
                <TextInput
                    value={value}
                    onChange={setValue}
                    onSubmit={() => void submit()}
                    placeholder={example}
                />
            </Box>
            {error && (
                <Box marginTop={1}><Text color="red">✖ {error}</Text></Box>
            )}
            {saving && (
                <Box marginTop={1}><Text color="blue">ℹ 正在保存...</Text></Box>
            )}
        </Box>
    );
}
