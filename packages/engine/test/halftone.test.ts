import { describe, expect, it } from 'vitest';
import {
	encode,
	halftoneVersionFor,
	halftoneWithFallback,
	imagePlacement,
	renderHalftone,
	sizeForVersion,
	verifyRaster,
	type RasterImage
} from '../src/index.js';

const PAYLOAD = 'https://stoneqr.app/halftone';

/** A mid-grey checker: the worst case for a decoder, because it looks like module structure. */
function checker(side = 256, cell = 8, a = 110, b = 170): RasterImage {
	const data = new Uint8ClampedArray(side * side * 4);
	for (let y = 0; y < side; y++) {
		for (let x = 0; x < side; x++) {
			const v = (Math.floor(x / cell) + Math.floor(y / cell)) % 2 === 0 ? a : b;
			const p = (y * side + x) * 4;
			data[p] = v;
			data[p + 1] = v;
			data[p + 2] = v;
			data[p + 3] = 255;
		}
	}
	return { width: side, height: side, data };
}

/** A smooth, photo-like gradient with a bright corner and a dark corner. */
function gradient(w = 320, h = 240): RasterImage {
	const data = new Uint8ClampedArray(w * h * 4);
	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			const p = (y * w + x) * 4;
			data[p] = Math.round((x / (w - 1)) * 235) + 10;
			data[p + 1] = Math.round((y / (h - 1)) * 200) + 30;
			data[p + 2] = Math.round(((x + y) / (w + h - 2)) * 180) + 40;
			data[p + 3] = 255;
		}
	}
	return { width: w, height: h, data };
}

function pixel(img: RasterImage, x: number, y: number): [number, number, number] {
	const p = (y * img.width + x) * 4;
	return [img.data[p] ?? 0, img.data[p + 1] ?? 0, img.data[p + 2] ?? 0];
}

const isBlack = (c: [number, number, number]) => c[0] === 0 && c[1] === 0 && c[2] === 0;
const isWhite = (c: [number, number, number]) => c[0] === 255 && c[1] === 255 && c[2] === 255;

function halftoneQr(payload = PAYLOAD) {
	return encode(payload, { ecc: 'H', minVersion: halftoneVersionFor(payload) });
}

describe('halftoneVersionFor', () => {
	it('picks the smallest version with enough modules for a picture', () => {
		// Default budget is version 7 (45 × 45 = 2025 modules).
		expect(halftoneVersionFor('hi')).toBe(7);
		expect(sizeForVersion(halftoneVersionFor('hi'))).toBe(45);
		expect(halftoneVersionFor('hi', 1000)).toBe(4); // 33 × 33 = 1089
		expect(halftoneVersionFor('hi', 100)).toBe(1);
	});
	it('never lowers what the payload needs at ECC H', () => {
		const long = 'https://example.com/' + 'x'.repeat(400);
		const min = halftoneVersionFor(long);
		const qr = encode(long, { ecc: 'H', minVersion: min });
		expect(qr.version).toBeGreaterThan(min);
		expect(qr.ecc).toBe('H');
	});
});

