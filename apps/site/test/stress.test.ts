import { describe, expect, it } from 'vitest';
import { encode, rasterize, verifyRasterAsync } from '@stoneqr/engine';
import {
	CONDITIONS,
	DIM_HIGH,
	DIM_LOW,
	SMALL_MODULE_PX,
	applyCondition,
	flatten,
	gaussianBlur,
	modulePx,
	resizeBox,
	rotation,
	runStress,
	shear,
	squeezeLevels,
	summarise,
	toRgba,
	warp,
	type Rgba
} from '$lib/generator/stress';

/** A solid RGBA image. */
function solid(w: number, h: number, rgb: [number, number, number], a = 255): Rgba {
	const data = new Uint8ClampedArray(w * h * 4);
	for (let i = 0; i < w * h; i++) data.set([rgb[0], rgb[1], rgb[2], a], i * 4);
	return { width: w, height: h, data };
}

/** White with a single black pixel at the given place. */
function dot(w: number, h: number, x: number, y: number): Rgba {
	const img = solid(w, h, [255, 255, 255]);
	img.data.set([0, 0, 0, 255], (y * w + x) * 4);
	return img;
}

const red = (img: Rgba) => Array.from({ length: img.width * img.height }, (_, i) => img.data[i * 4]!);

describe('module size', () => {
	it('is the width over the modules across, quiet zone included', () => {
		expect(modulePx(232, 25, 4)).toBe(232 / 33);
		expect(modulePx(264, 25, 4)).toBe(8);
	});
	it('takes the frame out of the width when there is one', () => {
		expect(modulePx(264 * 1.25, 25, 4, 1.25)).toBeCloseTo(8, 10);
	});
});

describe('toRgba and flatten', () => {
	it('adds an opaque alpha to an RGB buffer', () => {
		const rgb = toRgba({ width: 2, height: 1, data: [1, 2, 3, 4, 5, 6] });
		expect(Array.from(rgb.data)).toEqual([1, 2, 3, 255, 4, 5, 6, 255]);
	});
	it('leaves RGBA as it is', () => {
		const img = solid(2, 2, [9, 8, 7]);
		expect(toRgba(img).data).toBe(img.data);
	});
	it('lays a transparent pixel on white and blends a half one', () => {
		const img: Rgba = { width: 2, height: 1, data: new Uint8ClampedArray([0, 0, 0, 0, 0, 0, 0, 128]) };
		const out = flatten(img);
		expect(Array.from(out.data.slice(0, 4))).toEqual([255, 255, 255, 255]);
		expect(out.data[4]).toBeGreaterThan(120);
		expect(out.data[4]).toBeLessThan(135);
		expect(out.data[7]).toBe(255);
	});
});

describe('squeezeLevels', () => {
	it('puts black and white where it is told', () => {
		const img: Rgba = { width: 2, height: 1, data: new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255]) };
		expect(Array.from(squeezeLevels(img, 85, 170).data)).toEqual([85, 85, 85, 255, 170, 170, 170, 255]);
	});
	it('defaults to about the middle third, centred', () => {
		const img: Rgba = { width: 2, height: 1, data: new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255]) };
		const out = squeezeLevels(img);
		expect(out.data[0]).toBe(DIM_LOW);
		expect(out.data[4]).toBe(DIM_HIGH);
		expect((DIM_LOW + DIM_HIGH) / 2).toBeCloseTo(127.5, 0);
		// Wider than exactly a third, which the decoders cannot read, and narrower than half.
		expect(DIM_HIGH - DIM_LOW).toBeGreaterThan(85);
		expect(DIM_HIGH - DIM_LOW).toBeLessThan(128);
	});
	it('keeps the order of the greys', () => {
		const img: Rgba = { width: 3, height: 1, data: new Uint8ClampedArray([10, 10, 10, 255, 100, 100, 100, 255, 200, 200, 200, 255]) };
		const out = squeezeLevels(img);
		expect(out.data[0]!).toBeLessThan(out.data[4]!);
		expect(out.data[4]!).toBeLessThan(out.data[8]!);
	});
});

describe('gaussianBlur', () => {
	it('does nothing at sigma 0', () => {
		const img = dot(9, 9, 4, 4);
		expect(gaussianBlur(img, 0)).toBe(img);
	});
	it('leaves a flat image flat', () => {
		const out = gaussianBlur(solid(12, 12, [40, 90, 200]), 2);
		expect(new Set(Array.from(out.data))).toEqual(new Set([40, 90, 200, 255]));
	});
	it('spreads a dot and keeps its weight', () => {
		const img = dot(21, 21, 10, 10);
		const out = gaussianBlur(img, 1.5);
		const before = red(img).reduce((s, v) => s + (255 - v), 0);
		const after = red(out).reduce((s, v) => s + (255 - v), 0);
		expect(Math.abs(after - before)).toBeLessThan(before * 0.06);
		// The dot is fainter in the middle and grey at its neighbours.
		expect(out.data[(10 * 21 + 10) * 4]!).toBeGreaterThan(0);
		expect(out.data[(10 * 21 + 11) * 4]!).toBeLessThan(255);
	});
	it('is symmetrical', () => {
		const out = gaussianBlur(dot(21, 21, 10, 10), 2);
		const at = (x: number, y: number) => out.data[(y * 21 + x) * 4]!;
		expect(at(8, 10)).toBe(at(12, 10));
		expect(at(10, 8)).toBe(at(10, 12));
	});
});

