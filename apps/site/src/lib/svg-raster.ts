/**
 * Rasterise an SVG string on a canvas. Browser only.
 * Used for styled output: PNG export, clipboard copy, and decode verification.
 */
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
		canvas.width = px;
		canvas.height = px;
		const ctx = canvas.getContext('2d')!;
		if (background && background !== 'transparent') {
			ctx.fillStyle = background;
			ctx.fillRect(0, 0, px, px);
		}
		ctx.imageSmoothingEnabled = false;
		ctx.drawImage(img, 0, 0, px, px);
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
