import { PDFDocument, StandardFonts, cmyk, rgb, type Color, type PDFPage } from 'pdf-lib';
import type { EncodedQr } from '../types.js';
import { mergedRuns } from './eps.js';
import { parseRgb } from './png.js';

/** Points per millimetre. */
const PT_PER_MM = 72 / 25.4;

const PAGE_SIZES = {
	A4: [595.276, 841.89],
	Letter: [612, 792]
} as const satisfies Record<string, readonly [number, number]>;

function isTransparent(bg: string | undefined): boolean {
	return bg === 'transparent' || bg === 'none';
}

/** 100% K when printing black in CMYK, otherwise the literal RGB of the hex. */
function toColor(hex: string | undefined, fallback: [number, number, number], useCmyk: boolean): Color {
	const [r, g, b] = parseRgb(hex, fallback);
	if (useCmyk && r <= 32 && g <= 32 && b <= 32) return cmyk(0, 0, 0, 1);
	return rgb(r / 255, g / 255, b / 255);
}

/**
 * Draw the symbol into `page` with its top-left corner at (`x`, `topY`), `widthPt` wide.
 * pdf-lib's origin is bottom-left, so rows are flipped.
 */
function drawMatrix(
	page: PDFPage,
	qr: Pick<EncodedQr, 'matrix' | 'size'>,
	x: number,
	topY: number,
	widthPt: number,
	quiet: number,
	fill: Color,
	bg: Color | undefined
): void {
	const total = qr.size + 2 * quiet;
	const scale = widthPt / total;
	const bottomY = topY - widthPt;
	if (bg) page.drawRectangle({ x, y: bottomY, width: widthPt, height: widthPt, color: bg });
	for (const run of mergedRuns(qr.matrix)) {
		page.drawRectangle({
			x: x + (run.x + quiet) * scale,
			y: bottomY + (total - (run.y + quiet) - 1) * scale,
			width: run.run * scale,
			height: scale,
			color: fill
		});
	}
}

export interface PdfOptions {
	/** Printed width of the whole symbol including quiet zone, in mm. */
	widthMm: number;
	/** White space around the symbol, in mm. Default 5. */
	marginMm?: number;
	/** Quiet zone in modules. Default 4. */
	quietZone?: number;
	/** Emit CMYK 100% K for black. Default true. */
	cmyk?: boolean;
	/** Dark colour, hex. Default '#000000'. */
	fg?: string;
	/** Light colour, hex, or 'transparent'. Default '#ffffff'. */
	bg?: string;
	/** Document title metadata. Default 'QR code'. */
	title?: string;
}

/** A single-page, vector, print-ready PDF sized to the code plus its margin. */
export async function exportPdf(
	qr: Pick<EncodedQr, 'matrix' | 'size'>,
	opts: PdfOptions
): Promise<Uint8Array> {
	const margin = (opts.marginMm ?? 5) * PT_PER_MM;
	const quiet = opts.quietZone ?? 4;
	const useCmyk = opts.cmyk ?? true;
	const widthPt = opts.widthMm * PT_PER_MM;
	const side = widthPt + 2 * margin;

	const doc = await PDFDocument.create();
	doc.setTitle(opts.title ?? 'QR code');
	doc.setProducer('StoneQR');
	doc.setCreator('stoneqr.app');

	const page = doc.addPage([side, side]);
	const background = isTransparent(opts.bg) ? undefined : toColor(opts.bg, [255, 255, 255], useCmyk);
	if (background) page.drawRectangle({ x: 0, y: 0, width: side, height: side, color: background });
	drawMatrix(page, qr, margin, side - margin, widthPt, quiet, toColor(opts.fg, [0, 0, 0], useCmyk), undefined);

	return doc.save();
}

export interface TestSheetOptions {
	/** Printed widths to lay out, in mm. Default [15, 20, 30, 50]. */
	sizesMm?: number[];
	/** Quiet zone in modules. Default 4. */
	quietZone?: number;
	/** Dark colour, hex. Default '#000000'. */
	fg?: string;
	/** Light colour, hex, or 'transparent'. Default '#ffffff'. */
	bg?: string;
	/** A human description of what the code points at. Printed as given; never derived from the payload. */
	label?: string;
	/** Default 'Letter'. */
	pageSize?: 'A4' | 'Letter';
}

