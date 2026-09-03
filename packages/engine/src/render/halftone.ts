/**
 * Halftone ("artistic") rendering: plan §7.
 *
 * Function patterns (finders, separators, timing, alignment, format/version info, dark module)
 * stay solid so the decoder can always find and calibrate the symbol. Every other module is
 * drawn as a small centred dot, leaving the picture visible in the gaps.
 *
 * DOM-free on purpose: it works on plain RGBA buffers so it runs in Node, in tests, and in a
 * Web Worker. The browser glue (canvas decode of the upload, PNG blob, SVG) lives in the site.
 */
import type { EncodedQr, RasterImage } from '../types.js';
import { verifyRaster } from '../verify.js';

export interface HalftoneOptions {
	/** Pixels per module. Default 8 (the verification scale from plan §7 step 5). */
	pxPerModule?: number;
	/** Quiet zone in modules. Default 4. */
	quietZone?: number;
	/** Dot side as a fraction of the module, 0.25..0.7. Default 0.4. */
	dotScale?: number;
	/** RGB 0..255 for dark modules. Default black. */
	dark?: [number, number, number];
	/** RGB 0..255 for light modules and the quiet zone. Default white. */
	light?: [number, number, number];
	/** 0..1: how far to fade the image toward the light colour. Default 0. */
	imageDim?: number;
	/** Desaturate the image first. Default false. */
	grayscale?: boolean;
	/** Contrast multiplier around mid-grey, 0.5..2. Default 1. */
	contrast?: number;
}

export interface HalftoneResult {
	/** The raster that decoded, or the last one tried when nothing did. */
	raster: RasterImage;
	/** The option set that produced `raster`, with every default filled in. */
	opts: HalftoneOptions;
	/** One human-readable line per attempt, in order. */
	attempts: string[];
	/** Whether `raster` decoded back to the expected payload. */
	ok: boolean;
	/** Empty when the first attempt worked; otherwise what had to change, in plain language. */
	note: string;
}

export const DOT_SCALE_MIN = 0.25;
export const DOT_SCALE_MAX = 0.7;
/** Default module budget for an image-bearing symbol: version 7 is 45×45 = 2025 modules (plan §7 step 1). */
export const HALFTONE_MIN_MODULES = 2025;

/**
 * Smallest version whose symbol carries at least `minModules` modules, so a picture has room
 * to read. The caller passes this as `minVersion`; the encoder still raises it further when the
 * payload needs more room at ECC H.
 */
export function halftoneVersionFor(payload: string, minModules = HALFTONE_MIN_MODULES): number {
	let v = 1;
	while (v < 40 && sq(17 + 4 * v) < minModules) v++;
	return v;
}

function sq(n: number): number {
	return n * n;
}

/**
 * Render the symbol over the image. Output is RGBA, `(size + 2 * quietZone) * pxPerModule` per side.
 */
