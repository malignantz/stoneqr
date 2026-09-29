/**
 * Templates: a whole design in one tile. A template is a look (the three shapes), a code colour,
 * a paper colour, optionally a corner colour, and optionally a frame with its colours. Someone
 * who wants "the navy one" should not have to make five choices to get it.
 *
 * Like looks, a template is matched and never stored: the design keeps the plain fields it
 * always had, and the tile whose fields they equal is the selected one. Change any one of them
 * by hand and no tile is selected, which is honest about what is set and needs no field on
 * `Design`, nothing in `PERSISTED`, and no way for a saved design to disagree with itself.
 *
 * A template is exactly what its tile shows, so it also pins the two things a tile cannot draw:
 * no gradient and no transparent background. Applying one over a gradient design switches the
 * gradient off, and a design that still has one matches nothing.
 *
 * Every colour here passes the same bar the palettes do, at 4.5 or more for the weaker of the
 * code and corner colours against the paper and nowhere near red; `test/templates.test.ts` pins
 * both, so add a template only after it passes. Paper is white or a very pale tint.
 */
import { LOOKS, lookFor, type LookId } from './looks';
import type { CornerDotStyle, CornerSquareStyle, DotStyle } from './styled';

export interface Template {
	id: string;
	/** What the tile's tooltip says. */
	name: string;
	/** The tile's caption, short enough for a 46 px tile. */
	label: string;
	look: LookId;
	/** Colours are six-digit hex, lower case. */
	fg: string;
	bg: string;
	/** Null leaves the corners following the code colour. */
	cornerColor: string | null;
	frameEnabled: boolean;
	/** Present exactly when `frameEnabled`. */
	frameColor?: string;
	frameTextColor?: string;
	/** Words for the frame; only ever written over the default ones. */
	frameText?: string;
}

export const TEMPLATES: readonly Template[] = [
	{ id: 'plain', name: 'Plain', label: 'Plain', look: 'classic', fg: '#000000', bg: '#ffffff', cornerColor: null, frameEnabled: false },
	{ id: 'navy-rounded', name: 'Navy rounded', label: 'Navy', look: 'rounded', fg: '#14275a', bg: '#ffffff', cornerColor: null, frameEnabled: false },
	// Copper is a deep brown here on purpose: the usual #b87333 is 3.5:1 on this paper, under the bar.
	{ id: 'forest-dots', name: 'Forest dots with copper corners', label: 'Forest', look: 'dots', fg: '#1b4d2e', bg: '#faf6ec', cornerColor: '#8a4b1f', frameEnabled: false },
	{ id: 'slate-leaf', name: 'Slate leaf', label: 'Slate', look: 'leaf', fg: '#34424f', bg: '#ffffff', cornerColor: null, frameEnabled: false },
	{ id: 'plum-soft', name: 'Plum soft', label: 'Plum', look: 'soft', fg: '#4a1d5e', bg: '#f6f0f9', cornerColor: null, frameEnabled: false },
	{
		id: 'boxed',
		name: 'Boxed: black with a call-to-action frame',
		label: 'Boxed',
		look: 'classic',
		fg: '#000000',
		bg: '#ffffff',
		cornerColor: null,
		frameEnabled: true,
		frameColor: '#000000',
		frameTextColor: '#ffffff',
		frameText: 'Scan me'
	}
];

/** The frame words a design opens with; a template only replaces these, never someone's own. */
export const DEFAULT_FRAME_TEXT = 'Scan me';

/** The fields a template reads, so the tests and the design both satisfy it without runes. */
export interface TemplateFields {
	dot: DotStyle;
	cornerSquare: CornerSquareStyle;
	cornerDot: CornerDotStyle;
	fg: string;
	bg: string;
	cornerColor: string | null;
	transparentBg: boolean;
	gradient: string;
	frameEnabled: boolean;
	frameText: string;
	frameColor: string;
	frameTextColor: string;
}

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/**
 * The template a design's fields add up to, or null. Hex compares without regard to case. The
 * frame's colours count only when the template has a frame, and the frame's words never count.
 */
export function templateFor(d: TemplateFields): Template | null {
	const look = lookFor(d.dot, d.cornerSquare, d.cornerDot);
	if (!look || d.gradient !== 'none' || d.transparentBg) return null;
	return (
		TEMPLATES.find(
			(t) =>
				t.look === look.id &&
				same(t.fg, d.fg) &&
				same(t.bg, d.bg) &&
				(t.cornerColor === null ? d.cornerColor === null : d.cornerColor !== null && same(t.cornerColor, d.cornerColor)) &&
				t.frameEnabled === d.frameEnabled &&
				(!t.frameEnabled || (same(t.frameColor!, d.frameColor) && same(t.frameTextColor!, d.frameTextColor)))
		) ?? null
	);
}

/**
 * Put a template's fields on a design. The frame goes on or off with the template, and the
 * words already in the box stay unless they are still the default.
 */
/**
 * Whether a corner colour is one only Advanced could have set: Basic has no Corners field, but a
 * template tile can bring one ("Forest dots with copper corners"), and what Basic set through a
 * tile is not Advanced's alone. `Design.advancedInUse` asks this, so Basic's notice stays quiet
 * for a template and speaks up once the corners are changed by hand.
 */
export function cornerColourIsAdvanced(d: TemplateFields): boolean {
	return d.cornerColor !== null && templateFor(d) === null;
}

export function applyTemplate(d: TemplateFields, t: Template): void {
	const l = LOOKS.find((x) => x.id === t.look)!;
	d.dot = l.dot;
	d.cornerSquare = l.cornerSquare;
	d.cornerDot = l.cornerDot;
	d.fg = t.fg;
	d.bg = t.bg;
	d.cornerColor = t.cornerColor;
	d.transparentBg = false;
	d.gradient = 'none';
	d.frameEnabled = t.frameEnabled;
	if (t.frameEnabled) {
		d.frameColor = t.frameColor!;
		d.frameTextColor = t.frameTextColor!;
		if (t.frameText && d.frameText === DEFAULT_FRAME_TEXT) d.frameText = t.frameText;
	}
}
