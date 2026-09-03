import type { EncodedQr } from '../types.js';
import { parseRgb } from './png.js';

/** A merged horizontal run of dark modules, in module units. Mirrors `matrixToPath`. */
export interface ModuleRun {
	x: number;
	y: number;
	run: number;
}

/** Merge adjacent dark modules on each row into single runs, so print paths have no seams. */
export function mergedRuns(matrix: boolean[][]): ModuleRun[] {
	const runs: ModuleRun[] = [];
	for (let y = 0; y < matrix.length; y++) {
		const row = matrix[y]!;
		let x = 0;
		while (x < row.length) {
			if (!row[x]) {
				x++;
				continue;
			}
			let run = 1;
			while (x + run < row.length && row[x + run]) run++;
			runs.push({ x, y, run });
			x += run;
		}
	}
	return runs;
}

/** Points per millimetre. */
const PT_PER_MM = 72 / 25.4;

export interface EpsOptions {
	/** Printed width of the whole symbol including quiet zone, in mm. */
	widthMm: number;
	/** Quiet zone in modules. Default 4. */
	quietZone?: number;
	/** Emit CMYK colours (100% K black for print). Default true. */
	cmyk?: boolean;
	/** Dark colour, hex. Default '#000000'. */
	fg?: string;
	/** Light colour, hex, or 'transparent'. Default '#ffffff'. */
	bg?: string;
	/** %%Title comment. Default 'QR code'. */
	title?: string;
}

function num(n: number): string {
	return Number(n.toFixed(4)).toString();
}

function colourOp(hex: string | undefined, fallback: [number, number, number], cmyk: boolean): string {
	const [r, g, b] = parseRgb(hex, fallback).map((v) => v / 255) as [number, number, number];
	if (!cmyk) return `${num(r)} ${num(g)} ${num(b)} setrgbcolor`;
	const k = 1 - Math.max(r, g, b);
	if (k >= 1) return '0 0 0 1 setcmykcolor';
	const c = (1 - r - k) / (1 - k);
	const m = (1 - g - k) / (1 - k);
	const y = (1 - b - k) / (1 - k);
	return `${num(c)} ${num(m)} ${num(y)} ${num(k)} setcmykcolor`;
}

/**
 * Hand-written EPS. No library, no canvas: one `rectfill` per merged run of dark modules.
 * PostScript's y axis points up, so rows are flipped relative to the matrix.
 */
export function exportEps(qr: Pick<EncodedQr, 'matrix' | 'size'>, opts: EpsOptions): string {
	const quiet = opts.quietZone ?? 4;
	const cmyk = opts.cmyk ?? true;
	const bg = opts.bg ?? '#ffffff';
	const total = qr.size + 2 * quiet;
	const sidePt = opts.widthMm * PT_PER_MM;
	const box = Math.ceil(sidePt);
	const scale = sidePt / total;

	const lines: string[] = [
		'%!PS-Adobe-3.0 EPSF-3.0',
		`%%BoundingBox: 0 0 ${box} ${box}`,
		`%%HiResBoundingBox: 0 0 ${num(sidePt)} ${num(sidePt)}`,
		'%%Creator: StoneQR',
		`%%Title: ${(opts.title ?? 'QR code').replace(/[\r\n]+/g, ' ')}`,
		'%%LanguageLevel: 2',
		'%%Pages: 1',
		'%%EndComments',
		`% ${qr.size} modules plus a ${quiet}-module quiet zone, printed ${num(opts.widthMm)} mm wide`
	];

	const transparent = bg === 'transparent' || bg === 'none';
	if (!transparent) {
		lines.push(colourOp(bg, [255, 255, 255], cmyk));
		lines.push(`0 0 ${num(sidePt)} ${num(sidePt)} rectfill`);
	}
	lines.push(colourOp(opts.fg, [0, 0, 0], cmyk));

	for (const { x, y, run } of mergedRuns(qr.matrix)) {
		const px = (x + quiet) * scale;
		// Flip: module row 0 is at the top, PostScript origin is bottom-left.
		const py = (total - (y + quiet) - 1) * scale;
		lines.push(`${num(px)} ${num(py)} ${num(run * scale)} ${num(scale)} rectfill`);
	}

	lines.push('showpage', '%%EOF', '');
	return lines.join('\n');
}
