/**
 * Colour conversion for the in-page picker (docs/ui-refresh.md §3a).
 *
 * The picker works in HSV because that is the shape of its controls: a saturation/value square
 * under a hue strip. Everything else on the site speaks hex, so these two functions are the
 * whole boundary. Pure and DOM-free, so they are unit tested in Node.
 */

export interface Hsv {
	/** 0..360 */
	h: number;
	/** 0..1 */
	s: number;
	/** 0..1 */
	v: number;
}

const clamp = (n: number, lo: number, hi: number) => (n < lo ? lo : n > hi ? hi : n);

/**
 * Accepts `#abc`, `abc`, `#aabbcc`, `aabbcc`, in any case, and returns a normalised
 * `#rrggbb` in lower case. Returns null for anything else, so a half-typed hex field can say
 * so without touching the design.
 */
export function normaliseHex(input: string): string | null {
	const raw = input.trim().replace(/^#/, '');
	if (!/^[0-9a-fA-F]+$/.test(raw)) return null;
	if (raw.length === 3) {
		const [r, g, b] = raw.toLowerCase().split('');
		return `#${r}${r}${g}${g}${b}${b}`;
	}
	if (raw.length === 6) return `#${raw.toLowerCase()}`;
	return null;
}

/** `#rrggbb` to 0..255 triple. Unparseable input is black, matching the preview's own fallback. */
export function hexToRgb(hex: string): [number, number, number] {
	const norm = normaliseHex(hex);
	if (!norm) return [0, 0, 0];
	const v = parseInt(norm.slice(1), 16);
	return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

/** 0..255 triple to `#rrggbb`. Components are rounded and clamped. */
export function rgbToHex(r: number, g: number, b: number): string {
	const part = (n: number) =>
		clamp(Math.round(n), 0, 255)
			.toString(16)
			.padStart(2, '0');
	return `#${part(r)}${part(g)}${part(b)}`;
}

export function rgbToHsv(r: number, g: number, b: number): Hsv {
	const rn = r / 255;
	const gn = g / 255;
	const bn = b / 255;
	const max = Math.max(rn, gn, bn);
	const min = Math.min(rn, gn, bn);
	const d = max - min;
	let h = 0;
	if (d !== 0) {
		if (max === rn) h = ((gn - bn) / d) % 6;
		else if (max === gn) h = (bn - rn) / d + 2;
		else h = (rn - gn) / d + 4;
		h *= 60;
		if (h < 0) h += 360;
	}
	return { h, s: max === 0 ? 0 : d / max, v: max };
}

export function hsvToRgb({ h, s, v }: Hsv): [number, number, number] {
	const hh = ((h % 360) + 360) % 360;
	const ss = clamp(s, 0, 1);
	const vv = clamp(v, 0, 1);
	const c = vv * ss;
	const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
	const m = vv - c;
	const seg = Math.floor(hh / 60) % 6;
	const [r, g, b] = (
		[
			[c, x, 0],
			[x, c, 0],
			[0, c, x],
			[0, x, c],
			[x, 0, c],
			[c, 0, x]
		] as const
	)[seg];
	return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

export function hexToHsv(hex: string): Hsv {
	const [r, g, b] = hexToRgb(hex);
	return rgbToHsv(r, g, b);
}

export function hsvToHex(hsv: Hsv): string {
	const [r, g, b] = hsvToRgb(hsv);
	return rgbToHex(r, g, b);
}

/**
 * A readable label for the saturation/value square's screen-reader value. The square is a
 * two-axis control, so its value has to be spoken as a pair.
 */
export function describeSv(s: number, v: number): string {
	return `saturation ${Math.round(s * 100)}%, brightness ${Math.round(v * 100)}%`;
}

/** Perceived lightness, used to decide whether a swatch needs a light or dark check mark. */
export function isLight(hex: string): boolean {
	const [r, g, b] = hexToRgb(hex);
	// Rec. 601 luma is good enough to pick a tick colour and costs nothing.
	return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
}
