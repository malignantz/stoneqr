import { describe, expect, it } from 'vitest';
import { encode, rasterize, renderSvg, verifyRaster, sizeForVersion } from '../src/index.js';

describe('encode', () => {
	it('encodes a URL at M and reports geometry', () => {
		const qr = encode('https://stoneqr.app', { ecc: 'M' });
		expect(qr.version).toBeGreaterThanOrEqual(1);
		expect(qr.size).toBe(sizeForVersion(qr.version));
		expect(qr.matrix.length).toBe(qr.size);
		expect(qr.functionMask.length).toBe(qr.size);
		// Finder pattern top-left corner is dark.
		expect(qr.matrix[0]![0]).toBe(true);
		expect(qr.moduleTypes[0]![0]).toBe('finder');
		// Timing pattern on row 6 alternates starting dark at column 8.
		expect(qr.moduleTypes[6]![8]).toBe('timing');
		expect(qr.matrix[6]![8]).toBe(true);
		expect(qr.matrix[6]![9]).toBe(false);
	});
	it('raises version when ECC rises', () => {
		const payload = 'https://example.com/a/fairly/long/path?with=query&and=more';
		const l = encode(payload, { ecc: 'L' });
		const h = encode(payload, { ecc: 'H' });
		expect(h.version).toBeGreaterThan(l.version);
	});
	it('throws a friendly error when too long', () => {
		expect(() => encode('x'.repeat(5000))).toThrow(/too long/);
	});
	it('honours a fixed mask', () => {
		expect(encode('hello', { mask: 3 }).mask).toBe(3);
	});
});

describe('svg', () => {
	it('emits mm dimensions and a single path', () => {
		const qr = encode('hello');
		const svg = renderSvg(qr, { widthMm: 30 });
		expect(svg).toContain('width="30mm"');
		expect(svg).toContain(`viewBox="0 0 ${qr.size + 8} ${qr.size + 8}"`);
		expect((svg.match(/<path/g) ?? []).length).toBe(1);
	});
});

describe('verify', () => {
	it('round-trips through the decoder', () => {
		const payload = 'WIFI:T:WPA;S:Office;P:secret;;';
		const qr = encode(payload, { ecc: 'M' });
		const img = rasterize(qr, { pxPerModule: 8 });
		expect(verifyRaster(img, payload)).toEqual({ ok: true, decoded: payload });
	});
	it('reports mismatch', () => {
		const qr = encode('abc');
		expect(verifyRaster(rasterize(qr), 'xyz').reason).toBe('mismatch');
	});
});

describe('verify fallback decoder', () => {
	it('accepts a valid symbol the primary decoder misses', async () => {
		const { verifyRasterAsync } = await import('../src/index.js');
		// Known blind spot: version 3, ECC M, mask 2 for this payload.
		const payload = 'https://example.com/item/2865?ref=bulk';
		const qr = encode(payload, { ecc: 'M' });
		const img = rasterize(qr, { pxPerModule: 8 });
		expect(verifyRaster(img, payload).ok).toBe(false);
		const r = await verifyRasterAsync(img, payload);
		expect(r.ok).toBe(true);
		expect(r.decoder).toBe('jsqr');
	});
});
