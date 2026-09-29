/**
 * "Test it harder": the artwork that passed the normal decode check, decoded again under six
 * conditions a real camera brings: small, blurred, dim, tilted, sheared, and small plus blurred.
 * It is advice about a simulation on this device, never a verdict: nothing here touches
 * `design.verify`, and nothing is written to the decode memo.
 *
 * Pure: every image operation works on RGBA buffers with no canvas, so this runs in Node and in
 * the tests, and the component loads it with a dynamic import only when the button is pressed.
 * The decoder is passed in for the same reason (the site hands over the engine's
 * `verifyRasterAsync`, which tries `@paulmillr/qr` and then jsQR).
 */

export interface Rgba {
	width: number;
	height: number;
	data: Uint8ClampedArray;
}

/** The smallest a module gets in the "small" conditions: a code seen from across a table. */
export const SMALL_MODULE_PX = 3;
/** The size a code is seen at in the "blurred" condition: a phone held a normal distance away. */
export const BLURRED_MODULE_PX = 5;
/**
 * Blur as the sigma of a Gaussian, in modules. 0.33 puts 90% of a point's light inside about a
 * module and a fifth, which is what an out-of-focus shot of a small code looks like: soft, still
 * readable. It sits just under what the two decoders here can read. From 0.35 they start to
 * lose clean codes and from 0.5 they lose most of them, whatever the picture size, so a
 * stronger blur would fail the best code there is and say nothing about yours.
 */
export const BLUR_SIGMA_MODULES = 0.33;
/**
 * Levels squeezed into about the middle third of the range, as under a dim light or a glossy
 * sheen: 99 of 255 levels apart, centred. Exactly a third (85 apart) sits on a cliff: both
 * decoders read every clean code at 90 levels and none at 84, so the honest number is just
 * above it, and a code with less contrast than black on white is what falls below.
 */
export const DIM_LOW = 78;
export const DIM_HIGH = 177;
export const TILT_DEG = 12;
export const SHEAR_DEG = 10;

export type ConditionId = 'small' | 'blurred' | 'dim' | 'tilted' | 'sheared' | 'small-blurred';

/** In the order they run and the order the misses are named. The label is the plain word for the readout. */
export const CONDITIONS: readonly { id: ConditionId; label: string }[] = [
	{ id: 'small', label: 'small' },
	{ id: 'blurred', label: 'blurred' },
	{ id: 'dim', label: 'dim' },
	{ id: 'tilted', label: 'tilted' },
	{ id: 'sheared', label: 'sheared' },
	{ id: 'small-blurred', label: 'small and blurred' }
];

export interface StressResult {
	id: ConditionId;
	label: string;
	ok: boolean;
}

/** Pixels a module is wide in an artwork: its width over the modules across, the quiet zone and any frame included. */
export function modulePx(widthPx: number, size: number, quietZone: number, scale = 1): number {
	return widthPx / ((size + 2 * quietZone) * scale);
}

/** The engine's rasters are RGBA, canvases give RGBA, but a bare RGB buffer is accepted too. */
export function toRgba(image: { width: number; height: number; data: ArrayLike<number> }): Rgba {
	const n = image.width * image.height;
	if (image.data.length === n * 4) {
		const d = image.data;
		return { width: image.width, height: image.height, data: d instanceof Uint8ClampedArray ? d : Uint8ClampedArray.from(d) };
	}
	const out = new Uint8ClampedArray(n * 4);
	for (let i = 0, j = 0; i < n; i++, j += 3) {
		out[i * 4] = image.data[j]!;
		out[i * 4 + 1] = image.data[j + 1]!;
		out[i * 4 + 2] = image.data[j + 2]!;
		out[i * 4 + 3] = 255;
	}
	return { width: image.width, height: image.height, data: out };
}

/**
 * Lay the image on white paper. A code with no background, or a frame with rounded corners,
 * arrives with transparent pixels that a decoder would read as black.
 */
export function flatten(image: Rgba): Rgba {
	const src = image.data;
	const out = new Uint8ClampedArray(src.length);
	for (let i = 0; i < src.length; i += 4) {
		const a = src[i + 3]! / 255;
		out[i] = src[i]! * a + 255 * (1 - a);
		out[i + 1] = src[i + 1]! * a + 255 * (1 - a);
		out[i + 2] = src[i + 2]! * a + 255 * (1 - a);
		out[i + 3] = 255;
	}
	return { width: image.width, height: image.height, data: out };
}

