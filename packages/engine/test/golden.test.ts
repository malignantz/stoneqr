import { describe, expect, it } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { encode } from '../src/encode.js';
import { renderSvg } from '../src/render/svg.js';
import { exportEps } from '../src/export/eps.js';
import { payloads } from '../src/payloads/index.js';

/**
 * Byte-for-byte goldens (plan §12) for the two renderers whose output is a hand-built string:
 * the single-path SVG and the hand-written EPS. They catch drift that the structural tests
 * cannot see — a reordered attribute, a changed rounding rule, a lost quiet zone.
 *
 * When a change to the renderer is intended, read the diff, then regenerate with:
 *   UPDATE_GOLDENS=1 bun run --cwd packages/engine test
 */
function golden(name: string, actual: string): void {
	const file = fileURLToPath(new URL(`./golden/${name}`, import.meta.url));
	const content = `${actual}\n`;
	if (process.env.UPDATE_GOLDENS) {
		writeFileSync(file, content);
		return;
	}
	const expected = readFileSync(file, 'utf8');
	expect(content, `${name} drifted; review the diff, then rerun with UPDATE_GOLDENS=1`).toBe(expected);
}

describe('golden SVG', () => {
	it('plain URL at the defaults', () => {
		golden('url-30mm.svg', renderSvg(encode('https://stoneqr.app/print-size')));
	});

	it('WiFi at Q, transparent background, tight quiet zone, escaped title', () => {
		const qr = encode(payloads.wifi({ ssid: 'Cafe & Co', password: 'p;ss"word', auth: 'WPA' }), { ecc: 'Q' });
		golden(
			'wifi-q-transparent.svg',
			renderSvg(qr, {
				widthMm: 42.5,
				quietZone: 2,
				fg: '#1b3a2f',
				bg: 'transparent',
				title: 'WiFi: Cafe & Co <guest>'
			})
		);
	});

	it('a large vCard at H, where the version and run merging both matter', () => {
		const qr = encode(
			payloads.vcard({
				firstName: 'Garrett',
				lastName: 'Holmes',
				org: 'StoneQR',
				title: 'Maker',
				mobile: '+15555550100',
				email: 'hello@stoneqr.app',
				url: 'https://stoneqr.app'
			}),
			{ ecc: 'H' }
		);
		expect(qr.version).toBeGreaterThan(6);
		golden('vcard-h-50mm.svg', renderSvg(qr, { widthMm: 50, title: false }));
	});
});

describe('golden EPS', () => {
	it('plain URL at 30 mm, CMYK', () => {
		golden('url-30mm.eps', exportEps(encode('https://stoneqr.app/print-size'), { widthMm: 30, title: 'Print size guide' }));
	});
});
