// Text width utilities with CJK full-width awareness
// Exported helpers: strWidth, cutToWidth, padToWidth

export function charWidth(ch: string): number {
	const code = ch.codePointAt(0) ?? 0;
	if (
		(code >= 0x1100 && code <= 0x115F) ||
		code === 0x2329 || code === 0x232A ||
		(code >= 0x2E80 && code <= 0xA4CF) ||
		(code >= 0xAC00 && code <= 0xD7A3) ||
		(code >= 0xF900 && code <= 0xFAFF) ||
		(code >= 0xFE10 && code <= 0xFE19) ||
		(code >= 0xFE30 && code <= 0xFE6F) ||
		(code >= 0xFF00 && code <= 0xFF60) ||
		(code >= 0xFFE0 && code <= 0xFFE6)
	) return 2;
	return 1;
}

export function strWidth(s: string): number {
	let w = 0;
	for (const ch of (s ?? '').toString()) w += charWidth(ch);
	return w;
}

export function cutToWidth(s: string, w: number): string {
	let acc = '';
	let width = 0;
	for (const ch of (s ?? '').toString()) {
		const cw = charWidth(ch);
		if (width + cw > w) break;
		acc += ch;
		width += cw;
	}
	return acc;
}

export function padToWidth(s: string, w: number): string {
	const cut = cutToWidth(s, w);
	const padLen = Math.max(0, w - strWidth(cut));
	return cut + ' '.repeat(padLen);
}