export function renderHalftone(qr: EncodedQr, image: RasterImage, opts: HalftoneOptions = {}): RasterImage {
	const o = withDefaults(opts);
	const px = o.pxPerModule;
	const quiet = o.quietZone;
	const size = qr.size;
	const total = size + 2 * quiet;
	const side = total * px;
	const data = new Uint8ClampedArray(side * side * 4);

	// 1. Light everywhere, so the quiet zone is clean whatever the image does.
	for (let i = 0; i < side * side; i++) {
		const p = i * 4;
		data[p] = o.light[0];
		data[p + 1] = o.light[1];
		data[p + 2] = o.light[2];
		data[p + 3] = 255;
	}

	// 2. Cover-fit the image into the data area only (inside the quiet zone).
	const areaPx = size * px;
	const origin = quiet * px;
	if (areaPx > 0 && image.width > 0 && image.height > 0) {
		const channels = image.data.length >= image.width * image.height * 4 ? 4 : 3;
		const scale = Math.max(areaPx / image.width, areaPx / image.height);
		const offX = (areaPx - image.width * scale) / 2;
		const offY = (areaPx - image.height * scale) / 2;
		const rgb: [number, number, number] = [0, 0, 0];
		for (let y = 0; y < areaPx; y++) {
			const sy = (y + 0.5 - offY) / scale - 0.5;
			const rowBase = ((y + origin) * side + origin) * 4;
			for (let x = 0; x < areaPx; x++) {
				const sx = (x + 0.5 - offX) / scale - 0.5;
				sampleBilinear(image, channels, sx, sy, o.light, rgb);
				adjust(rgb, o);
				const p = rowBase + x * 4;
				data[p] = rgb[0];
				data[p + 1] = rgb[1];
				data[p + 2] = rgb[2];
				data[p + 3] = 255;
			}
		}
	}

	// 3. Function patterns solid, data modules as centred dots.
	const dotPx = Math.min(px, Math.max(2, Math.round(o.dotScale * px)));
	const dotOff = Math.floor((px - dotPx) / 2);
	for (let my = 0; my < size; my++) {
		const row = qr.matrix[my];
		const fn = qr.functionMask[my];
		if (!row || !fn) continue;
		const y0 = (my + quiet) * px;
		for (let mx = 0; mx < size; mx++) {
			const colour = row[mx] === true ? o.dark : o.light;
			const x0 = (mx + quiet) * px;
			if (fn[mx] === true) fillRect(data, side, x0, y0, px, px, colour);
			else fillRect(data, side, x0 + dotOff, y0 + dotOff, dotPx, dotPx, colour);
		}
	}

	return { width: side, height: side, data };
}

/**
 * Plan §7 step 6: render, decode, and step through progressively safer settings until the code
 * reads. Returns the first set that decoded; when nothing does, the last attempt with `ok: false`
 * so the UI can still show something and explain what to change.
 */
export function halftoneWithFallback(
	qr: EncodedQr,
	image: RasterImage,
	expectedPayload: string,
	opts: HalftoneOptions = {}
): HalftoneResult {
	const base = withDefaults(opts);
	const ladder: { opts: HalftoneOptions; label: string; note: string }[] = [
		{ opts: base, label: `dots ${fmt(base.dotScale)}, fade ${pct(base.imageDim)}`, note: '' },
		{
			opts: { ...base, dotScale: 0.5 },
			label: 'larger dots (0.5)',
			note: 'Used larger dots (0.5) so the code decodes.'
		},
		{
			opts: { ...base, imageDim: clamp(base.imageDim + 0.2, 0, 1) },
			label: `faded the picture to ${pct(clamp(base.imageDim + 0.2, 0, 1))}`,
			note: `Faded the picture to ${pct(clamp(base.imageDim + 0.2, 0, 1))} so the code decodes.`
		},
		{
			opts: { ...base, dotScale: 0.5, imageDim: clamp(base.imageDim + 0.2, 0, 1) },
			label: `larger dots (0.5) and a ${pct(clamp(base.imageDim + 0.2, 0, 1))} fade`,
			note: `Used larger dots (0.5) and faded the picture to ${pct(clamp(base.imageDim + 0.2, 0, 1))} so the code decodes.`
		},
		{
			opts: { ...base, dotScale: 0.6, imageDim: 0.4 },
			label: 'largest dots (0.6) and a 40% fade',
			note: 'Used the largest dots (0.6) and a 40% fade so the code decodes. The picture is faint at this setting; try a simpler image or shorter content.'
		}
	];

	const attempts: string[] = [];
	let last: RasterImage | null = null;
	let lastOpts: HalftoneOptions = base;
	for (const step of ladder) {
		const raster = renderHalftone(qr, image, step.opts);
		const res = verifyRaster(raster, expectedPayload);
		attempts.push(`${step.label}: ${res.ok ? 'decoded' : 'did not decode'}`);
		if (res.ok) return { raster, opts: step.opts, attempts, ok: true, note: step.note };
		last = raster;
		lastOpts = step.opts;
	}
	return {
		raster: last ?? renderHalftone(qr, image, base),
		opts: lastOpts,
		attempts,
		ok: false,
		note: 'This picture is too busy for the code to survive. Try a simpler or lighter image, bigger dots, or shorter content.'
	};
}

