import { describe, expect, it } from 'vitest';
import { LOOKS, lookFor } from '$lib/looks';

describe('looks', () => {
	it('starts from plain squares', () => {
		expect(LOOKS[0]).toMatchObject({ id: 'classic', dot: 'square', cornerSquare: 'square', cornerDot: 'square' });
	});

	it('has distinct ids and distinct shape combinations', () => {
		expect(new Set(LOOKS.map((l) => l.id)).size).toBe(LOOKS.length);
		expect(new Set(LOOKS.map((l) => `${l.dot}/${l.cornerSquare}/${l.cornerDot}`)).size).toBe(LOOKS.length);
	});

	it('matches every look from its own shapes', () => {
		for (const l of LOOKS) expect(lookFor(l.dot, l.cornerSquare, l.cornerDot)).toBe(l);
	});

	it('matches nothing for a hand-made combination', () => {
		expect(lookFor('dots', 'square', 'square')).toBeNull();
		expect(lookFor('square', 'square', 'dot')).toBeNull();
	});
});