describe('resizeBox', () => {
	it('averages a black and white pair to grey', () => {
		const img: Rgba = { width: 2, height: 1, data: new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255]) };
		const out = resizeBox(img, 1, 1);
		expect(out.width).toBe(1);
		expect(Math.abs(out.data[0]! - 128)).toBeLessThanOrEqual(1);
	});
	it('keeps flat colour flat at a size that does not divide', () => {
		const out = resizeBox(solid(29, 29, [10, 20, 30]), 11, 11);
		expect(new Set(Array.from(out.data))).toEqual(new Set([10, 20, 30, 255]));
	});
	it('gives the size asked for, and never below one pixel', () => {
		const out = resizeBox(solid(10, 20, [0, 0, 0]), 4, 8);
		expect([out.width, out.height, out.data.length]).toEqual([4, 8, 128]);
		expect(resizeBox(solid(10, 10, [0, 0, 0]), 0, 0).width).toBe(1);
	});
	it('keeps the total light when it shrinks by a fraction', () => {
		const img = dot(8, 8, 3, 3);
		const out = resizeBox(img, 3, 3);
		const ink = red(out).reduce((s, v) => s + (255 - v), 0);
		// One ink pixel of 64 becomes nine cells of 64/9 pixels each: the ink is 9/64 of a cell's area.
		expect(ink).toBeGreaterThan(255 * (9 / 64) * 0.95);
		expect(ink).toBeLessThan(255 * (9 / 64) * 1.05);
	});
});

describe('warp', () => {
	it('is the identity under the identity matrix', () => {
		const img = dot(9, 7, 3, 2);
		const out = warp(img, [1, 0, 0, 1]);
		expect([out.width, out.height]).toEqual([9, 7]);
		expect(Array.from(out.data)).toEqual(Array.from(img.data));
	});
	it('grows the canvas to hold a tilt and fills the new corners with the paper', () => {
		const img = solid(100, 100, [10, 10, 10]);
		const out = warp(img, rotation(12), [255, 255, 255]);
		// A square turned 12 degrees spans (cos + sin) of its side.
		const span = 100 * (Math.cos((12 * Math.PI) / 180) + Math.sin((12 * Math.PI) / 180));
		expect(out.width).toBe(Math.ceil(span - 1e-6));
		expect(out.height).toBe(out.width);
		expect(Array.from(out.data.slice(0, 3))).toEqual([255, 255, 255]);
		const mid = ((out.height >> 1) * out.width + (out.width >> 1)) * 4;
		expect(Array.from(out.data.slice(mid, mid + 3))).toEqual([10, 10, 10]);
	});
	it('widens a shear by the tangent of its angle and leaves the height', () => {
		const out = warp(solid(100, 100, [0, 0, 0]), shear(10));
		expect(out.height).toBe(100);
		expect(out.width).toBe(Math.ceil(100 + 100 * Math.tan((10 * Math.PI) / 180) - 1e-6));
	});
	it('moves a dot where a quarter turn should put it', () => {
		// A 90 degree turn is exact: a dot right of centre lands below it (y grows downward).
		const img = dot(11, 11, 8, 5);
		const out = warp(img, rotation(90));
		expect([out.width, out.height]).toEqual([11, 11]);
		const darkest = red(out).indexOf(Math.min(...red(out)));
		expect([darkest % 11, Math.floor(darkest / 11)]).toEqual([5, 8]);
	});
	it('refuses a matrix that cannot be undone', () => {
		expect(() => warp(solid(4, 4, [0, 0, 0]), [1, 2, 2, 4])).toThrow();
	});
});

describe('applyCondition', () => {
	const base = solid(264, 264, [255, 255, 255]);
	it('shrinks "small" to three pixels a module', () => {
		const out = applyCondition('small', base, 8);
		expect(out.width).toBe(Math.round((264 * SMALL_MODULE_PX) / 8));
	});
	it('does not enlarge a code that is already small', () => {
		expect(applyCondition('small', solid(66, 66, [0, 0, 0]), 2).width).toBe(66);
	});
	it('shrinks then blurs "small and blurred", so it ends three pixels a module', () => {
		expect(applyCondition('small-blurred', base, 8).width).toBe(99);
	});
	it('blurs at five pixels a module, and keeps the size for dim', () => {
		expect(applyCondition('blurred', base, 8).width).toBe(Math.round((264 * 5) / 8));
		expect(applyCondition('dim', base, 8).width).toBe(264);
	});
	it('blurs a code smaller than that where it is', () => {
		expect(applyCondition('blurred', solid(66, 66, [0, 0, 0]), 2).width).toBe(66);
	});
	it('makes the tilted and sheared images bigger', () => {
		expect(applyCondition('tilted', base, 8).width).toBeGreaterThan(264);
		expect(applyCondition('sheared', base, 8).width).toBeGreaterThan(264);
	});
});

