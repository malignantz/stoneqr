import { describe, expect, it } from 'vitest';
import { SIZE_TIERS, tierFor, tierFit, tierDistance, formatIn, formatDistance } from '$lib/generator/sizes';

describe('size tiers', () => {
	it('are the four widths Basic and the Advanced chips share', () => {
		expect(SIZE_TIERS.map((t) => [t.id, t.mm])).toEqual([
			['small', 25],
			['medium', 50],
			['large', 100],
			['xl', 300]
		]);
	});

	it('each carry one lower-case word of use for the tile', () => {
		expect(SIZE_TIERS.map((t) => t.short)).toEqual(['cards', 'flyers', 'posters', 'banners']);
		for (const t of SIZE_TIERS) expect(t.short).toMatch(/^[a-z]+$/);
	});

	it('are found by width, and a hand-set width is none of them', () => {
		expect(tierFor(50)?.id).toBe('medium');
		expect(tierFor(300)?.id).toBe('xl');
		expect(tierFor(37)).toBeNull();
		expect(tierFor(NaN)).toBeNull();
	});

	it('read out as inches the way the tile prints them', () => {
		expect(SIZE_TIERS.map((t) => formatIn(t.mm))).toEqual(['1', '2', '4', '12']);
		expect(formatIn(37, true)).toBe('1.5');
		expect(formatIn(30, true)).toBe('1.2');
	});

	it('build the sentence under the tiles from the existing fields', () => {
		const medium = SIZE_TIERS[1];
		expect(`${medium.uses} ${tierDistance(medium)}.`).toBe(
			`Flyers, menus, table tents, handouts. Read across a table, up to about ${formatDistance(0.5)}.`
		);
	});

	it('grade a tier against the content it has to hold', () => {
		// A short link is 25 modules a side plus the quiet zone; a long one is far denser.
		expect(tierFit(300, 25, 4)).toBe('good');
		expect(tierFit(25, 25, 4)).toBe('good');
		expect(tierFit(25, 101, 4)).toBe('small');
	});
});
