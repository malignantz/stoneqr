/** Browser-only helpers for handing files to the user. Nothing here talks to a server. */

export function downloadBlob(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.rel = 'noopener';
	document.body.appendChild(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function downloadText(text: string, filename: string, type: string): void {
	downloadBlob(new Blob([text], { type }), filename);
}

export function downloadBytes(bytes: Uint8Array, filename: string, type: string): void {
	// Copy into a fresh ArrayBuffer so Blob accepts a SharedArrayBuffer-free view.
	downloadBlob(new Blob([new Uint8Array(bytes)], { type }), filename);
}

export async function copyPngToClipboard(blob: Blob): Promise<boolean> {
	if (!('clipboard' in navigator) || typeof ClipboardItem === 'undefined') return false;
	try {
		await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
		return true;
	} catch {
		return false;
	}
}

/** A safe filename fragment from a payload description. */
export function slug(s: string, fallback = 'qr'): string {
	const out = s
		.toLowerCase()
		.replace(/https?:\/\//, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 40);
	return out || fallback;
}
