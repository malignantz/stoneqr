import { describe, expect, it } from 'vitest';
import { contrastRatio, isReddish } from '@stoneqr/engine';
import { PALETTES, PALETTE_BG, paletteFor } from '$lib/palettes';

describe('palettes', () => {
	it('offers six', () => {
		expect(PALETTES.map((p) => p.name)).toEqual(['Black', 'Navy', 'Forest', 'Plum', 'Slate', 'Teal']);
	});

	it('has unique ids, names, and colours, all six-digit hex', () => {
		expect(new Set(PALETTES.map((p) => p.id)).size).toBe(PALETTES.length);
		expect(new Set(PALETTES.map((p) => p.name)).size).toBe(PALETTES.length);
		expect(new Set(PALETTES.map((p) => p.fg)).size).toBe(PALETTES.length);
		for (const p of PALETTES) expect(p.fg).toMatch(/^#[0-9a-f]{6}$/);
	});

	it('starts from plain black', () => {
		expect(PALETTES[0]).toMatchObject({ id: 'black', fg: '#000000' });
	});

	it('is dark against white and never reddish', () => {
		for (const p of PALETTES) {
			expect(contrastRatio(p.fg, PALETTE_BG), p.name).toBeGreaterThanOrEqual(7);
			expect(isReddish(p.fg), p.name).toBe(false);
		}
	});

	it('is matched from the colours, case-insensitively', () => {
		for (const p of PALETTES) {
			expect(paletteFor(p.fg, '#ffffff', null)).toBe(p);
			expect(paletteFor(p.fg.toUpperCase(), '#FFFFFF', null)).toBe(p);
		}
	});

	it('matches nothing once the background, the corners, or the code colour is not ours', () => {
		expect(paletteFor('#14275a', '#f5f0e6', null)).toBeNull();
		expect(paletteFor('#14275a', '#ffffff', '#14275a')).toBeNull();
		expect(paletteFor('#123456', '#ffffff', null)).toBeNull();
	});
});
