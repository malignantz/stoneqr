/**
 * Path geometry for the style swatches: little drawings of what each module and corner style
 * produces, so a choice is picked by eye rather than from a word like "Classy".
 *
 * These only have to *look* like the styling library's output at 40 px; they are captions in
 * picture form, not a second renderer. The real preview is a few hundred milliseconds away.
 */
import type { CornerDotStyle, CornerSquareStyle, DotStyle } from './styled';

/** A rounded rectangle with a radius per corner, clockwise from the top left. */
export function roundedRect(
	x: number,
	y: number,
	w: number,
	h: number,
	[tl, tr, br, bl]: [number, number, number, number]
): string {
	const max = Math.min(w, h) / 2;
	const a = Math.min(tl, max);
	const b = Math.min(tr, max);
	const c = Math.min(br, max);
	const d = Math.min(bl, max);
	return [
		`M${x + a},${y}`,
		`H${x + w - b}`,
		b ? `A${b},${b} 0 0 1 ${x + w},${y + b}` : '',
		`V${y + h - c}`,
		c ? `A${c},${c} 0 0 1 ${x + w - c},${y + h}` : '',
		`H${x + d}`,
		d ? `A${d},${d} 0 0 1 ${x},${y + h - d}` : '',
		`V${y + a}`,
		a ? `A${a},${a} 0 0 1 ${x + a},${y}` : '',
		'Z'
	]
		.filter(Boolean)
		.join(' ');
}

/** One data module drawn in the given style, as a path inside a 1×1 cell at (x, y). */
export function modulePath(style: DotStyle, x: number, y: number): string {
	const inset = 0.06;
	const s = 1 - inset * 2;
	const px = x + inset;
	const py = y + inset;
	switch (style) {
		case 'square':
			return roundedRect(px, py, s, s, [0, 0, 0, 0]);
		case 'rounded':
			return roundedRect(px, py, s, s, [0.26, 0.26, 0.26, 0.26]);
		case 'dots':
			return roundedRect(px, py, s, s, [s / 2, s / 2, s / 2, s / 2]);
		case 'classy':
			// The library's "classy" rounds one diagonal pair, which is what gives it the leaf look.
			return roundedRect(px, py, s, s, [s / 2, 0, s / 2, 0]);
		case 'extra-rounded':
			return roundedRect(px, py, s, s, [0.42, 0.42, 0.42, 0.42]);
	}
}

/**
 * A patch of data modules for the module-shape tiles. Fixed, and chosen to show both isolated
 * modules and runs of them, because that is where the styles differ most.
 */
export const MODULE_PATCH: readonly (readonly number[])[] = [
	[1, 1, 0, 1],
	[1, 0, 1, 1],
	[0, 1, 1, 0],
	[1, 1, 0, 1]
];

export function modulePatchPath(style: DotStyle): string {
	const out: string[] = [];
	for (let r = 0; r < MODULE_PATCH.length; r++) {
		for (let c = 0; c < MODULE_PATCH[r].length; c++) {
			if (MODULE_PATCH[r][c]) out.push(modulePath(style, c, r));
		}
	}
	return out.join(' ');
}

/** The outer ring of a finder pattern, 7×7 with a 1-unit stroke, in the given corner style. */
export function cornerFramePath(style: CornerSquareStyle): string {
	const r: Record<CornerSquareStyle, [number, number, number, number]> = {
		square: [0, 0, 0, 0],
		'extra-rounded': [1.9, 1.9, 1.9, 1.9],
		dot: [3, 3, 3, 3],
		classy: [3, 0, 3, 0]
	};
	// Drawn as a stroked path so the ring keeps a constant 1-unit thickness at every radius.
	return roundedRect(0.5, 0.5, 6, 6, r[style]);
}

/** The 3×3 centre of a finder pattern in the given corner-dot style. */
export function cornerDotPath(style: CornerDotStyle): string {
	const r: Record<CornerDotStyle, [number, number, number, number]> = {
		square: [0, 0, 0, 0],
		dot: [1.5, 1.5, 1.5, 1.5],
		classy: [1.5, 0, 1.5, 0]
	};
	return roundedRect(2, 2, 3, 3, r[style]);
}
