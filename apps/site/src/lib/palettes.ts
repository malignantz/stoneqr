/**
 * Six code colours for Basic, one tap each. A palette is only a code colour: choosing one puts
 * the background back to white and the corners back to following the code, so what a dot says is
 * the whole colour scheme, never a half-remembered combination.
 *
 * Every one is dark enough to scan and nowhere near red. The test pins both (contrast against
 * white of 7 or more, not `isReddish`), which is well past the 4 the contrast badge asks for,
 * because a scanner reads with red light and paper is rarely pure white. Add a colour here only
 * after it passes; a hue that merely sounds dark, plum especially, can fall into the red band.
 */
export interface Palette {
	id: string;
	name: string;
	/** Six-digit hex, lower case. */
	fg: string;
}

export const PALETTES: readonly Palette[] = [
	{ id: 'black', name: 'Black', fg: '#000000' },
	{ id: 'navy', name: 'Navy', fg: '#14275a' },
	{ id: 'forest', name: 'Forest', fg: '#1b4d2e' },
	{ id: 'plum', name: 'Plum', fg: '#4a1d5e' },
	{ id: 'slate', name: 'Slate', fg: '#34424f' },
	{ id: 'teal', name: 'Teal', fg: '#0d5658' }
];

/** The paper every palette sits on. */
export const PALETTE_BG = '#ffffff';

/**
 * The palette a design's colours add up to, or null: the code colour is one of ours, the
 * background is white, and the corners follow the code. Hex compares without regard to case.
 */
export function paletteFor(fg: string, bg: string, cornerColor: string | null): Palette | null {
	if (cornerColor !== null || bg.toLowerCase() !== PALETTE_BG) return null;
	const f = fg.toLowerCase();
	return PALETTES.find((p) => p.fg === f) ?? null;
}