/**
 * A one-page proof sheet: the same code at several print widths, each captioned with its
 * module size, so a person can test-scan before ordering signage.
 */
export async function exportTestSheet(
	qr: Pick<EncodedQr, 'matrix' | 'size'>,
	opts: TestSheetOptions = {}
): Promise<Uint8Array> {
	const sizes = (opts.sizesMm ?? [15, 20, 30, 50]).filter((s) => s > 0);
	const quiet = opts.quietZone ?? 4;
	const total = qr.size + 2 * quiet;
	const [pageW, pageH] = PAGE_SIZES[opts.pageSize ?? 'Letter'];

	const doc = await PDFDocument.create();
	doc.setTitle('StoneQR print test sheet');
	doc.setProducer('StoneQR');
	doc.setCreator('stoneqr.app');
	const font = await doc.embedFont(StandardFonts.Helvetica);
	const page = doc.addPage([pageW, pageH]);

	const margin = 40;
	const contentW = pageW - 2 * margin;
	const ink = rgb(0, 0, 0);
	const grey = rgb(0.35, 0.35, 0.35);

	let cursorY = pageH - margin;
	page.drawText('StoneQR print test sheet', { x: margin, y: cursorY - 16, size: 16, font, color: ink });
	cursorY -= 16 + 10;
	if (opts.label) {
		page.drawText(opts.label, { x: margin, y: cursorY - 10, size: 10, font, color: grey, maxWidth: contentW });
		cursorY -= 10 + 8;
	}
	page.drawText(`${qr.size} x ${qr.size} modules, ${quiet}-module quiet zone`, {
		x: margin,
		y: cursorY - 9,
		size: 9,
		font,
		color: grey
	});
	cursorY -= 9 + 18;

	const footerText =
		"Print at 100% scale (no 'fit to page'). Scan each with your phone before ordering signage.";
	const footerY = margin;
	const bottomLimit = footerY + 9 + 12;

	const captionSize = 8;
	const captionGap = 6;
	const gap = 18;
	const fill = toColor(opts.fg, [0, 0, 0], false);
	const background = isTransparent(opts.bg) ? undefined : toColor(opts.bg, [255, 255, 255], false);

	// Pack into rows first: an item is as wide as its code or its caption, whichever is wider.
	const items = sizes.map((sizeMm) => {
		const codeW = Math.min(sizeMm * PT_PER_MM, contentW);
		const caption = `${sizeMm} mm · ${(sizeMm / total).toFixed(2)} mm modules`;
		return { codeW, caption, width: Math.max(codeW, font.widthOfTextAtSize(caption, captionSize)) };
	});
	const rows: (typeof items)[] = [];
	let row: typeof items = [];
	let rowWidth = 0;
	for (const item of items) {
		if (row.length > 0 && rowWidth + gap + item.width > contentW) {
			rows.push(row);
			row = [];
			rowWidth = 0;
		}
		rowWidth += (row.length > 0 ? gap : 0) + item.width;
		row.push(item);
	}
	if (row.length > 0) rows.push(row);

	// Draw each row bottom-aligned, so every caption sits on one baseline.
	let rowTop = cursorY;
	for (const cells of rows) {
		const tallest = Math.max(...cells.map((c) => c.codeW));
		const rowHeight = tallest + captionGap + captionSize;
		// Stop before running off the bottom rather than overprinting the footer.
		if (rowTop - rowHeight < bottomLimit) break;
		const baseline = rowTop - rowHeight;
		let x = margin;
		for (const cell of cells) {
			drawMatrix(page, qr, x, baseline + captionSize + captionGap + cell.codeW, cell.codeW, quiet, fill, background);
			page.drawText(cell.caption, { x, y: baseline, size: captionSize, font, color: grey });
			x += cell.width + gap;
		}
		rowTop -= rowHeight + gap;
	}

	page.drawText(footerText, { x: margin, y: footerY, size: 9, font, color: grey, maxWidth: contentW });
	return doc.save();
}
