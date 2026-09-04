import { describe, expect, it } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { FRAME, frameSvg } from '$lib/styled';

/**
 * Byte-for-byte goldens (plan §12) for the call-to-action frame. The frame is our own SVG
 * wrapper rather than the styling library's border plugin, so nothing upstream will catch a
 * regression in it, and its geometry is what the scan matrix and the export maths depend on.
 *
 * When a change to the wrapper is intended, read the diff, then regenerate with:
 *   UPDATE_GOLDENS=1 bun run --cwd apps/site test
 */
function golden(name: string, actual: string): void {
	const file = fileURLToPath(new URL(`./golden/${name}`, import.meta.url));
	const content = `${actual}\n`;
	if (process.env.UPDATE_GOLDENS) {
		writeFileSync(file, content);
		return;
	}
	expect(content, `${name} drifted; review the diff, then rerun with UPDATE_GOLDENS=1`).toBe(
		readFileSync(file, 'utf8')
	);
}

/** Stands in for @liquid-js/qr-code-styling's output, which only renders in a browser. */
function innerSvg({ prologue = false }: { prologue?: boolean } = {}): string {
	return (
		(prologue ? '<?xml version="1.0" encoding="UTF-8"?>\n' : '') +
		'<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">' +
		'<rect width="300" height="300" fill="#ffffff"/>' +
		'<path d="M40 40h60v60h-60z" fill="#000000"/>' +
		'</svg>'
	);
}

const BASE = { bg: '#ffffff', frame: { enabled: true, text: 'Scan me', color: '#1c1a17', textColor: '#ffffff' } };

describe('frameSvg', () => {
	it('wraps the code in a band, keeping its own quiet zone inside', () => {
		const { svg, scale } = frameSvg(innerSvg(), BASE);
		golden('frame-scan-me.svg', svg);
		expect(scale).toBeCloseTo(1 + 2 * FRAME.edge, 6);
	});

	it('strips the prologue, escapes and truncates a long label, and falls back to white paper', () => {
		const { svg } = frameSvg(innerSvg({ prologue: true }), {
			bg: 'transparent',
			frame: {
				enabled: true,
				text: '  Scan for the menu, drinks & specials at Cafe <Co>  ',
				color: '#2f5d50',
				textColor: '#f4f0e8'
			}
		});
		golden('frame-long-label.svg', svg);
		expect(svg).not.toContain('<?xml');
		expect(svg).toContain('fill="#ffffff"'); // transparent backgrounds still print on paper
	});

	it('keeps the artwork 8% wider and 21% taller than the code, as the docs and exports assume', () => {
		const { svg, scale } = frameSvg(innerSvg(), BASE);
		const [, , , w, h] = svg.match(/viewBox="([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+)"/)!.map(Number);
		expect(w! / 300).toBeCloseTo(1.08, 6);
		expect(h! / 300).toBeCloseTo(1.21, 6);
		expect(scale).toBeCloseTo(w! / 300, 6);
	});

	it('never lets an empty or whitespace label blank the band', () => {
		const { svg } = frameSvg(innerSvg(), { ...BASE, frame: { ...BASE.frame, text: '   ' } });
		expect(svg).toContain('>Scan me</text>');
	});
});