/** Map 0..255 onto `low..high`, so black and white sit closer together. */
export function squeezeLevels(image: Rgba, low = DIM_LOW, high = DIM_HIGH): Rgba {
	const src = image.data;
	const out = new Uint8ClampedArray(src.length);
	const span = high - low;
	for (let i = 0; i < src.length; i += 4) {
		out[i] = low + (src[i]! / 255) * span;
		out[i + 1] = low + (src[i + 1]! / 255) * span;
		out[i + 2] = low + (src[i + 2]! / 255) * span;
		out[i + 3] = src[i + 3]!;
	}
	return { width: image.width, height: image.height, data: out };
}

/** A separable Gaussian blur, edges clamped. `sigma` is in pixels; 0 or less returns the image as it is. */
export function gaussianBlur(image: Rgba, sigma: number): Rgba {
	if (!(sigma > 0)) return image;
	const { width: w, height: h, data: src } = image;
	const radius = Math.max(1, Math.ceil(sigma * 3));
	const kernel = new Float32Array(radius * 2 + 1);
	let sum = 0;
	for (let i = -radius; i <= radius; i++) {
		const v = Math.exp(-(i * i) / (2 * sigma * sigma));
		kernel[i + radius] = v;
		sum += v;
	}
	for (let i = 0; i < kernel.length; i++) kernel[i]! /= sum;

	const tmp = new Float32Array(w * h * 3);
	for (let y = 0; y < h; y++) {
		const row = y * w;
		for (let x = 0; x < w; x++) {
			let r = 0;
			let g = 0;
			let b = 0;
			for (let k = -radius; k <= radius; k++) {
				const xx = x + k < 0 ? 0 : x + k >= w ? w - 1 : x + k;
				const wt = kernel[k + radius]!;
				const p = (row + xx) * 4;
				r += src[p]! * wt;
				g += src[p + 1]! * wt;
				b += src[p + 2]! * wt;
			}
			const t = (row + x) * 3;
			tmp[t] = r;
			tmp[t + 1] = g;
			tmp[t + 2] = b;
		}
	}
	const out = new Uint8ClampedArray(src.length);
	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			let r = 0;
			let g = 0;
			let b = 0;
			for (let k = -radius; k <= radius; k++) {
				const yy = y + k < 0 ? 0 : y + k >= h ? h - 1 : y + k;
				const wt = kernel[k + radius]!;
				const t = (yy * w + x) * 3;
				r += tmp[t]! * wt;
				g += tmp[t + 1]! * wt;
				b += tmp[t + 2]! * wt;
			}
			const p = (y * w + x) * 4;
			out[p] = r;
			out[p + 1] = g;
			out[p + 2] = b;
			out[p + 3] = 255;
		}
	}
	return { width: w, height: h, data: out };
}

/** For each output cell, the source pixels it covers and how much of each: an area average. */
function boxWeights(from: number, to: number): { start: number; weights: Float32Array }[] {
	const step = from / to;
	const out: { start: number; weights: Float32Array }[] = [];
	for (let o = 0; o < to; o++) {
		const a = o * step;
		const b = Math.min(from, (o + 1) * step);
		const start = Math.floor(a);
		const end = Math.max(start + 1, Math.ceil(b));
		const weights = new Float32Array(end - start);
		let total = 0;
		for (let i = start; i < end; i++) {
			const wt = Math.max(0, Math.min(i + 1, b) - Math.max(i, a));
			weights[i - start] = wt;
			total += wt;
		}
		// A cell narrower than a pixel (an upscale) can land exactly on an edge with no overlap.
		if (total === 0) weights[0] = 1;
		else for (let i = 0; i < weights.length; i++) weights[i]! /= total;
		out.push({ start, weights });
	}
	return out;
}

