import type { EncodedQr } from '../types.js';

export interface SvgOptions {
	/** Printed width of the whole symbol including quiet zone, in mm. Default 30. */
	widthMm?: number;
	/** Quiet zone in modules. Default 4. */
	quietZone?: number;
	/** Dark colour. Default '#000000'. */
	fg?: string;
	/** Light colour, or 'transparent'. Default '#ffffff'. */
	bg?: string;
	/** Include an accessible <title>. Default true. */
	title?: string | false;
}

/**
 * Build a single merged path for the dark modules, in module units.
 * Adjacent modules on a row are merged into one run so there are no anti-alias seams.
 */
export function matrixToPath(matrix: boolean[][], offset = 0): string {
	let d = '';
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
			d += `M${x + offset} ${y + offset}h${run}v1h-${run}z`;
			x += run;
		}
	}
	return d;
}

/**
 * Plain SVG with real millimetre dimensions, a viewBox in module units, one path.
 * This is the primary, always-available export. Styled output lives in the site's lazy chunk.
 */
export function renderSvg(qr: Pick<EncodedQr, 'matrix' | 'size'>, opts: SvgOptions = {}): string {
	const quiet = opts.quietZone ?? 4;
	const widthMm = opts.widthMm ?? 30;
	const fg = opts.fg ?? '#000000';
	const bg = opts.bg ?? '#ffffff';
	const total = qr.size + 2 * quiet;
	const path = matrixToPath(qr.matrix, quiet);
	const w = fmt(widthMm);
	const title = opts.title === false ? '' : `<title>${escapeXml(opts.title ?? 'QR code')}</title>`;
	const bgRect = bg === 'transparent' || bg === 'none' ? '' : `<rect width="${total}" height="${total}" fill="${escapeXml(bg)}"/>`;
	return (
		`<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${w}mm" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges">` +
		title +
		bgRect +
		`<path d="${path}" fill="${escapeXml(fg)}"/>` +
		`</svg>`
	);
}

export function escapeXml(s: string): string {
	return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!);
}

function fmt(n: number): string {
	return Number(n.toFixed(3)).toString();
}
