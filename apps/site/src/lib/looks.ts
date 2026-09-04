/**
 * Style presets: one tile sets the module shape and both corner shapes together, so someone in
 * Basic gets a coherent look without the three separate controls, and someone in Advanced has a
 * starting point to adjust. A look is nothing more than the three shapes; colours, logo, and
 * frame are separate decisions and stay where they are.
 *
 * A look is "matched", not stored: the design keeps the three shapes, and the tile whose shapes
 * they equal is the selected one. Change any shape by hand and no tile is selected, which is
 * honest about what is set and needs no extra state to keep in step.
 */
import type { CornerDotStyle, CornerSquareStyle, DotStyle } from './styled';

export type LookId = 'classic' | 'rounded' | 'dots' | 'leaf' | 'soft';

export interface Look {
	id: LookId;
	label: string;
	dot: DotStyle;
	cornerSquare: CornerSquareStyle;
	cornerDot: CornerDotStyle;
}

export const LOOKS: readonly Look[] = [
	{ id: 'classic', label: 'Classic', dot: 'square', cornerSquare: 'square', cornerDot: 'square' },
	{ id: 'rounded', label: 'Rounded', dot: 'rounded', cornerSquare: 'extra-rounded', cornerDot: 'square' },
	{ id: 'dots', label: 'Dots', dot: 'dots', cornerSquare: 'dot', cornerDot: 'dot' },
	{ id: 'leaf', label: 'Leaf', dot: 'classy', cornerSquare: 'classy', cornerDot: 'classy' },
	{ id: 'soft', label: 'Soft', dot: 'extra-rounded', cornerSquare: 'extra-rounded', cornerDot: 'dot' }
];

/** The look these three shapes add up to, or null for a combination no tile offers. */
export function lookFor(dot: DotStyle, cornerSquare: CornerSquareStyle, cornerDot: CornerDotStyle): Look | null {
	return LOOKS.find((l) => l.dot === dot && l.cornerSquare === cornerSquare && l.cornerDot === cornerDot) ?? null;
}
