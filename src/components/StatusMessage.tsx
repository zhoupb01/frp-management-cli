import { Box, Text } from 'ink';

type Props = {
    kind: 'success' | 'error' | 'info';
    message: string;
    borderless?: boolean;
};

export default function StatusMessage({ kind, message, borderless = false }: Props) {
    const color = kind === 'success' ? 'green' : kind === 'error' ? 'red' : 'blue';
    const icon = kind === 'success' ? '✔' : kind === 'error' ? '✖' : 'ℹ';
    const trimmed = message?.trimStart?.() ?? message;
    const showIcon = !trimmed.startsWith(icon);
    if (borderless) {
        return (
            <Box marginTop={1}>
                <Text color={color as any}>{showIcon ? `${icon} ` : ''}{message}</Text>
            </Box>
        );
    }
    return (
        <Box borderStyle="round" borderColor={color as any} paddingX={1} paddingY={0} marginTop={1}>
            <Text color={color as any}>{showIcon ? `${icon} ` : ''}{message}</Text>
        </Box>
    );
}
