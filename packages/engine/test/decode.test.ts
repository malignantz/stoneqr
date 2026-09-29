import { describe, expect, it } from 'vitest';
import { decodeRasterAsync, encode, rasterize } from '../src/index.js';

describe('decodeRasterAsync', () => {
	it('reads a code with no expected payload', async () => {
		const payload = 'WIFI:T:WPA;S:Office;P:secret;;';
		const img = rasterize(encode(payload, { ecc: 'M' }), { pxPerModule: 8 });
		expect(await decodeRasterAsync(img)).toEqual({ text: payload, decoder: 'paulmillr' });
	});
	it('falls back to jsQR for the symbol the primary decoder misses', async () => {
		const payload = 'https://example.com/item/2865?ref=bulk';
		const img = rasterize(encode(payload, { ecc: 'M' }), { pxPerModule: 8 });
		expect(await decodeRasterAsync(img)).toEqual({ text: payload, decoder: 'jsqr' });
	});
	it('returns null for a picture with no code in it', async () => {
		const width = 120;
		const height = 90;
		const data = new Uint8ClampedArray(width * height * 4).fill(255);
		for (let i = 0; i < data.length; i += 4) data[i] = data[i + 1] = data[i + 2] = ((i / 4) * 7) % 256;
		expect(await decodeRasterAsync({ width, height, data })).toBeNull();
	});
});
