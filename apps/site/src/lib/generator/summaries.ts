/**
 * What each design panel says about itself when it is not the one in view: a few words naming
 * what is set inside, so a tab or a fold never hides a setting that is in force.
 *
 * Pure functions of plain fields, no runes and no DOM, so they test in plain vitest and the
 * shell can call them for every panel whether or not it is showing. An empty string means
 * nothing is set. They describe what is SET, not whether the group is switched off by an
 * Artistic QR picture: the tabs show "off" by striking the label through, and they light a dot
 * for a non-empty summary, so an "Off:" prefix here would light a dot with nothing set. The
 * headers of the untabbed panels add their own "Off: ..." words.
 *
 * The label lists the Style and Artistic QR panels draw their tiles from live here too, so the
 * words a summary uses and the words on the tiles cannot drift apart.
 */
import { THRESHOLD_DEFAULT } from '@stoneqr/engine';
import { LOOKS } from '$lib/looks';
import { isFullCrop, normaliseCrop } from '$lib/logo-crop';
import type { DotStyle } from '$lib/styled';
import type { Design, HalftoneTone } from './state.svelte';

/** The module shapes, in the order the Modules row draws them. */
export const DOTS: readonly { id: DotStyle; label: string }[] = [
	{ id: 'square', label: 'Square' },
	{ id: 'rounded', label: 'Rounded' },
	{ id: 'dots', label: 'Dots' },
	{ id: 'classy', label: 'Leaf' },
	{ id: 'extra-rounded', label: 'Soft' }
];

/** The three ways an Artistic QR picture can be shown. */
export const TONES: readonly { id: HalftoneTone; label: string }[] = [
	{ id: 'colour', label: 'Colour' },
	{ id: 'grey', label: 'Black and white' },
	{ id: 'silhouette', label: 'Silhouette' }
];

const join = (parts: (string | false | undefined)[]) => parts.filter(Boolean).join(' · ');

export type StyleSummaryFields = Pick<
	Design,
	| 'look'
	| 'dot'
	| 'cornerSquare'
	| 'cornerDot'
	| 'gradient'
	| 'fg'
	| 'bg'
	| 'cornerColor'
	| 'transparentBg'
	| 'frameEnabled'
>;

/** The look, or the parts of a hand-made one, then fill, colour, transparency, and frame. */
export function styleSummary(d: StyleSummaryFields): string {
	const parts: (string | false)[] = [];
	const look = LOOKS.find((l) => l.id === d.look);
	if (look) {
		// Classic is what everything starts as; naming it would light a dot for nothing.
		if (look.id !== 'classic') parts.push(look.label);
	} else {
		if (d.dot !== 'square') parts.push(DOTS.find((x) => x.id === d.dot)?.label ?? '');
		if (d.cornerSquare !== 'square' || d.cornerDot !== 'square') parts.push('Corners');
	}
	parts.push(d.gradient !== 'none' && 'Gradient');
	parts.push((d.fg !== '#000000' || d.cornerColor !== null || (d.bg !== '#ffffff' && !d.transparentBg)) && 'Colour');
	parts.push(d.transparentBg && 'Transparent');
	parts.push(d.frameEnabled && 'Frame');
	return join(parts);
}

export type LogoSummaryFields = Pick<
	Design,
	'logo' | 'logoName' | 'logoCropX' | 'logoCropY' | 'logoCropW' | 'logoCropH' | 'logoKnockout'
>;

/** The logo's name, and the two unusual choices: a crop, and painting over the modules. */
export function logoSummary(d: LogoSummaryFields): string {
	if (!d.logo) return '';
	// The same repair `Design.logoCrop` applies, so a design file's nonsense reads as "whole picture".
	const crop = normaliseCrop({ u: d.logoCropX, v: d.logoCropY, w: d.logoCropW, h: d.logoCropH });
	return join([d.logoName, !isFullCrop(crop) && 'cropped', !d.logoKnockout && 'over modules']);
}

export type ArtisticSummaryFields = Pick<
	Design,
	| 'halftoneImage'
	| 'halftoneImageName'
	| 'halftone'
	| 'halftoneTone'
	| 'halftoneZoom'
	| 'halftoneOffsetX'
	| 'halftoneOffsetY'
	| 'halftoneThreshold'
	| 'shapeColor'
	| 'halftoneDotScale'
	| 'halftoneDim'
	| 'halftoneContrast'
>;

/**
 * The picture and how it is shown, then everything inside the panel that has been moved off its
 * default: the crop, the silhouette's Cut, a shape colour, and any of the three tuning sliders.
 */
export function artisticSummary(d: ArtisticSummaryFields): string {
	if (!d.halftoneImage) return '';
	// The Cut and the shape colour only mean anything while a silhouette is blended in, so both are
	// named only then; with the blend off the tone is "off" and the rest waits for it to come back.
	const silhouette = d.halftone && d.halftoneTone === 'silhouette';
	const tone = TONES.find((t) => t.id === d.halftoneTone)?.label ?? '';
	return join([
		d.halftoneImageName,
		d.halftone ? tone : 'off',
		(d.halftoneZoom !== 1 || d.halftoneOffsetX !== 0 || d.halftoneOffsetY !== 0) && 'cropped',
		silhouette && d.halftoneThreshold !== THRESHOLD_DEFAULT && `Cut ${Math.round(d.halftoneThreshold * 100)}%`,
		// A shape colour is invisible once the panel is out of sight, so the summary says it is set.
		silhouette && d.shapeColor !== '#000000' && 'Shape colour',
		(d.halftoneDotScale !== 0.4 || d.halftoneDim !== 0 || d.halftoneContrast !== 1) && 'tuned'
	]);
}
