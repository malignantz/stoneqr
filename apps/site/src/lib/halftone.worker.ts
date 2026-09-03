/**
 * Halftone PNG export worker: unpack the matrices, render, encode, hand the bytes back.
 * Encoding uses the browser's own PNG encoder via OffscreenCanvas when it exists (every
 * current browser), and the engine's pure-JS encoder otherwise. Nothing here touches the network.
 */
import { encodePng, renderHalftone, setPngDpi } from '@stoneqr/engine';
import { unpackMatrix } from '$lib/bulk/protocol';
import type { HalftoneExportMessage, HalftoneExportRequest } from './halftone-export';

const post = (m: HalftoneExportMessage, transfer: Transferable[] = []): void =>
	(globalThis as unknown as Worker).postMessage(m, transfer);

globalThis.onmessage = async (e: MessageEvent<HalftoneExportRequest>) => {
	const req = e.data;
	try {
		const qr = {
			size: req.size,
			matrix: unpackMatrix(req.matrix, 0, req.size),
			functionMask: unpackMatrix(req.functionMask, 0, req.size)
		};
		const image = { width: req.image.width, height: req.image.height, data: new Uint8ClampedArray(req.image.data) };
		let lastPct = -1;
		const raster = renderHalftone(qr, image, req.opts, (fraction) => {
			const pct = Math.floor(fraction * 100);
			if (pct === lastPct) return;
			lastPct = pct;
			post({ type: 'progress', phase: 'render', fraction });
		});
		post({ type: 'progress', phase: 'encode', fraction: 0 });

		let png: Uint8Array;
		if (typeof OffscreenCanvas !== 'undefined') {
			const canvas = new OffscreenCanvas(raster.width, raster.height);
			const ctx = canvas.getContext('2d');
			if (!ctx) throw new Error('The export worker could not open a canvas.');
			// The renderer always returns a Uint8ClampedArray over a plain ArrayBuffer.
			const pixels = raster.data as unknown as Uint8ClampedArray<ArrayBuffer>;
			ctx.putImageData(new ImageData(pixels, raster.width, raster.height), 0, 0);
			const blob = await canvas.convertToBlob({ type: 'image/png' });
			png = setPngDpi(new Uint8Array(await blob.arrayBuffer()), req.dpi);
		} else {
			png = encodePng(raster, { dpi: req.dpi });
		}
		post({ type: 'done', png }, [png.buffer]);
	} catch (err) {
		post({ type: 'error', message: err instanceof Error ? err.message : String(err) });
	}
};