describe('summarise', () => {
	const result = (label: string, ok: boolean) => ({ label, ok });
	it('says how many decoded and names the misses', () => {
		const s = summarise([result('small', true), result('blurred', false), result('dim', true), result('tilted', true), result('sheared', true), result('small and blurred', false)]);
		expect(s.passed).toBe(4);
		expect(s.headline).toBe('Decoded in 4 of 6 tough conditions');
		expect(s.detail).toBe('Missed: blurred, small and blurred.');
		expect(s.missed).toEqual(['blurred', 'small and blurred']);
	});
	it('says all when all did, with nothing missed', () => {
		const s = summarise(CONDITIONS.map((c) => result(c.label, true)));
		expect(s.headline).toBe('Decoded in all 6 tough conditions');
		expect(s.detail).toBe('');
	});
	it('says none when none did', () => {
		const s = summarise(CONDITIONS.map((c) => result(c.label, false)));
		expect(s.headline).toBe('Decoded in none of the 6 tough conditions');
		expect(s.missed).toHaveLength(6);
	});
	it('reads "5 of 6" for one miss', () => {
		const s = summarise(CONDITIONS.map((c, i) => result(c.label, i !== 1)));
		expect(s.headline).toBe('Decoded in 5 of 6 tough conditions');
		expect(s.detail).toBe('Missed: blurred.');
	});
});

describe('runStress', () => {
	const noWait = () => Promise.resolve();
	it('runs the six conditions in order and reports each', async () => {
		const seen: number[] = [];
		const results = await runStress(solid(64, 64, [255, 255, 255]), 8, async () => true, { yieldToPage: noWait, onProgress: (d) => seen.push(d) });
		expect(results!.map((r) => r.id)).toEqual(CONDITIONS.map((c) => c.id));
		expect(results!.every((r) => r.ok)).toBe(true);
		expect(seen).toEqual([1, 2, 3, 4, 5, 6]);
	});
	it('counts a throwing decoder as a miss', async () => {
		let n = 0;
		const results = await runStress(solid(64, 64, [255, 255, 255]), 8, async () => {
			if (n++ === 2) throw new Error('boom');
			return true;
		}, { yieldToPage: noWait });
		expect(results!.map((r) => r.ok)).toEqual([true, true, false, true, true, true]);
	});
	it('stops and returns null once the run is cancelled', async () => {
		let n = 0;
		const decode = async () => {
			n++;
			return true;
		};
		const results = await runStress(solid(64, 64, [255, 255, 255]), 8, decode, { yieldToPage: noWait, cancelled: () => n >= 2 });
		expect(results).toBeNull();
		expect(n).toBe(2);
	});
	it('gives the page a turn before every condition', async () => {
		let turns = 0;
		await runStress(solid(64, 64, [255, 255, 255]), 8, async () => true, { yieldToPage: async () => void turns++ });
		expect(turns).toBe(6);
	});
});

describe('a real code under the six conditions', () => {
	// The engine's own decoder, the very one the page uses. A plain black-on-white code at eight
	// pixels a module is the easy case: it should read back under every condition, so a failure
	// here means the simulation is harsher than the phones it stands for.
	const payload = 'https://stoneqr.app/';
	const qr = encode(payload, { ecc: 'M' });
	const art = rasterize(qr, { pxPerModule: 8, quietZone: 4, fg: [0, 0, 0], bg: [255, 255, 255] });
	const decode = async (image: Rgba) => (await verifyRasterAsync(image, payload)).ok;

	it('decodes a plain code every time', async () => {
		const results = await runStress(art, 8, decode, { yieldToPage: () => Promise.resolve() });
		expect(results!.filter((r) => !r.ok).map((r) => r.label)).toEqual([]);
	});
	it('decodes a clean code of every size and level, so a miss says something about the design', async () => {
		// The conditions are set just under what the decoders can read, so this pins them: if a
		// change makes the simulation harsher than a clean code can survive, this goes red.
		const misses: string[] = [];
		for (const ecc of ['L', 'H'] as const) {
			for (const len of [5, 60, 200, 450]) {
				const text = 'https://example.com/' + Array.from({ length: len }, (_, i) => 'abcdefghij'[(i * 7) % 10]).join('');
				const code = encode(text, { ecc });
				const image = rasterize(code, { pxPerModule: 8, quietZone: 4 });
				const results = await runStress(image, 8, async (img) => (await verifyRasterAsync(img, text)).ok, { yieldToPage: () => Promise.resolve() });
				for (const r of results!) if (!r.ok) misses.push(`${ecc} v${code.version} ${r.label}`);
			}
		}
		expect(misses).toEqual([]);
	}, 30000);
	it('misses a code that is almost invisible', async () => {
		const faint = rasterize(qr, { pxPerModule: 8, quietZone: 4, fg: [120, 120, 120], bg: [135, 135, 135] });
		const results = await runStress(faint, 8, decode, { yieldToPage: () => Promise.resolve() });
		expect(results!.some((r) => !r.ok)).toBe(true);
	});
});