type Resolved = Required<HalftoneOptions>;

function withDefaults(o: HalftoneOptions): Resolved {
	return {
		pxPerModule: Math.max(1, Math.floor(o.pxPerModule ?? 8)),
		quietZone: Math.max(0, Math.floor(o.quietZone ?? 4)),
		dotScale: clamp(o.dotScale ?? 0.4, DOT_SCALE_MIN, DOT_SCALE_MAX),
		dark: o.dark ?? [0, 0, 0],
		light: o.light ?? [255, 255, 255],
		imageDim: clamp(o.imageDim ?? 0, 0, 1),
		grayscale: o.grayscale ?? false,
		contrast: clamp(o.contrast ?? 1, 0.5, 2)
	};
}

/** Grayscale, then contrast around mid-grey, then fade toward the light colour. In place. */
function adjust(rgb: [number, number, number], o: Resolved): void {
	if (o.grayscale) {
		const l = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
		rgb[0] = l;
		rgb[1] = l;
		rgb[2] = l;
	}
	for (let i = 0; i < 3; i++) {
		let v = rgb[i]!;
		if (o.contrast !== 1) v = (v - 128) * o.contrast + 128;
		if (o.imageDim > 0) v = v + (o.light[i]! - v) * o.imageDim;
		rgb[i] = v < 0 ? 0 : v > 255 ? 255 : v;
	}
}

function sampleBilinear(
	img: RasterImage,
	channels: number,
	sx: number,
	sy: number,
	light: [number, number, number],
	out: [number, number, number]
): void {
	const x0 = Math.floor(sx);
	const y0 = Math.floor(sy);
	const fx = sx - x0;
	const fy = sy - y0;
	out[0] = 0;
	out[1] = 0;
	out[2] = 0;
	const corners: [number, number, number][] = [
		[x0, y0, (1 - fx) * (1 - fy)],
		[x0 + 1, y0, fx * (1 - fy)],
		[x0, y0 + 1, (1 - fx) * fy],
		[x0 + 1, y0 + 1, fx * fy]
	];
	for (const [cx, cy, w] of corners) {
		if (w === 0) continue;
		const px = clampInt(cx, 0, img.width - 1);
		const py = clampInt(cy, 0, img.height - 1);
		const p = (py * img.width + px) * channels;
		const a = channels === 4 ? (img.data[p + 3] ?? 255) / 255 : 1;
		// Composite over the light colour so transparent uploads do not punch holes.
		out[0] += ((img.data[p] ?? 0) * a + light[0] * (1 - a)) * w;
		out[1] += ((img.data[p + 1] ?? 0) * a + light[1] * (1 - a)) * w;
		out[2] += ((img.data[p + 2] ?? 0) * a + light[2] * (1 - a)) * w;
	}
}

function fillRect(
	data: Uint8ClampedArray,
	side: number,
	x0: number,
	y0: number,
	w: number,
	h: number,
	c: [number, number, number]
): void {
	for (let y = y0; y < y0 + h; y++) {
		if (y < 0 || y >= side) continue;
		for (let x = x0; x < x0 + w; x++) {
			if (x < 0 || x >= side) continue;
			const p = (y * side + x) * 4;
			data[p] = c[0];
			data[p + 1] = c[1];
			data[p + 2] = c[2];
			data[p + 3] = 255;
		}
	}
}

function clamp(v: number, lo: number, hi: number): number {
	if (!Number.isFinite(v)) return lo;
	return v < lo ? lo : v > hi ? hi : v;
}

function clampInt(v: number, lo: number, hi: number): number {
	return v < lo ? lo : v > hi ? hi : v;
}

function fmt(n: number): string {
	return Number(n.toFixed(2)).toString();
}

function pct(n: number): string {
	return `${Math.round(n * 100)}%`;
}
