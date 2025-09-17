import { useCallback, useEffect, useState } from 'react';
import { loadConnections, saveConnections, type Connection } from '../utils/storage.js';
import { validateConnectionsStatus } from '../utils/frpcManager.js';

export function useConnections() {
    const [connections, setConnections] = useState<Connection[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const reload = useCallback(async () => {
        try {
            setLoading(true);
            await validateConnectionsStatus();
            const list = await loadConnections();
            setConnections(list);
            setError(null);
        } catch (e: any) {
            setError(e?.message || '加载失败');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void reload();
    }, [reload]);

    const persist = useCallback(async (next: Connection[]) => {
        setConnections(next);
        await saveConnections(next);
    }, []);

    const add = useCallback(async (c: Connection) => {
        await persist([...(connections ?? []), c]);
    }, [connections, persist]);

    const updateById = useCallback(async (id: string, patch: Partial<Connection>) => {
        const next = (connections ?? []).map(c => c.id === id ? { ...c, ...patch } : c);
        await persist(next);
    }, [connections, persist]);

    const removeById = useCallback(async (id: string) => {
        const list = connections ?? [];
        const target = list.find(c => c.id === id);
        if (target && target.status === 'running') {
            // 运行中不允许删除：保持不变
            return;
        }
        const next = list.filter(c => c.id !== id);
        await persist(next);
    }, [connections, persist]);

    return { connections, loading, error, reload, add, updateById, removeById };
}