describe('renderHalftone', () => {
	const qr = halftoneQr();

	it('sizes the output from the module count, quiet zone, and scale', () => {
		const r = renderHalftone(qr, checker(), { pxPerModule: 8, quietZone: 4 });
		const side = (qr.size + 8) * 8;
		expect(r.width).toBe(side);
		expect(r.height).toBe(side);
		expect(r.data.length).toBe(side * side * 4);

		const r3 = renderHalftone(qr, checker(), { pxPerModule: 3, quietZone: 2 });
		expect(r3.width).toBe((qr.size + 4) * 3);
	});

	it('keeps the quiet zone clean', () => {
		const r = renderHalftone(qr, checker(), { pxPerModule: 8, quietZone: 4 });
		expect(isWhite(pixel(r, 0, 0))).toBe(true);
		expect(isWhite(pixel(r, 4 * 8 - 1, 4 * 8 - 1))).toBe(true);
		expect(isWhite(pixel(r, r.width - 1, r.height - 1))).toBe(true);
	});

	it('paints function patterns solid, with no image showing through', () => {
		const px = 8;
		const quiet = 4;
		const r = renderHalftone(qr, checker(), { pxPerModule: px, quietZone: quiet });
		// The whole top-left finder block (7 × 7 plus its separator) is function modules.
		for (let my = 0; my < 8; my++) {
			for (let mx = 0; mx < 8; mx++) {
				expect(qr.functionMask[my]![mx]).toBe(true);
				const expectDark = qr.matrix[my]![mx] === true;
				// Every pixel of the module, corners included, matches the matrix exactly.
				for (const [dx, dy] of [
					[0, 0],
					[px - 1, 0],
					[0, px - 1],
					[px - 1, px - 1],
					[px >> 1, px >> 1]
				] as [number, number][]) {
					const c = pixel(r, (mx + quiet) * px + dx, (my + quiet) * px + dy);
					expect(expectDark ? isBlack(c) : isWhite(c)).toBe(true);
				}
			}
		}
	});

	it('leaves the image visible around a data module dot', () => {
		const px = 8;
		const quiet = 4;
		const r = renderHalftone(qr, gradient(), { pxPerModule: px, quietZone: quiet, dotScale: 0.4 });
		// Find a data module away from the edges.
		let found = 0;
		for (let my = 10; my < qr.size - 10 && found < 12; my++) {
			for (let mx = 10; mx < qr.size - 10 && found < 12; mx++) {
				if (qr.functionMask[my]![mx] === true) continue;
				found++;
				const x0 = (mx + quiet) * px;
				const y0 = (my + quiet) * px;
				// Corner of the module: the picture, neither pure ink nor pure paper.
				const corner = pixel(r, x0, y0);
				expect(isBlack(corner)).toBe(false);
				expect(isWhite(corner)).toBe(false);
				// Centre of the module: the dot, exactly the matrix colour.
				const centre = pixel(r, x0 + (px >> 1), y0 + (px >> 1));
				expect(qr.matrix[my]![mx] === true ? isBlack(centre) : isWhite(centre)).toBe(true);
			}
		}
		expect(found).toBe(12);
	});

	it('grows the dot with dotScale and clamps it to the allowed range', () => {
		const px = 10;
		const quiet = 4;
		const count = (dotScale: number) => {
			const r = renderHalftone(qr, gradient(), { pxPerModule: px, quietZone: quiet, dotScale });
			// Measure the dot on the first dark data module by scanning its middle row.
			for (let my = 10; my < qr.size - 10; my++) {
				for (let mx = 10; mx < qr.size - 10; mx++) {
					if (qr.functionMask[my]![mx] === true || qr.matrix[my]![mx] !== true) continue;
					const y = (my + quiet) * px + (px >> 1);
					let n = 0;
					for (let dx = 0; dx < px; dx++) if (isBlack(pixel(r, (mx + quiet) * px + dx, y))) n++;
					return n;
				}
			}
			return -1;
		};
		expect(count(0.3)).toBe(3);
		expect(count(0.6)).toBe(6);
		// Out of range values clamp rather than throw.
		expect(count(0.9)).toBe(7);
		expect(count(0.05)).toBe(3);
	});

	it('fades the image toward the light colour without touching the modules', () => {
		const px = 8;
		const quiet = 4;
		const img = gradient();
		const plain = renderHalftone(qr, img, { pxPerModule: px, quietZone: quiet });
		const dimmed = renderHalftone(qr, img, { pxPerModule: px, quietZone: quiet, imageDim: 0.6 });
		let checked = 0;
		for (let my = 10; my < qr.size - 10 && checked < 5; my++) {
			for (let mx = 10; mx < qr.size - 10 && checked < 5; mx++) {
				if (qr.functionMask[my]![mx] === true) continue;
				checked++;
				const x = (mx + quiet) * px;
				const y = (my + quiet) * px;
				const a = pixel(plain, x, y);
				const b = pixel(dimmed, x, y);
				// Fading moves every channel toward white.
				expect(b[0]).toBeGreaterThanOrEqual(a[0]);
				expect(b[1]).toBeGreaterThanOrEqual(a[1]);
				expect(b[2]).toBeGreaterThanOrEqual(a[2]);
			}
		}
		expect(checked).toBe(5);
	});

	it('grayscale flattens the channels', () => {
		const r = renderHalftone(qr, gradient(), { pxPerModule: 8, quietZone: 4, grayscale: true });
		// Sample a spot in the data area that is not on a dot.
		const c = pixel(r, 4 * 8 + 12 * 8, 4 * 8 + 12 * 8);
		expect(Math.abs(c[0] - c[1])).toBeLessThanOrEqual(1);
		expect(Math.abs(c[1] - c[2])).toBeLessThanOrEqual(1);
	});

	it('accepts an RGB (3 channel) buffer', () => {
		const side = 64;
		const rgb = new Uint8Array(side * side * 3).fill(140);
		const r = renderHalftone(qr, { width: side, height: side, data: rgb }, { pxPerModule: 8 });
		const c = pixel(r, 4 * 8 + 12 * 8, 4 * 8 + 12 * 8);
		expect(isBlack(c)).toBe(false);
		expect(isWhite(c)).toBe(false);
	});
});

