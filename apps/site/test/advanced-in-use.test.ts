import { describe, expect, it } from 'vitest';
import { TEMPLATES, applyTemplate, cornerColourIsAdvanced, type TemplateFields } from '../src/lib/templates';

/**
 * `Design.advancedInUse` reports "corner colour" through `cornerColourIsAdvanced`: a corner colour
 * that Basic set through a template tile is not Advanced's alone, so Basic's notice stays quiet.
 */
const plain = (): TemplateFields => ({
	dot: 'square',
	cornerSquare: 'square',
	cornerDot: 'square',
	fg: '#000000',
	bg: '#ffffff',
	cornerColor: null,
	gradient: 'none',
	transparentBg: false,
	frameEnabled: false,
	frameText: 'Scan me',
	frameColor: '#000000',
	frameTextColor: '#ffffff'
} as TemplateFields);

describe('cornerColourIsAdvanced', () => {
	const withCorners = TEMPLATES.find((t) => t.cornerColor !== null)!;

	it('is false for the corner colour a template set in Basic', () => {
		const d = plain();
		applyTemplate(d, withCorners);
		expect(d.cornerColor).not.toBeNull();
		expect(cornerColourIsAdvanced(d)).toBe(false);
	});

	it('is true for a corner colour that matches no template', () => {
		const d = plain();
		d.cornerColor = '#1f6f63';
		expect(cornerColourIsAdvanced(d)).toBe(true);
	});

	it('is true again once a template design is changed by hand', () => {
		const d = plain();
		applyTemplate(d, withCorners);
		d.cornerColor = '#123456';
		expect(cornerColourIsAdvanced(d)).toBe(true);
	});

	it('is false with no corner colour at all', () => {
		expect(cornerColourIsAdvanced(plain())).toBe(false);
	});
});
