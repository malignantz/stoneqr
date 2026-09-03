/**
 * PDF export for styled codes (browser only). Styled output is an SVG from the styling library;
 * we rasterise it at high resolution and embed it as a PNG at the exact physical size.
 * Plain codes use the engine's vector exporter instead.
 */
import { svgToCanvas, canvasToPngBlob } from './svg-raster';

const MM_TO_PT = 72 / 25.4;

export async function styledPdf(svg: string, widthMm: number, opts: { marginMm?: number; title?: string; bg?: string } = {}): Promise<Uint8Array> {
	const { PDFDocument } = await import('pdf-lib');
	const margin = opts.marginMm ?? 5;
	const px = Math.round((widthMm / 25.4) * 600); // 600 dpi raster keeps edges crisp in print
	const canvas = await svgToCanvas(svg, px, opts.bg);
	const png = new Uint8Array(await (await canvasToPngBlob(canvas)).arrayBuffer());
	const doc = await PDFDocument.create();
	doc.setTitle(opts.title ?? 'QR code');
	doc.setProducer('StoneQR');
	doc.setCreator('stoneqr.app');
	const side = (widthMm + 2 * margin) * MM_TO_PT;
	const page = doc.addPage([side, side]);
	const img = await doc.embedPng(png);
	const w = widthMm * MM_TO_PT;
	page.drawImage(img, { x: margin * MM_TO_PT, y: margin * MM_TO_PT, width: w, height: w });
	return doc.save();
}

export async function styledTestSheet(
	svg: string,
	opts: { sizesMm?: number[]; label?: string; pageSize?: 'A4' | 'Letter'; bg?: string; moduleCount: number }
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
	const canvas = await svgToCanvas(svg, Math.round((maxMm / 25.4) * 600), opts.bg);
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
	const rowH = maxMm + 10;
	for (const s of sizes) {
		if (x + s > pageW - marginMm) {
			x = marginMm;
			y -= rowH;
		}
		const top = y;
		page.drawImage(img, { x: x * MM_TO_PT, y: (top - s) * MM_TO_PT, width: s * MM_TO_PT, height: s * MM_TO_PT });
		const mod = s / opts.moduleCount;
		page.drawText(`${s} mm · ${mod.toFixed(2)} mm modules`, { x: x * MM_TO_PT, y: (top - s - 5) * MM_TO_PT, size: 8, font, color: rgb(0.3, 0.3, 0.3) });
		x += s + gap;
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
