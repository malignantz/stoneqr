/**
 * The Basic control set's size tiers (plan §10). Each tier is a print width for the code
 * itself, described by where it gets used and how far away a phone can read it. The distance
 * comes from the engine's 10:1 rule so the copy can never drift from the sizing panel.
 */
import { moduleMm, maxScanDistanceM, MODULE_MM_GOOD, MODULE_MM_WARN } from '@stoneqr/engine';

export interface SizeTier {
	id: 'small' | 'medium' | 'large' | 'xl';
	name: string;
	/** Print width of the code, quiet zone included, in mm. */
	mm: number;
	/** Where a code this size usually ends up. */
	uses: string;
	/** How the reader holds the phone. Leads into the distance figure. */
	reads: string;
}

export const SIZE_TIERS: readonly SizeTier[] = [
	{ id: 'small', name: 'Small', mm: 25, uses: 'Business cards, stickers, product labels.', reads: 'Read in the hand' },
	{ id: 'medium', name: 'Medium', mm: 50, uses: 'Flyers, menus, table tents, handouts.', reads: 'Read across a table' },
	{ id: 'large', name: 'Large', mm: 100, uses: 'Posters, door and counter signs.', reads: 'Read from a few steps back' },
	{ id: 'xl', name: 'Extra large', mm: 300, uses: 'Banners, storefront and lobby signs.', reads: 'Read from across a room' }
];

/** The tier whose width matches `widthMm`, or null when the width was set by hand. */
export function tierFor(widthMm: number): SizeTier | null {
	return SIZE_TIERS.find((t) => Math.abs(t.mm - widthMm) < 0.01) ?? null;
}

export type TierFit = 'good' | 'tight' | 'small';

/** Whether this much content still prints with readable modules at the tier's width. */
export function tierFit(mm: number, size: number, quiet: number): TierFit {
	const m = moduleMm(mm, size, quiet);
	return m >= MODULE_MM_GOOD ? 'good' : m >= MODULE_MM_WARN ? 'tight' : 'small';
}

/**
 * Inches without a trailing ".0". Tiers round to the nearest half so 25 mm reads "1" and
 * 300 mm reads "12"; pass `precise` for a hand-set width, where 30 mm should read "1.2".
 */
export function formatIn(mm: number, precise = false): string {
	const inches = precise ? Math.round(mm / 2.54) / 10 : Math.round((mm / 25.4) * 2) / 2;
	return Number.isInteger(inches) ? String(inches) : inches.toFixed(1);
}

/**
 * A reading distance in both systems, rounded the way people say it:
 * under a metre in cm and inches, otherwise in metres and feet.
 */
export function formatDistance(m: number): string {
	if (m < 1) return `${Math.round(m * 100)} cm (${Math.round(m * 39.37)} in)`;
	const metres = Number.isInteger(m) ? String(m) : m.toFixed(1);
	return `${metres} m (${Math.round(m * 3.281)} ft)`;
}

/** "Read across a table, up to about 50 cm (20 in)" for a tier. */
export function tierDistance(t: SizeTier): string {
	return `${t.reads}, up to about ${formatDistance(maxScanDistanceM(t.mm))}`;
}
