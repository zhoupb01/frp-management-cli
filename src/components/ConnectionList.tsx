import { Box, Text } from 'ink';
import type { Connection } from '../utils/storage.js';
import { padToWidth, strWidth } from '../utils/text.js';

export type ConnectionListProps = {
    items: Connection[];
    selectedIndex: number;
};

export default function ConnectionList({ items, selectedIndex }: ConnectionListProps) {
    if (items.length === 0) {
        return <Text color="gray">暂无连接。按 [a] 新增。</Text>;
    }

    // 使用共享的宽度工具，确保一致的对齐

    const statusLabels = items.map(i => (i.status === 'running' ? '运行' : i.status === 'error' ? '异常' : '停止'));
    const pidLabels = items.map(i => (i.status === 'running' && i.pid ? String(i.pid) : '-'));
    const statusW = Math.max(strWidth('状态'), ...statusLabels.map(strWidth));
    const pidW = Math.max(strWidth('PID'), ...pidLabels.map(strWidth));
    const nameW = Math.max(strWidth('名称'), ...items.map(i => strWidth(i.name)), 6);
    const typeW = Math.max(strWidth('类型'), ...items.map(i => strWidth(i.type)), 3);
    const localW = Math.max(strWidth('本地'), ...items.map(i => strWidth(`${i.local_ip}:${i.local_port}`)), 9);
    const remoteW = Math.max(strWidth('远端'), ...items.map(i => strWidth(`${i.frp_server_addr}:${i.remote_port}`)), 9);

    return (
        <Box flexDirection="column">
            <Text color="gray">
                {'  '}{padToWidth('状态', statusW)}  {padToWidth('PID', pidW)}  {padToWidth('名称', nameW)}  {padToWidth('类型', typeW)}  {padToWidth('本地', localW)}  {' -> '}  {padToWidth('远端', remoteW)}
            </Text>
            {items.map((c, idx) => {
                const active = idx === selectedIndex;
                const statusLabel = c.status === 'running' ? '运行' : c.status === 'error' ? '异常' : '停止';
                const statusColor = (c.status === 'running' ? 'green' : c.status === 'error' ? 'yellow' : 'red') as any;
                const statusGap = Math.max(0, statusW - strWidth(statusLabel));
                const pidStr = (c.status === 'running' && c.pid ? String(c.pid) : '-');
                const pidPart = padToWidth(pidStr, pidW);
                const namePart = padToWidth(c.name, nameW);
                const typePart = padToWidth(c.type, typeW);
                const localPart = padToWidth(`${c.local_ip}:${c.local_port}`, localW);
                const remotePart = padToWidth(`${c.frp_server_addr}:${c.remote_port}`, remoteW);
                return (
                    <Text key={c.id} inverse={active}>
                        {active ? '> ' : '  '}
                        <Text color={statusColor}>{statusLabel}</Text>
                        {' '.repeat(statusGap)}  <Text color={c.status === 'running' ? 'cyan' : 'gray'}>{pidPart}</Text>  {namePart}  {typePart}  {localPart}  {' -> '}  {remotePart}
                    </Text>
                );
            })}
        </Box>
    );
}
