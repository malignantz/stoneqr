/**
 * Evidence for docs/research/artistic-qr.md: the "shape made of blocks" look needs no new engine.
 * Feed a 1-bit silhouette to the halftone renderer we already ship and the glyph reads, with the
 * decode check passing on the first attempt.
 *
 * Run from the repo root:
 *   bun docs/research/artistic-qr-wifi-glyph.ts
 */
import { encode } from '../../packages/engine/src/index.js';
import { halftoneWithFallback, halftoneVersionFor } from '../../packages/engine/src/render/halftone.js';
import { encodePng } from '../../packages/engine/src/export/png.js';
import { writeFileSync } from 'node:fs';


/** A WiFi glyph as a hard 1-bit silhouette: three arcs and a dot, black on white. */
function wifiGlyph(side: number) {
	const data = new Uint8ClampedArray(side * side * 4).fill(255);
	const cx = side / 2;
	const cy = side * 0.82;
	const bands = [
		[0.60, 0.72],
		[0.40, 0.52],
		[0.20, 0.32]
	];
	for (let y = 0; y < side; y++) {
		for (let x = 0; x < side; x++) {
			const dx = x - cx;
			const dy = y - cy;
			const r = Math.hypot(dx, dy) / side;
			const up = -dy;
			const ang = Math.atan2(up, Math.abs(dx));
			let dark = false;
			if (ang > Math.PI / 4 - 0.02) {
				for (const [a, b] of bands) if (r >= a && r <= b) dark = true;
			}
			if (r <= 0.09) dark = true;
			if (dark) {
				const i = (y * side + x) * 4;
				data[i] = data[i + 1] = data[i + 2] = 0;
			}
		}
	}
	return { width: side, height: side, data };
}

const payload = 'WIFI:T:WPA;S:Monarch Manor;P:butterfly2026;;';
const qr = encode(payload, { ecc: 'H', minVersion: halftoneVersionFor(payload) });
const res = halftoneWithFallback(qr, wifiGlyph(512), payload, { pxPerModule: 12, dotScale: 0.4 });
writeFileSync('docs/research/artistic-qr-wifi-glyph.png', encodePng(res.raster, { dpi: 300 }));
console.log(JSON.stringify({ version: (qr.size - 17) / 4, size: qr.size, ok: res.ok, note: res.note, attempts: res.attempts }, null, 1));