describe('imagePlacement', () => {
	it('cover-fits by default and grows from the centre with zoom', () => {
		// Landscape picture into a 100-unit square: height-limited, width overflows.
		const p1 = imagePlacement(320, 240, 100);
		expect(p1.height).toBeCloseTo(100);
		expect(p1.width).toBeCloseTo(400 / 3);
		expect(p1.y).toBeCloseTo(0);
		expect(p1.x).toBeCloseTo((100 - 400 / 3) / 2);
		const p2 = imagePlacement(320, 240, 100, { imageZoom: 2 });
		expect(p2.width).toBeCloseTo(p1.width * 2);
		expect(p2.x + p2.width / 2).toBeCloseTo(50); // still centred
	});
	it('shifts by a fraction of the area and clamps every input', () => {
		const p = imagePlacement(100, 100, 100, { imageOffsetX: 0.25, imageOffsetY: -0.25 });
		expect(p.x).toBeCloseTo(25);
		expect(p.y).toBeCloseTo(-25);
		const c = imagePlacement(100, 100, 100, { imageZoom: 10, imageOffsetX: 5, imageOffsetY: -5 });
		expect(c.width).toBeCloseTo(300);
		expect(c.x).toBeCloseTo((100 - 300) / 2 + 50);
		expect(c.y).toBeCloseTo((100 - 300) / 2 - 50);
	});
	it('returns an empty box for a picture with no pixels', () => {
		expect(imagePlacement(0, 10, 100)).toEqual({ x: 0, y: 0, width: 0, height: 0 });
	});
});

describe('renderHalftone zoom and position', () => {
	const qr = halftoneQr();
	const px = 8;
	const quiet = 4;
	/** Top-left pixel of the first data module in column 0: picture, not dot, not function pattern. */
	function leftEdge(r: RasterImage): [number, number, number] {
		for (let my = 9; my < qr.size - 9; my++) {
			if (qr.functionMask[my]![0] === true) continue;
			return pixel(r, quiet * px, (my + quiet) * px);
		}
		throw new Error('no data module in column 0');
	}
	function rightEdge(r: RasterImage): [number, number, number] {
		for (let my = 9; my < qr.size - 9; my++) {
			if (qr.functionMask[my]![qr.size - 1] === true) continue;
			return pixel(r, (qr.size + quiet) * px - 1, (my + quiet) * px);
		}
		throw new Error('no data module in the last column');
	}

	it('zooming in samples nearer the middle of the picture', () => {
		// The gradient's red channel rises left to right, so the left edge gets redder as we zoom.
		const z1 = leftEdge(renderHalftone(qr, gradient(), { pxPerModule: px, quietZone: quiet }));
		const z2 = leftEdge(renderHalftone(qr, gradient(), { pxPerModule: px, quietZone: quiet, imageZoom: 2 }));
		expect(z2[0]).toBeGreaterThan(z1[0] + 20);
	});

	it('zooming out leaves the light colour around the picture', () => {
		const full = renderHalftone(qr, checker(), { pxPerModule: px, quietZone: quiet });
		const small = renderHalftone(qr, checker(), { pxPerModule: px, quietZone: quiet, imageZoom: 0.5 });
		expect(isWhite(leftEdge(full))).toBe(false);
		expect(isWhite(leftEdge(small))).toBe(true);
		// The middle of the data area still shows the picture.
		const mid = (quiet + qr.size / 2) * px;
		expect(isWhite(pixel(small, Math.floor(mid) + 1, Math.floor(mid) + 1))).toBe(false);
	});

	it('shifting the picture uncovers the side it moved away from', () => {
		const shifted = renderHalftone(qr, gradient(), { pxPerModule: px, quietZone: quiet, imageOffsetX: 0.3 });
		expect(isWhite(leftEdge(shifted))).toBe(true);
		expect(isWhite(rightEdge(shifted))).toBe(false);
		const centred = renderHalftone(qr, gradient(), { pxPerModule: px, quietZone: quiet });
		expect(isWhite(leftEdge(centred))).toBe(false);
		expect(isWhite(rightEdge(centred))).toBe(false);
	});

	it('still decodes when zoomed and shifted, and the ladder keeps the crop', () => {
		const r = halftoneWithFallback(qr, gradient(), PAYLOAD, { imageZoom: 2.5, imageOffsetX: -0.2, imageOffsetY: 0.1 });
		expect(r.ok).toBe(true);
		expect(r.opts.imageZoom).toBe(2.5);
		expect(r.opts.imageOffsetX).toBe(-0.2);
		expect(r.opts.imageOffsetY).toBe(0.1);
	});

	it('clamps zoom and offsets in the resolved options', () => {
		const r = halftoneWithFallback(qr, gradient(), PAYLOAD, { imageZoom: 10, imageOffsetX: 5, imageOffsetY: -5 });
		expect(r.opts.imageZoom).toBe(3);
		expect(r.opts.imageOffsetX).toBe(0.5);
		expect(r.opts.imageOffsetY).toBe(-0.5);
	});
});

