/**
 * Campaign tags: `utm_source`, `utm_medium`, `utm_campaign`, added to a web address so the site's
 * own analytics can tell which poster or flyer a visit came from. Nothing here reports anything;
 * the tags are just words on the end of the address, and the site the address opens is what reads
 * them.
 *
 * Pure: no runes, no DOM, so `test/campaign.test.ts` runs without a browser. The address is edited
 * as text, not through `URL`, because `URL` normalises (a trailing slash, re-encoded characters)
 * and the design rule for links is to keep what was typed.
 */
import { encode, type Ecc } from '@stoneqr/engine';

export interface CampaignTags {
	utmSource: string;
	utmMedium: string;
	utmCampaign: string;
}

/** Field name to query name, in the order the tags are written. */
const NAMES = [
	['utmSource', 'utm_source'],
	['utmMedium', 'utm_medium'],
	['utmCampaign', 'utm_campaign']
] as const;

/** True when at least one tag has a value. */
export const hasCampaign = (t: CampaignTags): boolean => NAMES.some(([k]) => t[k].trim() !== '');

/**
 * The address with the set tags on its query, before any `#fragment`. A tag already in the address
 * is replaced where it stands (and a repeat of it dropped) rather than doubled; a tag left empty
 * adds nothing and leaves any of that name already in the address alone. Only http and https
 * addresses are touched: `?utm_source=` on a `tel:` or `ftp:` link would change what it means.
 */
export function withCampaign(address: string, tags: CampaignTags): string {
	if (!hasCampaign(tags) || !/^https?:/i.test(address)) return address;
	const hash = address.indexOf('#');
	const beforeHash = hash < 0 ? address : address.slice(0, hash);
	const fragment = hash < 0 ? '' : address.slice(hash);
	const q = beforeHash.indexOf('?');
	const path = q < 0 ? beforeHash : beforeHash.slice(0, q);
	const pairs = (q < 0 ? '' : beforeHash.slice(q + 1)).split('&').filter((p) => p !== '');

	for (const [key, name] of NAMES) {
		const value = tags[key].trim();
		if (!value) continue;
		const written = `${name}=${encodeURIComponent(value)}`;
		const isThis = (p: string) => p.split('=')[0].toLowerCase() === name;
		const first = pairs.findIndex(isThis);
		if (first < 0) {
			pairs.push(written);
			continue;
		}
		pairs[first] = written;
		for (let i = pairs.length - 1; i > first; i--) if (isThis(pairs[i])) pairs.splice(i, 1);
	}
	return `${path}?${pairs.join('&')}${fragment}`;
}

/** What the tags cost the code: characters added and the size of the symbol either side. */
export interface CampaignCost {
	chars: number;
	from: number;
	to: number;
}

/**
 * Encode the address with and without the tags at the design's error correction and minimum
 * version and compare. `minVersion` is a function of the payload because Artistic QR picks its
 * version from the text. Null when either will not encode (too long for any code, say): the
 * design's own error already says so.
 */
export function campaignCost(bare: string, tagged: string, ecc: Ecc, minVersion: (payload: string) => number): CampaignCost | null {
	try {
		const from = encode(bare, { ecc, minVersion: minVersion(bare) }).size;
		const to = encode(tagged, { ecc, minVersion: minVersion(tagged) }).size;
		return { chars: tagged.length - bare.length, from, to };
	} catch {
		return null;
	}
}

/** The sentence under the tag fields. */
export function costWords(c: CampaignCost): string {
	const size =
		c.to > c.from
			? `the code grows from ${c.from} to ${c.to} modules a side`
			: c.to < c.from
				? `the code shrinks from ${c.from} to ${c.to} modules a side`
				: `the code stays ${c.to} modules a side`;
	if (c.chars > 0) return `Adds ${c.chars} character${c.chars === 1 ? '' : 's'}; ${size}.`;
	if (c.chars === 0) return `Adds no characters; ${size}.`;
	return `Saves ${-c.chars} character${c.chars === -1 ? '' : 's'}; ${size}.`;
}
