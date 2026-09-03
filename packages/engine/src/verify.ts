import decodeQR from '@paulmillr/qr/decode.js';
import type { RasterImage } from './types.js';

export interface VerifyResult {
	ok: boolean;
	/** What the decoder read, if anything. */
	decoded?: string;
	/** Why it failed, for the UI. */
	reason?: 'no-decode' | 'mismatch';
	/** Which decoder produced the result; 'jsqr' means the primary decoder missed a valid symbol. */
	decoder?: 'paulmillr' | 'jsqr';
}

/**
 * Decode a raster and compare with the expected payload.
 * The decoder is `@paulmillr/qr`; it reads RGB or RGBA buffers directly.
 * Images narrower than about 40 px cannot be decoded; callers should render at 8 px per module or more.
 */
export function verifyRaster(image: RasterImage, expected: string): VerifyResult {
	let decoded: string;
	try {
		decoded = decodeQR({ width: image.width, height: image.height, data: image.data });
	} catch {
		return { ok: false, reason: 'no-decode' };
	}
	if (decoded !== expected) return { ok: false, decoded, reason: 'mismatch' };
	return { ok: true, decoded };
}

/** Browser convenience: verify an `ImageData` from a canvas. */
export function verifyImageData(img: { width: number; height: number; data: Uint8ClampedArray }, expected: string): VerifyResult {
	return verifyRaster(img, expected);
}

/**
 * Same check, with a second decoder as a fallback. `@paulmillr/qr` has a small blind spot
 * (about 1 symbol in 500, mostly mask 2) where it fails on a valid symbol that jsQR and
 * phones read fine. jsQR is loaded lazily, only when the first decoder fails.
 */
export async function verifyRasterAsync(image: RasterImage, expected: string): Promise<VerifyResult> {
	const first = verifyRaster(image, expected);
	if (first.ok || first.reason === 'mismatch') return first;
	const { default: jsQR } = await import('jsqr');
	const data = image.data instanceof Uint8ClampedArray ? image.data : new Uint8ClampedArray(image.data);
	const rgba = data.length === image.width * image.height * 4 ? data : rgbToRgba(data, image.width * image.height);
	const res = jsQR(rgba, image.width, image.height);
	if (!res) return { ok: false, reason: 'no-decode' };
	if (res.data !== expected) return { ok: false, decoded: res.data, reason: 'mismatch' };
	return { ok: true, decoded: res.data, decoder: 'jsqr' };
}

function rgbToRgba(rgb: Uint8ClampedArray, pixels: number): Uint8ClampedArray {
	const out = new Uint8ClampedArray(pixels * 4);
	for (let i = 0, j = 0; i < pixels; i++, j += 3) {
		out[i * 4] = rgb[j]!;
		out[i * 4 + 1] = rgb[j + 1]!;
		out[i * 4 + 2] = rgb[j + 2]!;
		out[i * 4 + 3] = 255;
	}
	return out;
}