describe('halftone decode (plan §12: 8 px and 3 px per module)', () => {
	const images: [string, RasterImage][] = [
		['mid-grey checker', checker()],
		['photo-like gradient', gradient()]
	];
	for (const [label, img] of images) {
		it(`decodes ${label} at 8 px per module`, () => {
			const qr = halftoneQr();
			const r = renderHalftone(qr, img, { pxPerModule: 8, quietZone: 4 });
			expect(verifyRaster(r, PAYLOAD)).toEqual({ ok: true, decoded: PAYLOAD });
		});
		it(`decodes ${label} at 3 px per module`, () => {
			const qr = halftoneQr();
			const r = renderHalftone(qr, img, { pxPerModule: 3, quietZone: 4 });
			expect(verifyRaster(r, PAYLOAD)).toEqual({ ok: true, decoded: PAYLOAD });
		});
	}
});

describe('halftoneWithFallback', () => {
	it('takes the first attempt when the defaults already decode', () => {
		const qr = halftoneQr();
		const r = halftoneWithFallback(qr, gradient(), PAYLOAD);
		expect(r.ok).toBe(true);
		expect(r.attempts).toHaveLength(1);
		expect(r.attempts[0]).toContain('decoded');
		expect(r.note).toBe('');
		expect(r.opts.dotScale).toBe(0.4);
		expect(verifyRaster(r.raster, PAYLOAD).ok).toBe(true);
	});

	it('climbs the ladder and reports what it changed', () => {
		const qr = halftoneQr();
		// Pure black-and-white noise at module scale is the hardest case; if the defaults survive
		// it, the ladder is never exercised, so only assert the contract that always holds.
		const noise = noiseImage(qr.size * 3);
		const r = halftoneWithFallback(qr, noise, PAYLOAD, { dotScale: 0.25 });
		expect(r.attempts.length).toBeGreaterThanOrEqual(1);
		expect(r.attempts.length).toBeLessThanOrEqual(5);
		if (r.attempts.length > 1) {
			expect(r.note).not.toBe('');
			expect(r.opts.dotScale ?? 0).toBeGreaterThan(0.25);
		}
		if (r.ok) expect(verifyRaster(r.raster, PAYLOAD).ok).toBe(true);
		// Either way a raster comes back so the preview has something to show.
		expect(r.raster.width).toBe((qr.size + 8) * 8);
	});

	it('runs the whole ladder and reports failure rather than throwing', () => {
		const qr = halftoneQr();
		// A payload the symbol cannot possibly carry forces every rung to fail.
		const r = halftoneWithFallback(qr, gradient(), 'never-matches', { dotScale: 0.3, imageDim: 0.1 });
		expect(r.ok).toBe(false);
		expect(r.attempts).toHaveLength(5);
		expect(r.attempts.every((a) => a.endsWith('did not decode'))).toBe(true);
		expect(r.attempts[0]).toContain('dots 0.3');
		expect(r.attempts[1]).toContain('larger dots (0.5)');
		expect(r.attempts[2]).toContain('30%');
		expect(r.note).toMatch(/too busy/);
		// The last attempt still comes back so the preview has something to show.
		expect(r.opts.dotScale).toBe(0.6);
		expect(r.opts.imageDim).toBe(0.4);
		expect(r.raster.width).toBe((qr.size + 8) * 8);
	});

	it('honours the caller pxPerModule and quiet zone throughout the ladder', () => {
		const qr = halftoneQr();
		const r = halftoneWithFallback(qr, checker(), PAYLOAD, { pxPerModule: 6, quietZone: 2 });
		expect(r.raster.width).toBe((qr.size + 4) * 6);
	});
});

/** Deterministic black/white noise at a fixed block size: the nastiest background there is. */
function noiseImage(side: number): RasterImage {
	const data = new Uint8ClampedArray(side * side * 4);
	let s = 1234567;
	for (let i = 0; i < side * side; i++) {
		s = (s * 1103515245 + 12345) & 0x7fffffff;
		const v = s % 2 === 0 ? 0 : 255;
		const p = i * 4;
		data[p] = v;
		data[p + 1] = v;
		data[p + 2] = v;
		data[p + 3] = 255;
	}
	return { width: side, height: side, data };
}
