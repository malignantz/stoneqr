/**
 * Halftone PNG export off the main thread (browser only).
 *
 * A poster-size halftone is up to 17 megapixels: rendering takes a few hundred milliseconds
 * and PNG encoding a second or more, so both run in a Web Worker and report progress. The
 * page only decodes the upload (fast, needs a canvas) and hands the pixels over.
 *
 * Matrices cross the boundary packed one byte per module, as in the bulk worker; see
 * `$lib/bulk/protocol` for why.
 */
import type { EncodedQr, HalftoneOptions, RasterImage } from '@stoneqr/engine';
import { packMatrix } from '$lib/bulk/protocol';

export interface HalftoneExportRequest {
	size: number;
	matrix: Uint8Array;
	functionMask: Uint8Array;
	image: { width: number; height: number; data: ArrayBuffer };
	opts: HalftoneOptions;
	dpi: number;
}

export interface HalftoneProgress {
	phase: 'render' | 'encode';
	/** 0..1 within the phase; encoding has no finer signal and reports 0. */
	fraction: number;
}

export type HalftoneExportMessage =
	| ({ type: 'progress' } & HalftoneProgress)
	| { type: 'done'; png: Uint8Array }
	| { type: 'error'; message: string };

/**
 * Render the halftone at `opts.pxPerModule` and return a PNG with its pHYs set to `dpi`.
 * Falls back to the main thread when Workers are unavailable.
 */
export function halftonePng(
	qr: Pick<EncodedQr, 'matrix' | 'functionMask' | 'size'>,
	image: RasterImage,
	opts: HalftoneOptions,
	dpi: number,
	onProgress?: (p: HalftoneProgress) => void
): Promise<Uint8Array> {
	if (typeof Worker === 'undefined') return inline(qr, image, opts, dpi, onProgress);
	return new Promise((resolve, reject) => {
		const worker = new Worker(new URL('./halftone.worker.ts', import.meta.url), { type: 'module' });
		const finish = () => worker.terminate();
		worker.onmessage = (e: MessageEvent<HalftoneExportMessage>) => {
			const m = e.data;
			if (m.type === 'progress') onProgress?.({ phase: m.phase, fraction: m.fraction });
			else if (m.type === 'done') {
				finish();
				resolve(m.png);
			} else {
				finish();
				reject(new Error(m.message));
			}
		};
		worker.onerror = (e) => {
			finish();
			reject(new Error(e.message || 'The export worker failed to start.'));
		};
		const n = qr.size * qr.size;
		const matrix = new Uint8Array(n);
		const functionMask = new Uint8Array(n);
		packMatrix(matrix, 0, qr.matrix);
		packMatrix(functionMask, 0, qr.functionMask);
		// Copy the pixels so the caller keeps its raster; the copy is transferred, not cloned.
		const pixels = new Uint8ClampedArray(image.data).buffer;
		const req: HalftoneExportRequest = {
			size: qr.size,
			matrix,
			functionMask,
			image: { width: image.width, height: image.height, data: pixels },
			// Plain data only: a reactive proxy or a callback would make structured clone throw.
			opts: JSON.parse(JSON.stringify(opts)) as HalftoneOptions,
			dpi
		};
		worker.postMessage(req, [pixels, matrix.buffer, functionMask.buffer]);
	});
}

async function inline(
	qr: Pick<EncodedQr, 'matrix' | 'functionMask' | 'size'>,
	image: RasterImage,
	opts: HalftoneOptions,
	dpi: number,
	onProgress?: (p: HalftoneProgress) => void
): Promise<Uint8Array> {
	const [{ renderHalftone, setPngDpi }, { rasterToPngBlob }] = await Promise.all([
		import('@stoneqr/engine'),
		import('./halftone')
	]);
	const raster = renderHalftone(qr, image, opts, (fraction) => onProgress?.({ phase: 'render', fraction }));
	onProgress?.({ phase: 'encode', fraction: 0 });
	const bytes = new Uint8Array(await (await rasterToPngBlob(raster)).arrayBuffer());
	return setPngDpi(bytes, dpi);
}
