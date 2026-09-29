/**
 * Read a code out of a picture, on this device. The picture is decoded into a canvas, handed to
 * the engine's two decoders (`@paulmillr/qr`, then `jsqr`), and dropped: nothing is uploaded,
 * stored, or kept once the answer is back.
 *
 * A photograph is not a render. It is large, it may be slightly soft, and the code may be cropped
 * with no white border. So one failed pass is not the end: the same picture is tried at a few
 * other sizes, and once with a white border added, before giving up.
 */
import { decodeRasterAsync } from '@stoneqr/engine';

/** The long side, in pixels, of the first attempt: a phone photo is 4000 px or more and decodes no better for it. */
export const MAX_SIDE = 2000;
/** Bigger than this is refused before it is decoded; a browser would spend seconds and gigabytes on it. */
export const MAX_BYTES = 40 * 1024 * 1024;

export type ReadResult = { ok: true; text: string; decoder: 'paulmillr' | 'jsqr' } | { ok: false; reason: 'no-code' | 'unreadable' | 'too-big' };

/** One attempt: the long side to scale to, and whether to add a white border first. */
export interface Attempt {
	side: number;
	pad: boolean;
}

/**
 * The attempts for a picture with this long side, most likely first. Never enlarges a big picture;
 * a small one gets one enlarged try, because a code cropped tight to a few hundred pixels
 * sometimes reads once it is bigger. Pure, so it is tested.
 */
export function attemptsFor(longSide: number): Attempt[] {
	const first = Math.min(longSide, MAX_SIDE);
	const sides = [first, 1200, 800, 500].filter((s) => s <= first);
	if (longSide < 600) sides.push(Math.min(1000, longSide * 3));
	const unique = [...new Set(sides.map(Math.round))];
	return [...unique.map((side) => ({ side, pad: false })), { side: Math.min(first, 1200), pad: true }];
}

/** Let the page paint between attempts, so a slow photo does not freeze the tile. */
const yieldToPage = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

async function toBitmap(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
	if (typeof createImageBitmap === 'function') {
		try {
			return await createImageBitmap(file);
		} catch {
			// Some browsers cannot make a bitmap of a format they can still draw; try an <img>.
		}
	}
	const url = URL.createObjectURL(file);
	try {
		const img = new Image();
		img.src = url;
		await img.decode();
		return img;
	} finally {
		URL.revokeObjectURL(url);
	}
}

function draw(source: ImageBitmap | HTMLImageElement, width: number, height: number, pad: boolean): ImageData {
	const border = pad ? Math.round(Math.max(width, height) * 0.1) : 0;
	const canvas = document.createElement('canvas');
	canvas.width = width + border * 2;
	canvas.height = height + border * 2;
	const ctx = canvas.getContext('2d', { willReadFrequently: true });
	if (!ctx) throw new Error('no canvas');
	// White under everything: a transparent PNG would otherwise decode as black, and the border is paper.
	ctx.fillStyle = '#fff';
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	ctx.imageSmoothingQuality = 'high';
	ctx.drawImage(source, border, border, width, height);
	const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
	// Release the pixels now rather than when the collector gets round to it.
	canvas.width = canvas.height = 0;
	return data;
}

/** Read the code in a picture file. Never throws. */
export async function readPicture(file: Blob): Promise<ReadResult> {
	if (file.size > MAX_BYTES) return { ok: false, reason: 'too-big' };
	let source: ImageBitmap | HTMLImageElement;
	try {
		source = await toBitmap(file);
	} catch {
		return { ok: false, reason: 'unreadable' };
	}
	try {
		const w = 'naturalWidth' in source ? source.naturalWidth : source.width;
		const h = 'naturalHeight' in source ? source.naturalHeight : source.height;
		if (!w || !h) return { ok: false, reason: 'unreadable' };
		for (const { side, pad } of attemptsFor(Math.max(w, h))) {
			const scale = side / Math.max(w, h);
			const width = Math.max(1, Math.round(w * scale));
			const height = Math.max(1, Math.round(h * scale));
			let found: Awaited<ReturnType<typeof decodeRasterAsync>> = null;
			try {
				found = await decodeRasterAsync(draw(source, width, height, pad));
			} catch {
				found = null;
			}
			if (found && found.text) return { ok: true, text: found.text, decoder: found.decoder };
			await yieldToPage();
		}
		return { ok: false, reason: 'no-code' };
	} catch {
		return { ok: false, reason: 'unreadable' };
	} finally {
		if ('close' in source) source.close();
	}
}
