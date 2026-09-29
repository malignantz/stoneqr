import { describe, expect, it } from 'vitest';
import { THRESHOLD_DEFAULT } from '@stoneqr/engine';
import {
	artisticSummary,
	logoSummary,
	styleSummary,
	type ArtisticSummaryFields,
	type LogoSummaryFields,
	type StyleSummaryFields
} from '../src/lib/generator/summaries';

const style = (o: Partial<StyleSummaryFields> = {}): StyleSummaryFields => ({
	look: 'classic',
	dot: 'square',
	cornerSquare: 'square',
	cornerDot: 'square',
	gradient: 'none',
	fg: '#000000',
	bg: '#ffffff',
	cornerColor: null,
	transparentBg: false,
	frameEnabled: false,
	...o
});

const logo = (o: Partial<LogoSummaryFields> = {}): LogoSummaryFields => ({
	logo: 'data:image/png;base64,AAAA',
	logoName: 'mark.png',
	logoCropX: 0,
	logoCropY: 0,
	logoCropW: 1,
	logoCropH: 1,
	logoKnockout: true,
	...o
});

const art = (o: Partial<ArtisticSummaryFields> = {}): ArtisticSummaryFields => ({
	halftoneImage: 'data:image/png;base64,AAAA',
	halftoneImageName: 'dog.png',
	halftone: true,
	halftoneTone: 'colour',
	halftoneZoom: 1,
	halftoneOffsetX: 0,
	halftoneOffsetY: 0,
	halftoneThreshold: THRESHOLD_DEFAULT,
	shapeColor: '#000000',
	halftoneDotScale: 0.4,
	halftoneDim: 0,
	halftoneContrast: 1,
	...o
});

describe('styleSummary', () => {
	it('is empty for the defaults', () => {
		expect(styleSummary(style())).toBe('');
	});

	it('names a look other than Classic', () => {
		expect(styleSummary(style({ look: 'leaf', dot: 'classy', cornerSquare: 'classy', cornerDot: 'classy' }))).toBe('Leaf');
	});

	it('names the module and Corners for a hand-made combination', () => {
		expect(styleSummary(style({ look: 'custom', dot: 'rounded' }))).toBe('Rounded');
		expect(styleSummary(style({ look: 'custom', dot: 'rounded', cornerDot: 'dot' }))).toBe('Rounded · Corners');
		expect(styleSummary(style({ look: 'custom', cornerSquare: 'dot' }))).toBe('Corners');
	});

	it('says Colour for a code colour, a corner colour, or a background, but not a background behind Transparent', () => {
		expect(styleSummary(style({ fg: '#14275a' }))).toBe('Colour');
		expect(styleSummary(style({ cornerColor: '#000000' }))).toBe('Colour');
		expect(styleSummary(style({ bg: '#fff8e0' }))).toBe('Colour');
		expect(styleSummary(style({ bg: '#fff8e0', transparentBg: true }))).toBe('Transparent');
	});

	it('names Gradient, Transparent, and Frame, in order, joined with a middle dot', () => {
		expect(styleSummary(style({ look: 'soft', gradient: 'linear', fg: '#14275a', transparentBg: true, frameEnabled: true }))).toBe(
			'Soft · Gradient · Colour · Transparent · Frame'
		);
	});

	it('does not say the group is off; the tabs do that', () => {
		expect(styleSummary(style({ frameEnabled: true }))).not.toMatch(/off/i);
	});
});

