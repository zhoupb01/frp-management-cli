import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import { randomUUID } from 'node:crypto';
import React, { useState } from 'react';
import { loadConnections, saveConnections, type Connection } from '../utils/storage.js';
import { padToWidth, strWidth } from '../utils/text.js';

export type InteractiveFormProps = {
    mode?: 'add' | 'edit';
    initial?: Connection | null;
    onComplete: (saved: Connection) => void;
    onCancel: () => void;
};

type Draft = {
    name: string;
    frp_server_addr: string;
    frp_server_port: string; // keep as string for input; convert to number later
    token: string;
    type: 'tcp' | 'udp';
    local_ip: string;
    local_port: string;
    remote_port: string;
};

type StepKey = keyof Draft | 'confirm';

const initialDraft: Draft = {
    name: '',
    frp_server_addr: '',
    frp_server_port: '7000',
    token: '',
    type: 'tcp',
    local_ip: '127.0.0.1',
    local_port: '',
    remote_port: ''
};

export default function InteractiveForm({ mode = 'add', initial = null, onComplete, onCancel }: InteractiveFormProps) {
    const [draft, setDraft] = useState<Draft>(() => {
        if (initial) {
            return {
                name: initial.name,
                frp_server_addr: initial.frp_server_addr,
                frp_server_port: String(initial.frp_server_port),
                token: initial.token ?? '',
                type: initial.type,
                local_ip: initial.local_ip,
                local_port: String(initial.local_port),
                remote_port: String(initial.remote_port)
            };
        }
        return initialDraft;
    });
    const [stepIndex, setStepIndex] = useState(0);
    const steps: StepKey[] = [
        'name',
        'frp_server_addr',
        'frp_server_port',
        'token',
        'type',
        'local_ip',
        'local_port',
        'remote_port',
        'confirm'
    ];
    const step = steps[stepIndex];
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [existingNames, setExistingNames] = useState<string[] | null>(null);

    React.useEffect(() => {
        loadConnections().then(list => setExistingNames(list.map(c => c.name)));
    }, []);

    useInput((input, key) => {
        if (key.escape) {
            onCancel();
        }
    });

    const labels: Record<Exclude<StepKey, 'confirm'>, string> = {
        name: '连接名称',
        frp_server_addr: '服务器地址（IP或域名）',
        frp_server_port: '服务器端口',
        token: '认证令牌（可选）',
        type: '代理类型',
        local_ip: '本地IP',
        local_port: '本地端口',
        remote_port: '远程端口'
    };

    function validate(field: StepKey): string | null {
        if (field === 'confirm') return null;
        const v = draft[field as keyof Draft] as string | Draft['type'];

        switch (field) {
            case 'name': {
                if (!String(v).trim()) return '名称必填';
                if (existingNames) {
                    const newName = String(v).trim();
                    const conflict = existingNames.includes(newName) && (!initial || newName !== initial.name);
                    if (conflict) return '名称已存在';
                }
                return null;
            }
            case 'frp_server_addr': {
                if (!String(v).trim()) return '服务器地址必填';
                return null;
            }
            case 'frp_server_port': {
                const n = Number(draft.frp_server_port);
                if (!Number.isInteger(n)) return '端口必须是整数';
                if (n < 1 || n > 65535) return '端口范围 1-65535';
                return null;
            }
            case 'local_ip': {
                if (!String(v).trim()) return '本地 IP 必填';
                return null;
            }
            case 'local_port':
            case 'remote_port': {
                const n = Number(draft[field]);
                if (!Number.isInteger(n)) return '端口必须是整数';
                if (n < 1 || n > 65535) return '端口范围 1-65535';
                return null;
            }
            case 'type':
            case 'token':
            default:
                return null;
        }
    }

    async function next() {
        const err = validate(step);
        if (err) {
            setError(err);
            return;
        }
        setError(null);
        if (stepIndex < steps.length - 1) {
            setStepIndex(stepIndex + 1);
        }
    }

    async function submit() {
        const fieldsValid = steps
            .filter(s => s !== 'confirm')
            .every(s => validate(s) === null);
        if (!fieldsValid) return;
        setSaving(true);
        const list = await loadConnections();
        if (mode === 'edit' && initial) {
            const fresh = list.find(c => c.id === initial.id);
            if (fresh && fresh.status === 'running') {
                setSaving(false);
                setError('运行中不允许修改');
                return;
            }
        }
        if (mode === 'add') {
            const conn: Connection = {
                id: randomUUID(),
                name: draft.name.trim(),
                frp_server_addr: draft.frp_server_addr.trim(),
                frp_server_port: Number(draft.frp_server_port),
                token: draft.token ? draft.token : null,
                type: draft.type,
                local_ip: draft.local_ip.trim(),
                local_port: Number(draft.local_port),
                remote_port: Number(draft.remote_port),
                status: 'stopped',
                log_file_path: null
            };
            // uniqueness re-check (race)
            if (list.some(c => c.name === conn.name)) {
                setSaving(false);
                setError('名称已存在');
                setStepIndex(0);
                return;
            }
            await saveConnections([...list, conn]);
            setSaving(false);
            onComplete(conn);
        } else {
            // edit mode
            if (!initial) {
                setSaving(false);
                setError('无有效的初始数据');
                return;
            }
            const idx = list.findIndex(c => c.id === initial.id);
            if (idx === -1) {
                setSaving(false);
                setError('未找到要编辑的连接');
                return;
            }
            // name uniqueness re-check (excluding self)
            if (list.some(c => c.name === draft.name.trim() && c.id !== initial.id)) {
                setSaving(false);
                setError('名称已存在');
                setStepIndex(0);
                return;
            }
            const existing = list[idx];
            const updated: Connection = {
                ...existing,
                name: draft.name.trim(),
                frp_server_addr: draft.frp_server_addr.trim(),
                frp_server_port: Number(draft.frp_server_port),
                token: draft.token ? draft.token : null,
                type: draft.type,
                local_ip: draft.local_ip.trim(),
                local_port: Number(draft.local_port),
                remote_port: Number(draft.remote_port)
            };
            const next = [...list];
            next[idx] = updated;
            await saveConnections(next);
            setSaving(false);
            onComplete(updated);
        }
    }

    const CompletedLine: React.FC<{ label: string; value: string }> = ({ label, value }) => (
        <Text>
            <Text color="green">✔  </Text>
            <Text bold>{label}：</Text>
            <Text> {value}</Text>
        </Text>
    );

    return (
        <Box flexDirection="column">
            <Text bold>{mode === 'edit' ? '编辑连接 - 向导' : '新增连接 - 向导'} (按 Esc 取消)</Text>
            <Box marginTop={1} flexDirection="column">
                {(['name', 'frp_server_addr', 'frp_server_port', 'token', 'type', 'local_ip', 'local_port', 'remote_port'] as StepKey[]).map((k) => {
                    if (steps.indexOf(k) < stepIndex || (step === 'confirm' && steps.indexOf(k) < steps.length - 1)) {
                        const val = k === 'type' ? draft.type : String(draft[k as keyof Draft] ?? '');
                        const display = k === 'token' && val ? '********' : val;
                        return <CompletedLine key={k} label={labels[k as Exclude<StepKey, 'confirm'>]} value={display} />;
                    }
                    return null;
                })}

                {step !== 'confirm' && (
                    step === 'type' ? (
                        <Box marginTop={1} flexDirection="column">
                            <Text>
                                <Text bold>{labels[step as Exclude<StepKey, 'confirm'>]}</Text>
                                <Text>：</Text>
                            </Text>
                            <Box marginTop={0}>
                                <SelectInput
                                    items={[{ label: 'tcp', value: 'tcp' }, { label: 'udp', value: 'udp' }]}
                                    initialIndex={draft.type === 'tcp' ? 0 : 1}
                                    onSelect={(item: any) => {
                                        setDraft({ ...draft, type: item.value });
                                        void next();
                                    }}
                                />
                            </Box>
                        </Box>
                    ) : (
                        <Box marginTop={1} flexDirection="row" alignItems="flex-start">
                            <Text>
                                <Text bold>{labels[step as Exclude<StepKey, 'confirm'>]}</Text>
                                <Text>：</Text>
                            </Text>
                            <TextInput
                                value={String(draft[step as keyof Draft] ?? '')}
                                onChange={(v: string) => setDraft({ ...draft, [step]: v } as Draft)}
                                onSubmit={() => void next()}
                                placeholder={step === 'token' ? '(可留空)' : undefined}
                                focus
                                {...(step === 'token' ? { mask: '*' as any } : {})}
                            />
                        </Box>
                    )
                )}

                {step === 'confirm' && (
                    <Box marginTop={1} flexDirection="column">
                        {(() => {
                            // 复用共享文本宽度工具

                            const rows: Array<[string, string]> = [
                                ['连接名称', draft.name],
                                ['服务器地址', draft.frp_server_addr],
                                ['服务器端口', String(draft.frp_server_port)],
                                ['令牌', draft.token ? '********' : '（无）'],
                                ['代理类型', draft.type],
                                ['本地IP', draft.local_ip],
                                ['本地端口', String(draft.local_port)],
                                ['远程端口', String(draft.remote_port)]
                            ];

                            const KEY_W = Math.max(12, ...rows.map(([k]) => strWidth(k)));
                            const VAL_W = Math.max(12, ...rows.map(([, v]) => strWidth(v)));
                            const FULL_W = (KEY_W + 2) + 1 + (VAL_W + 2); // 左单元格+分隔+右单元格

                            const lines: string[] = [];
                            lines.push('┌' + '─'.repeat(FULL_W) + '┐');
                            lines.push('│ ' + padToWidth('配置信息', FULL_W - 2) + ' │');
                            lines.push('├' + '─'.repeat(KEY_W + 2) + '┬' + '─'.repeat(VAL_W + 2) + '┤');
                            for (const [k, v] of rows) {
                                lines.push('│ ' + padToWidth(k, KEY_W) + ' │ ' + padToWidth(v, VAL_W) + ' │');
                            }
                            lines.push('└' + '─'.repeat(KEY_W + 2) + '┴' + '─'.repeat(VAL_W + 2) + '┘');

                            return (
                                <>
                                    {lines.map((ln, i) => (
                                        <Text key={i}>{ln}</Text>
                                    ))}
                                </>
                            );
                        })()}
                        <Text>？以上信息是否正确？(Y/n)</Text>
                        <Confirm onYes={() => void submit()} onNo={() => setStepIndex(0)} disabled={saving} />
                    </Box>
                )}

                {error && (
                    <Box marginTop={1}>
                        <Text color="red">✖ {error}</Text>
                    </Box>
                )}
                {saving && (
                    <Box marginTop={1}>
                        <Text color="blue">ℹ 正在保存...</Text>
                    </Box>
                )}
            </Box>
        </Box>
    );
}

const Confirm: React.FC<{ onYes: () => void; onNo: () => void; disabled?: boolean }> = ({ onYes, onNo, disabled }) => {
    useInput((input, key) => {
        if (disabled) return;
        if (input?.toLowerCase() === 'y' || key.return) onYes();
        if (input?.toLowerCase() === 'n') onNo();
    });
    return <Text color={disabled ? 'gray' : undefined}>[Y]es / [n]o (Enter=Yes)</Text>;
};