/** Resample to a new size by area averaging, which is what a sensor does with a small code. */
export function resizeBox(image: Rgba, outW: number, outH: number): Rgba {
	const w = image.width;
	const h = image.height;
	outW = Math.max(1, Math.round(outW));
	outH = Math.max(1, Math.round(outH));
	const cols = boxWeights(w, outW);
	const rows = boxWeights(h, outH);
	const src = image.data;
	const tmp = new Float32Array(outW * h * 3);
	for (let y = 0; y < h; y++) {
		for (let x = 0; x < outW; x++) {
			const { start, weights } = cols[x]!;
			let r = 0;
			let g = 0;
			let b = 0;
			for (let i = 0; i < weights.length; i++) {
				const p = (y * w + Math.min(w - 1, start + i)) * 4;
				r += src[p]! * weights[i]!;
				g += src[p + 1]! * weights[i]!;
				b += src[p + 2]! * weights[i]!;
			}
			const t = (y * outW + x) * 3;
			tmp[t] = r;
			tmp[t + 1] = g;
			tmp[t + 2] = b;
		}
	}
	const out = new Uint8ClampedArray(outW * outH * 4);
	for (let y = 0; y < outH; y++) {
		const { start, weights } = rows[y]!;
		for (let x = 0; x < outW; x++) {
			let r = 0;
			let g = 0;
			let b = 0;
			for (let i = 0; i < weights.length; i++) {
				const t = (Math.min(h - 1, start + i) * outW + x) * 3;
				r += tmp[t]! * weights[i]!;
				g += tmp[t + 1]! * weights[i]!;
				b += tmp[t + 2]! * weights[i]!;
			}
			const p = (y * outW + x) * 4;
			out[p] = r;
			out[p + 1] = g;
			out[p + 2] = b;
			out[p + 3] = 255;
		}
	}
	return { width: outW, height: outH, data: out };
}

/** A 2 by 2 matrix, row-major: `[a, b, c, d]` maps `(x, y)` to `(ax + by, cx + dy)`. */
export type Matrix2 = readonly [number, number, number, number];

export function rotation(deg: number): Matrix2 {
	const t = (deg * Math.PI) / 180;
	return [Math.cos(t), -Math.sin(t), Math.sin(t), Math.cos(t)];
}

/** A horizontal shear: each row slides sideways in proportion to its height. */
export function shear(deg: number): Matrix2 {
	return [1, Math.tan((deg * Math.PI) / 180), 0, 1];
}

/**
 * Transform the image about its centre on a canvas grown to hold all of it, bilinear, with the
 * new corners filled in `fill` (the paper). An image is the same size and shape under the
 * identity matrix.
 */
export function warp(image: Rgba, m: Matrix2, fill: readonly [number, number, number] = [255, 255, 255]): Rgba {
	const { width: w, height: h, data: src } = image;
	const [a, b, c, d] = m;
	const det = a * d - b * c;
	if (Math.abs(det) < 1e-9) throw new Error('warp: matrix cannot be inverted');
	const halfW = w / 2;
	const halfH = h / 2;
	let minX = Infinity;
	let maxX = -Infinity;
	let minY = Infinity;
	let maxY = -Infinity;
	for (const [cx, cy] of [
		[-halfW, -halfH],
		[halfW, -halfH],
		[-halfW, halfH],
		[halfW, halfH]
	] as const) {
		const x = a * cx + b * cy;
		const y = c * cx + d * cy;
		minX = Math.min(minX, x);
		maxX = Math.max(maxX, x);
		minY = Math.min(minY, y);
		maxY = Math.max(maxY, y);
	}
	// A hair of tolerance so an identity matrix does not round its size up a pixel.
	const ow = Math.ceil(maxX - minX - 1e-6);
	const oh = Math.ceil(maxY - minY - 1e-6);
	// The output's centre sits over the bounding box's centre, so the middle stays put.
	const midX = (minX + maxX) / 2;
	const midY = (minY + maxY) / 2;
	const ia = d / det;
	const ib = -b / det;
	const ic = -c / det;
	const id = a / det;
	const out = new Uint8ClampedArray(ow * oh * 4);
	for (let oy = 0; oy < oh; oy++) {
		for (let ox = 0; ox < ow; ox++) {
			const px = ox + 0.5 - ow / 2 + midX;
			const py = oy + 0.5 - oh / 2 + midY;
			// Back into the source, in pixel-centre coordinates.
			const sx = ia * px + ib * py + halfW - 0.5;
			const sy = ic * px + id * py + halfH - 0.5;
			const o = (oy * ow + ox) * 4;
			if (sx < -0.5 || sy < -0.5 || sx > w - 0.5 || sy > h - 0.5) {
				out[o] = fill[0];
				out[o + 1] = fill[1];
				out[o + 2] = fill[2];
				out[o + 3] = 255;
				continue;
			}
			const x0 = Math.floor(sx);
			const y0 = Math.floor(sy);
			const fx = sx - x0;
			const fy = sy - y0;
			const xa = Math.max(0, x0);
			const xb = Math.min(w - 1, x0 + 1);
			const ya = Math.max(0, y0);
			const yb = Math.min(h - 1, y0 + 1);
			const p00 = (ya * w + xa) * 4;
			const p10 = (ya * w + xb) * 4;
			const p01 = (yb * w + xa) * 4;
			const p11 = (yb * w + xb) * 4;
			for (let ch = 0; ch < 3; ch++) {
				const top = src[p00 + ch]! * (1 - fx) + src[p10 + ch]! * fx;
				const bottom = src[p01 + ch]! * (1 - fx) + src[p11 + ch]! * fx;
				out[o + ch] = top * (1 - fy) + bottom * fy;
			}
			out[o + 3] = 255;
		}
	}
	return { width: ow, height: oh, data: out };
}

