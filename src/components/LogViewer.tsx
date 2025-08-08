import { Box, Text, useInput } from 'ink';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { useEffect, useMemo, useRef, useState } from 'react';
import { loadConnections } from '../utils/storage.js';

type Props = { name: string; onExit: () => void };

const MAX_LINES = 500;
const BOOTSTRAP_BYTES = 64 * 1024; // initial tail size
const TICK_MS = 500;

export default function LogViewer({ name, onExit }: Props) {
    const [err, setErr] = useState<string | null>(null);
    const [info, setInfo] = useState<string>('正在准备日志...');
    const [lines, setLines] = useState<string[]>([]);
    const [logPath, setLogPath] = useState<string | null>(null);

    const lastSizeRef = useRef<number>(0);
    const trailingRef = useRef<string>('');
    const mountedRef = useRef<boolean>(false);

    useInput((input, key) => {
        if (key.escape || input?.toLowerCase() === 'q') onExit();
    });

    // Resolve log file path by connection name
    useEffect(() => {
        mountedRef.current = true;
        (async () => {
            try {
                const list = await loadConnections();
                const conn = list.find(c => c.name === name);
                if (!conn) {
                    setErr(`未找到名为 '${name}' 的连接。`);
                    setInfo('');
                    return;
                }
                const candidate = conn.log_file_path || path.join(os.homedir(), '.frpm', 'runtime', `${conn.id}.log`);
                setLogPath(candidate);
                setErr(null);
            } catch (e: any) {
                setErr(e?.message || '加载连接失败');
                setInfo('');
            }
        })();
        return () => {
            mountedRef.current = false;
        };
    }, [name]);

    // Tail the file
    useEffect(() => {
        if (!logPath) return;

        let cancelled = false;
        let timer: NodeJS.Timeout | null = null;

        async function readRange(pos: number, len: number): Promise<string> {
            const fh = await fs.open(logPath!, 'r');
            try {
                const buf = Buffer.alloc(Math.max(0, len));
                const { bytesRead } = await fh.read({ buffer: buf, position: pos });
                return buf.toString('utf8', 0, bytesRead);
            } finally {
                await fh.close();
            }
        }

        function pushText(chunk: string) {
            if (!chunk) return;
            const full = (trailingRef.current || '') + chunk;
            const parts = full.split(/\r?\n/);
            trailingRef.current = parts.pop() ?? '';
            if (parts.length) {
                setLines(prev => {
                    const merged = [...prev, ...parts];
                    if (merged.length > MAX_LINES) return merged.slice(merged.length - MAX_LINES);
                    return merged;
                });
            }
        }

        async function bootstrap() {
            try {
                const st = await fs.stat(logPath!);
                if (!st.isFile()) throw new Error('日志路径不是文件');
                const size = st.size;
                const start = size > BOOTSTRAP_BYTES ? size - BOOTSTRAP_BYTES : 0;
                const text = await readRange(start, size - start);
                lastSizeRef.current = size;
                setInfo('按 Esc 或 q 返回');
                setErr(null);
                // Fill initial lines
                trailingRef.current = '';
                setLines(() => {
                    const arr = text.split(/\r?\n/);
                    // If last line is partial without newline, keep as trailing
                    trailingRef.current = arr.pop() ?? '';
                    const tail = arr.length > MAX_LINES ? arr.slice(arr.length - MAX_LINES) : arr;
                    return tail;
                });
            } catch (e: any) {
                setErr(null);
                setInfo('等待日志文件创建...');
                lastSizeRef.current = 0;
                // keep polling
            }
        }

        async function tick() {
            if (cancelled) return;
            try {
                const st = await fs.stat(logPath!);
                const size = st.size;
                // file truncated or rotated
                if (size < lastSizeRef.current) {
                    lastSizeRef.current = 0;
                    setLines([]);
                    trailingRef.current = '';
                }
                if (size > lastSizeRef.current) {
                    const text = await readRange(lastSizeRef.current, size - lastSizeRef.current);
                    lastSizeRef.current = size;
                    pushText(text);
                    setInfo('按 Esc 或 q 返回');
                    setErr(null);
                }
            } catch (e) {
                // file might not exist yet
                setInfo('等待日志文件创建...');
            }
        }

        void bootstrap();
        timer = setInterval(() => { void tick(); }, TICK_MS);
        return () => {
            cancelled = true;
            if (timer) clearInterval(timer);
        };
    }, [logPath]);

    const coloredLines = useMemo(() => {
        return lines.map((ln) => {
            // naive level detection
            if (/\b\[E\]| error |\berr\b/i.test(ln)) return { text: ln, color: 'red' as const };
            if (/\b\[W\]| warn/i.test(ln)) return { text: ln, color: 'yellow' as const };
            if (/\b\[D\]| debug/i.test(ln)) return { text: ln, color: 'gray' as const };
            return { text: ln, color: undefined };
        });
    }, [lines]);

    return (
        <Box flexDirection="column">
            <Text>[日志] 正在显示 '{name}' {logPath ? `(${logPath})` : ''}</Text>
            {!!info && (
                <Box marginTop={1}><Text color="blue">ℹ {info}</Text></Box>
            )}
            {err && (
                <Box marginTop={1}><Text color="red">✖ {err}</Text></Box>
            )}
            <Box marginTop={1} flexDirection="column">
                {coloredLines.map((l, i) => (
                    <Text key={i} color={l.color as any}>{l.text}</Text>
                ))}
                {trailingRef.current ? <Text>{trailingRef.current}</Text> : null}
            </Box>
            <Box marginTop={1}><Text color="gray">[Esc/q] 返回</Text></Box>
        </Box>
    );
}
