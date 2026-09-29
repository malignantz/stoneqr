import { describe, expect, it } from 'vitest';
import { contrastRatio, isInverted, isReddish, paperColor } from '@stoneqr/engine';
import { LOOKS } from '$lib/looks';
import { weakestForeground } from '$lib/generator/contrast';
import { DEFAULT_FRAME_TEXT, TEMPLATES, applyTemplate, templateFor, type TemplateFields } from '$lib/templates';

/** A design as it opens, as a plain object so no runes are needed. */
function defaults(): TemplateFields {
	return {
		dot: 'square',
		cornerSquare: 'square',
		cornerDot: 'square',
		fg: '#000000',
		bg: '#ffffff',
		cornerColor: null,
		transparentBg: false,
		gradient: 'none',
		frameEnabled: false,
		frameText: DEFAULT_FRAME_TEXT,
		frameColor: '#000000',
		frameTextColor: '#ffffff'
	};
}

const byId = (id: string) => TEMPLATES.find((t) => t.id === id)!;

describe('templates', () => {
	it('offers six, starting from plain', () => {
		expect(TEMPLATES.map((t) => t.name)).toEqual([
			'Plain',
			'Navy rounded',
			'Forest dots with copper corners',
			'Slate leaf',
			'Plum soft',
			'Boxed: black with a call-to-action frame'
		]);
		expect(TEMPLATES[0]).toMatchObject({ id: 'plain', look: 'classic', fg: '#000000', bg: '#ffffff', cornerColor: null, frameEnabled: false });
	});

	it('has unique ids, names, and captions', () => {
		for (const key of ['id', 'name', 'label'] as const) expect(new Set(TEMPLATES.map((t) => t[key])).size).toBe(TEMPLATES.length);
	});

	it('uses real looks and six-digit lower-case hex', () => {
		for (const t of TEMPLATES) {
			expect(LOOKS.some((l) => l.id === t.look), t.id).toBe(true);
			for (const c of [t.fg, t.bg, t.cornerColor, t.frameColor, t.frameTextColor]) if (c) expect(c, t.id).toMatch(/^#[0-9a-f]{6}$/);
		}
	});

	it('gives a frame its colours exactly when it has a frame', () => {
		for (const t of TEMPLATES) {
			expect(t.frameColor !== undefined, t.id).toBe(t.frameEnabled);
			expect(t.frameTextColor !== undefined, t.id).toBe(t.frameEnabled);
		}
	});

	it('is dark enough on its paper, never reddish, never inverted', () => {
		for (const t of TEMPLATES) {
			const weakest = weakestForeground(t.fg, t.cornerColor, t.bg);
			expect(contrastRatio(weakest, paperColor(t.bg)), t.id).toBeGreaterThanOrEqual(4.5);
			for (const c of [t.fg, t.cornerColor ?? t.fg]) {
				expect(isReddish(c), `${t.id} ${c}`).toBe(false);
				expect(isInverted(c, t.bg), `${t.id} ${c}`).toBe(false);
			}
		}
	});

	it('keeps a frame legible: its words against its band', () => {
		for (const t of TEMPLATES.filter((x) => x.frameEnabled)) expect(contrastRatio(t.frameTextColor!, t.frameColor!), t.id).toBeGreaterThanOrEqual(4.5);
	});

	it('is matched from what applying it sets', () => {
		for (const t of TEMPLATES) {
			const d = defaults();
			applyTemplate(d, t);
			expect(templateFor(d)?.id, t.id).toBe(t.id);
		}
	});

	it('finds plain in a design that has never been touched', () => {
		expect(templateFor(defaults())?.id).toBe('plain');
	});

	it('matches whichever template was applied last, whatever the design held before', () => {
		const d: TemplateFields = { ...defaults(), fg: '#ff00aa', gradient: 'linear', transparentBg: true, cornerColor: '#123456', frameEnabled: true };
		for (const t of TEMPLATES) {
			applyTemplate(d, t);
			expect(templateFor(d)?.id, t.id).toBe(t.id);
		}
	});

	it('switches a frame on, then off again with the next template', () => {
		const d = defaults();
		applyTemplate(d, byId('boxed'));
		expect(d).toMatchObject({ frameEnabled: true, frameColor: '#000000', frameTextColor: '#ffffff' });
		applyTemplate(d, byId('plain'));
		expect(d.frameEnabled).toBe(false);
	});

	it('drops a gradient and a transparent background, which a tile cannot show', () => {
		const d: TemplateFields = { ...defaults(), gradient: 'radial', transparentBg: true };
		applyTemplate(d, byId('navy-rounded'));
		expect(d).toMatchObject({ gradient: 'none', transparentBg: false });
	});

	it('clears a corner colour a template does not own, and sets one it does', () => {
		const d: TemplateFields = { ...defaults(), cornerColor: '#123456' };
		applyTemplate(d, byId('slate-leaf'));
		expect(d.cornerColor).toBeNull();
		applyTemplate(d, byId('forest-dots'));
		expect(d.cornerColor).toBe('#8a4b1f');
	});

	it('keeps frame words someone typed, and matches all the same', () => {
		const d: TemplateFields = { ...defaults(), frameText: 'Scan for the menu' };
		applyTemplate(d, byId('boxed'));
		expect(d.frameText).toBe('Scan for the menu');
		expect(templateFor(d)?.id).toBe('boxed');
	});

	it('writes the template\'s words only over the default ones', () => {
		const t = { ...byId('boxed'), frameText: 'Scan to join' };
		const fresh = defaults();
		applyTemplate(fresh, t);
		expect(fresh.frameText).toBe('Scan to join');
		const typed: TemplateFields = { ...defaults(), frameText: 'Scan for the menu' };
		applyTemplate(typed, t);
		expect(typed.frameText).toBe('Scan for the menu');
	});

	it('matches hex without regard to case', () => {
		const d = defaults();
		applyTemplate(d, byId('forest-dots'));
		d.fg = d.fg.toUpperCase();
		d.bg = d.bg.toUpperCase();
		d.cornerColor = d.cornerColor!.toUpperCase();
		expect(templateFor(d)?.id).toBe('forest-dots');
	});

	it('ignores frame colours when the template has no frame', () => {
		const d = defaults();
		applyTemplate(d, byId('navy-rounded'));
		d.frameColor = '#abcdef';
		d.frameTextColor = '#123456';
		d.frameText = 'anything';
		expect(templateFor(d)?.id).toBe('navy-rounded');
	});

	it('matches nothing once any owned field is changed by hand', () => {
		const set = (id: string, change: Partial<TemplateFields>) => {
			const d = defaults();
			applyTemplate(d, byId(id));
			return templateFor({ ...d, ...change });
		};
		expect(set('navy-rounded', { fg: '#14275b' })).toBeNull();
		expect(set('navy-rounded', { bg: '#fefefe' })).toBeNull();
		expect(set('navy-rounded', { cornerColor: '#14275a' })).toBeNull();
		expect(set('navy-rounded', { dot: 'dots' })).toBeNull();
		expect(set('navy-rounded', { cornerDot: 'dot' })).toBeNull();
		expect(set('navy-rounded', { frameEnabled: true })).toBeNull();
		expect(set('navy-rounded', { gradient: 'linear' })).toBeNull();
		expect(set('navy-rounded', { transparentBg: true })).toBeNull();
		expect(set('forest-dots', { cornerColor: null })).toBeNull();
		expect(set('boxed', { frameColor: '#111111' })).toBeNull();
		expect(set('boxed', { frameTextColor: '#eeeeee' })).toBeNull();
		expect(set('boxed', { frameEnabled: false })?.id).toBe('plain');
	});
});
