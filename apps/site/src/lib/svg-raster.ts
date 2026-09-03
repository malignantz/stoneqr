/**
 * Rasterise an SVG string on a canvas. Browser only.
 * Used for styled output: PNG export, clipboard copy, and decode verification.
 * The canvas keeps the SVG's aspect ratio, so framed (taller than wide) codes are not squashed.
 */

/** Height divided by width, read from the viewBox; 1 when there is none. */
export function svgAspect(svg: string): number {
	const vb = svg.match(/viewBox="([^"]+)"/)?.[1]?.split(/\s+/).map(Number);
	if (vb && vb.length === 4 && vb[2]! > 0 && vb[3]! > 0) return vb[3]! / vb[2]!;
	return 1;
}

export async function svgToCanvas(svg: string, widthPx: number, background?: string): Promise<HTMLCanvasElement> {
	const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
	const url = URL.createObjectURL(blob);
	try {
		const img = new Image();
		img.decoding = 'async';
		await new Promise<void>((resolve, reject) => {
			img.onload = () => resolve();
			img.onerror = () => reject(new Error('SVG failed to rasterise'));
			img.src = url;
		});
		const canvas = document.createElement('canvas');
		const px = Math.max(1, Math.round(widthPx));
		const py = Math.max(1, Math.round(widthPx * svgAspect(svg)));
		canvas.width = px;
		canvas.height = py;
		const ctx = canvas.getContext('2d')!;
		if (background && background !== 'transparent') {
			ctx.fillStyle = background;
			ctx.fillRect(0, 0, px, py);
		}
		ctx.imageSmoothingEnabled = false;
		ctx.drawImage(img, 0, 0, px, py);
		return canvas;
	} finally {
		URL.revokeObjectURL(url);
	}
}

export function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
	return new Promise((resolve, reject) =>
		canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png')
	);
}

export function canvasImageData(canvas: HTMLCanvasElement): ImageData {
	const ctx = canvas.getContext('2d')!;
	return ctx.getImageData(0, 0, canvas.width, canvas.height);
}
