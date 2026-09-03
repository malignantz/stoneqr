/**
 * PDF export for styled codes (browser only). Styled output is an SVG from the styling library;
 * we rasterise it at high resolution and embed it as a PNG at the exact physical size.
 * Plain codes use the engine's vector exporter instead.
 */
import { svgToCanvas, canvasToPngBlob } from './svg-raster';

const MM_TO_PT = 72 / 25.4;

/** `widthMm` is the width of the whole artwork (frame included when there is one). */
export async function styledPdf(svg: string, widthMm: number, opts: { marginMm?: number; title?: string; bg?: string } = {}): Promise<Uint8Array> {
	const { PDFDocument } = await import('pdf-lib');
	const margin = opts.marginMm ?? 5;
	const px = Math.round((widthMm / 25.4) * 600); // 600 dpi raster keeps edges crisp in print
	const canvas = await svgToCanvas(svg, px, opts.bg);
	const ratio = canvas.height / canvas.width;
	const png = new Uint8Array(await (await canvasToPngBlob(canvas)).arrayBuffer());
	const doc = await PDFDocument.create();
	doc.setTitle(opts.title ?? 'QR code');
	doc.setProducer('StoneQR');
	doc.setCreator('stoneqr.app');
	const w = widthMm * MM_TO_PT;
	const h = w * ratio;
	const page = doc.addPage([w + 2 * margin * MM_TO_PT, h + 2 * margin * MM_TO_PT]);
	const img = await doc.embedPng(png);
	page.drawImage(img, { x: margin * MM_TO_PT, y: margin * MM_TO_PT, width: w, height: h });
	return doc.save();
}

export async function styledTestSheet(
	svg: string,
	opts: {
		sizesMm?: number[];
		label?: string;
		pageSize?: 'A4' | 'Letter';
		bg?: string;
		moduleCount: number;
		/** Artwork width over code width (a frame adds to it). Sizes stay code sizes; the frame is drawn around them. */
		scale?: number;
	}
): Promise<Uint8Array> {
	const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
	const sizes = opts.sizesMm ?? [15, 20, 30, 50];
	const pageW = opts.pageSize === 'A4' ? 210 : 215.9;
	const pageH = opts.pageSize === 'A4' ? 297 : 279.4;
	const doc = await PDFDocument.create();
	doc.setTitle('StoneQR print test sheet');
	doc.setProducer('StoneQR');
	const font = await doc.embedFont(StandardFonts.Helvetica);
	const page = doc.addPage([pageW * MM_TO_PT, pageH * MM_TO_PT]);
	const maxMm = Math.max(...sizes);
	const scale = opts.scale ?? 1;
	const canvas = await svgToCanvas(svg, Math.round(((maxMm * scale) / 25.4) * 600), opts.bg);
	const ratio = canvas.height / canvas.width;
	const img = await doc.embedPng(new Uint8Array(await (await canvasToPngBlob(canvas)).arrayBuffer()));

	const marginMm = 18;
	let y = pageH - marginMm;
	page.drawText('StoneQR print test sheet', { x: marginMm * MM_TO_PT, y: y * MM_TO_PT - 14, size: 16, font, color: rgb(0.1, 0.1, 0.1) });
	y -= 8;
	if (opts.label) {
		page.drawText(opts.label, { x: marginMm * MM_TO_PT, y: y * MM_TO_PT - 12, size: 10, font, color: rgb(0.3, 0.3, 0.3) });
		y -= 6;
	}
	y -= 8;
	let x = marginMm;
	const gap = 10;
	const rowH = maxMm * scale * ratio + 10;
	for (const s of sizes) {
		const dw = s * scale;
		const dh = dw * ratio;
		if (x + dw > pageW - marginMm) {
			x = marginMm;
			y -= rowH;
		}
		const top = y;
		page.drawImage(img, { x: x * MM_TO_PT, y: (top - dh) * MM_TO_PT, width: dw * MM_TO_PT, height: dh * MM_TO_PT });
		const mod = s / opts.moduleCount;
		page.drawText(`${s} mm · ${mod.toFixed(2)} mm modules`, { x: x * MM_TO_PT, y: (top - dh - 5) * MM_TO_PT, size: 8, font, color: rgb(0.3, 0.3, 0.3) });
		x += dw + gap;
	}
	page.drawText("Print at 100% scale (no 'fit to page'). Scan each with your phone before ordering signage.", {
		x: marginMm * MM_TO_PT,
		y: marginMm * MM_TO_PT,
		size: 9,
		font,
		color: rgb(0.3, 0.3, 0.3)
	});
	return doc.save();
}