/** The paper colour: the image's top-left pixel, which is quiet zone in every artwork the site makes. */
export function paperOf(image: Rgba): [number, number, number] {
	return [image.data[0]!, image.data[1]!, image.data[2]!];
}

/**
 * The image as one condition leaves it. `px` is how many pixels a module is wide in `image`,
 * which sets the blur and how far a "small" condition has to shrink.
 */
export function applyCondition(id: ConditionId, image: Rgba, px: number): Rgba {
	/** Area-average down to `target` pixels a module; a code already smaller than that is left alone. */
	const shrinkTo = (img: Rgba, from: number, target: number): { image: Rgba; px: number } => {
		if (from <= target) return { image: img, px: from };
		const k = target / from;
		return { image: resizeBox(img, img.width * k, img.height * k), px: target };
	};
	switch (id) {
		case 'small':
			return shrinkTo(image, px, SMALL_MODULE_PX).image;
		case 'blurred': {
			// Blur at the size a phone would see it, not the size the download is: at eight
			// pixels a module the same blur is a wider smear in pixels and the decoders give up sooner.
			const seen = shrinkTo(image, px, BLURRED_MODULE_PX);
			return gaussianBlur(seen.image, BLUR_SIGMA_MODULES * seen.px);
		}
		case 'dim':
			return squeezeLevels(image);
		case 'tilted':
			return warp(image, rotation(TILT_DEG), paperOf(image));
		case 'sheared':
			return warp(image, shear(SHEAR_DEG), paperOf(image));
		case 'small-blurred': {
			const seen = shrinkTo(image, px, SMALL_MODULE_PX);
			return gaussianBlur(seen.image, BLUR_SIGMA_MODULES * seen.px);
		}
	}
}

export interface StressOptions {
	/** Called after each condition with how many have finished. */
	onProgress?: (done: number, total: number) => void;
	/** Checked between conditions; a run that is no longer wanted stops and returns null. */
	cancelled?: () => boolean;
	/** How to give the page a turn between decodes. Defaults to a zero-length timeout. */
	yieldToPage?: () => Promise<void>;
}

const yieldTick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/**
 * Run every condition against the artwork. A condition passes only when `decode` says the
 * degraded image still reads back as the payload. The page gets a turn between conditions, so
 * nothing freezes; the image work for one condition is a few milliseconds.
 */
export async function runStress(
	artwork: { width: number; height: number; data: ArrayLike<number> },
	px: number,
	decode: (image: Rgba) => Promise<boolean>,
	opts: StressOptions = {}
): Promise<StressResult[] | null> {
	const base = flatten(toRgba(artwork));
	const results: StressResult[] = [];
	const tick = opts.yieldToPage ?? yieldTick;
	for (const { id, label } of CONDITIONS) {
		await tick();
		if (opts.cancelled?.()) return null;
		let ok = false;
		try {
			ok = await decode(applyCondition(id, base, px));
		} catch {
			// A decoder that throws on a mangled image has failed to read it.
		}
		results.push({ id, label, ok });
		opts.onProgress?.(results.length, CONDITIONS.length);
	}
	return results;
}

export interface StressSummary {
	passed: number;
	total: number;
	missed: string[];
	/** "Decoded in 5 of 6 tough conditions". */
	headline: string;
	/** "Missed: blurred, small and blurred." or empty. */
	detail: string;
}

export function summarise(results: readonly Pick<StressResult, 'label' | 'ok'>[]): StressSummary {
	const total = results.length;
	const passed = results.filter((r) => r.ok).length;
	const missed = results.filter((r) => !r.ok).map((r) => r.label);
	const headline =
		passed === total ? `Decoded in all ${total} tough conditions` : passed === 0 ? `Decoded in none of the ${total} tough conditions` : `Decoded in ${passed} of ${total} tough conditions`;
	return { passed, total, missed, headline, detail: missed.length ? `Missed: ${missed.join(', ')}.` : '' };
}