describe('logoSummary', () => {
	it('is empty without a logo, whatever else is set', () => {
		expect(logoSummary(logo({ logo: undefined, logoKnockout: false, logoCropW: 0.5 }))).toBe('');
	});

	it('is just the name for a plain logo', () => {
		expect(logoSummary(logo())).toBe('mark.png');
	});

	it('says cropped when the crop is not the whole picture', () => {
		expect(logoSummary(logo({ logoCropW: 0.5 }))).toBe('mark.png · cropped');
		expect(logoSummary(logo({ logoCropX: 0.25, logoCropW: 0.5, logoCropH: 0.5 }))).toBe('mark.png · cropped');
	});

	it('reads a nonsense crop as the whole picture', () => {
		expect(logoSummary(logo({ logoCropW: Number.NaN }))).toBe('mark.png');
		expect(logoSummary(logo({ logoCropW: 7, logoCropH: 7 }))).toBe('mark.png');
	});

	it('says over modules when the modules are not cleared', () => {
		expect(logoSummary(logo({ logoKnockout: false }))).toBe('mark.png · over modules');
		expect(logoSummary(logo({ logoCropH: 0.5, logoKnockout: false }))).toBe('mark.png · cropped · over modules');
	});

	it('drops an empty name rather than leaving a stray separator', () => {
		expect(logoSummary(logo({ logoName: '', logoKnockout: false }))).toBe('over modules');
	});
});

describe('artisticSummary', () => {
	it('is empty without a picture, however the sliders sit', () => {
		expect(artisticSummary(art({ halftoneImage: undefined, halftoneZoom: 2, halftoneDim: 0.3 }))).toBe('');
	});

	it('is the picture and its tone otherwise', () => {
		expect(artisticSummary(art())).toBe('dog.png · Colour');
		expect(artisticSummary(art({ halftoneTone: 'grey' }))).toBe('dog.png · Black and white');
		expect(artisticSummary(art({ halftoneTone: 'silhouette' }))).toBe('dog.png · Silhouette');
	});

	it('says off when the blend is off, without a prefix', () => {
		expect(artisticSummary(art({ halftone: false }))).toBe('dog.png · off');
	});

	it('says cropped for a zoom or either offset', () => {
		expect(artisticSummary(art({ halftoneZoom: 1.5 }))).toBe('dog.png · Colour · cropped');
		expect(artisticSummary(art({ halftoneOffsetX: -0.1 }))).toBe('dog.png · Colour · cropped');
		expect(artisticSummary(art({ halftoneOffsetY: 0.1 }))).toBe('dog.png · Colour · cropped');
	});

	it('says the Cut as a percentage, only for a silhouette off its default', () => {
		expect(artisticSummary(art({ halftoneTone: 'silhouette', halftoneThreshold: 0.62 }))).toBe('dog.png · Silhouette · Cut 62%');
		expect(artisticSummary(art({ halftoneTone: 'silhouette', halftoneThreshold: THRESHOLD_DEFAULT }))).toBe('dog.png · Silhouette');
		expect(artisticSummary(art({ halftoneTone: 'colour', halftoneThreshold: 0.62 }))).toBe('dog.png · Colour');
		// As with the shape colour, only while the blend is on.
		expect(artisticSummary(art({ halftone: false, halftoneTone: 'silhouette', halftoneThreshold: 0.62 }))).toBe('dog.png · off');
	});

	it('says Shape colour only for a silhouette that is on and off black', () => {
		expect(artisticSummary(art({ halftoneTone: 'silhouette', shapeColor: '#14275a' }))).toBe('dog.png · Silhouette · Shape colour');
		expect(artisticSummary(art({ halftoneTone: 'colour', shapeColor: '#14275a' }))).toBe('dog.png · Colour');
		expect(artisticSummary(art({ halftone: false, halftoneTone: 'silhouette', shapeColor: '#14275a' }))).toBe('dog.png · off');
	});

	it('says tuned for dot size, fade, or contrast off its default', () => {
		expect(artisticSummary(art({ halftoneDotScale: 0.5 }))).toBe('dog.png · Colour · tuned');
		expect(artisticSummary(art({ halftoneDim: 0.2 }))).toBe('dog.png · Colour · tuned');
		expect(artisticSummary(art({ halftoneContrast: 1.2 }))).toBe('dog.png · Colour · tuned');
	});

	it('names everything that is set, in order', () => {
		expect(
			artisticSummary(
				art({
					halftoneTone: 'silhouette',
					halftoneZoom: 2,
					halftoneThreshold: 0.3,
					shapeColor: '#14275a',
					halftoneDim: 0.1
				})
			)
		).toBe('dog.png · Silhouette · cropped · Cut 30% · Shape colour · tuned');
	});
});
