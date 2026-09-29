import { describe, expect, it } from 'vitest';
import { campaignCost, costWords, hasCampaign, withCampaign, type CampaignTags } from '$lib/generator/campaign';

const none: CampaignTags = { utmSource: '', utmMedium: '', utmCampaign: '' };
const tags = (t: Partial<CampaignTags>): CampaignTags => ({ ...none, ...t });

describe('withCampaign', () => {
	it('adds nothing when no tag is set', () => {
		expect(withCampaign('https://example.com/menu?x=1#top', none)).toBe('https://example.com/menu?x=1#top');
		expect(withCampaign('https://example.com', tags({ utmSource: '   ' }))).toBe('https://example.com');
		expect(hasCampaign(none)).toBe(false);
		expect(hasCampaign(tags({ utmMedium: 'print' }))).toBe(true);
	});
	it('starts a query on an address without one, in source, medium, campaign order', () => {
		expect(withCampaign('https://example.com/menu', tags({ utmCampaign: 'spring', utmSource: 'poster', utmMedium: 'print' }))).toBe(
			'https://example.com/menu?utm_source=poster&utm_medium=print&utm_campaign=spring'
		);
		expect(withCampaign('https://example.com', tags({ utmSource: 'flyer' }))).toBe('https://example.com?utm_source=flyer');
	});
	it('keeps the existing query and puts the tags before the fragment', () => {
		expect(withCampaign('https://example.com/p?ref=qr&x=1#section-2', tags({ utmSource: 'flyer' }))).toBe(
			'https://example.com/p?ref=qr&x=1&utm_source=flyer#section-2'
		);
		expect(withCampaign('https://example.com/#top', tags({ utmMedium: 'print' }))).toBe('https://example.com/?utm_medium=print#top');
		expect(withCampaign('https://example.com/?', tags({ utmMedium: 'print' }))).toBe('https://example.com/?utm_medium=print');
	});
	it('replaces a tag of the same name where it stands instead of doubling it', () => {
		expect(withCampaign('https://example.com/?utm_source=old&x=1', tags({ utmSource: 'new' }))).toBe('https://example.com/?utm_source=new&x=1');
		expect(withCampaign('https://example.com/?a=1&UTM_Source=old&utm_source=older', tags({ utmSource: 'new' }))).toBe(
			'https://example.com/?a=1&utm_source=new'
		);
	});
	it('leaves a tag already in the address alone when its own field is empty', () => {
		expect(withCampaign('https://example.com/?utm_source=old', tags({ utmMedium: 'print' }))).toBe('https://example.com/?utm_source=old&utm_medium=print');
	});
	it('percent-encodes the values and trims them', () => {
		expect(withCampaign('https://example.com', tags({ utmCampaign: ' Spring & Summer 50% ' }))).toBe(
			'https://example.com?utm_campaign=Spring%20%26%20Summer%2050%25'
		);
	});
	it('leaves an address that is not a web address untouched', () => {
		expect(withCampaign('tel:+15555550100', tags({ utmSource: 'x' }))).toBe('tel:+15555550100');
		expect(withCampaign('ftp://example.com/f', tags({ utmSource: 'x' }))).toBe('ftp://example.com/f');
	});
});

describe('campaignCost', () => {
	const bare = 'https://example.com/menu';
	const tagged = withCampaign(bare, tags({ utmSource: 'poster', utmMedium: 'print', utmCampaign: 'spring-2026-sale' }));
	it('counts the characters and compares the symbol sizes', () => {
		const c = campaignCost(bare, tagged, 'M', () => 1)!;
		expect(c.chars).toBe(tagged.length - bare.length);
		expect(c.from).toBeGreaterThan(0);
		expect(c.to).toBeGreaterThanOrEqual(c.from);
	});
	it('says when the code grows and when it does not', () => {
		expect(costWords({ chars: 58, from: 25, to: 29 })).toBe('Adds 58 characters; the code grows from 25 to 29 modules a side.');
		expect(costWords({ chars: 11, from: 25, to: 25 })).toBe('Adds 11 characters; the code stays 25 modules a side.');
		expect(costWords({ chars: 1, from: 21, to: 21 })).toBe('Adds 1 character; the code stays 21 modules a side.');
		expect(costWords({ chars: 0, from: 21, to: 21 })).toBe('Adds no characters; the code stays 21 modules a side.');
		expect(costWords({ chars: -4, from: 25, to: 21 })).toBe('Saves 4 characters; the code shrinks from 25 to 21 modules a side.');
		expect(costWords({ chars: -4, from: 21, to: 21 })).toBe('Saves 4 characters; the code stays 21 modules a side.');
	});
	it('is null when the text cannot be encoded', () => {
		expect(campaignCost('x'.repeat(8000), 'x'.repeat(8100), 'H', () => 1)).toBeNull();
	});
	it('holds a size fixed by the minimum version', () => {
		const c = campaignCost(bare, tagged, 'M', () => 10)!;
		expect(c.from).toBe(c.to);
	});
});
