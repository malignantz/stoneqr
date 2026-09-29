import { describe, expect, it } from 'vitest';
import { REDIRECTORS, redirectorFor } from '$lib/redirectors';

describe('redirectorFor', () => {
	it('matches a listed host exactly', () => {
		expect(redirectorFor('https://bit.ly/3abcDEF')).toEqual({ host: 'bit.ly', name: 'bit.ly' });
		expect(redirectorFor('https://tinyurl.com/y2abc')?.name).toBe('TinyURL');
	});
	it('matches a subdomain of a listed host', () => {
		expect(redirectorFor('https://go.bit.ly/x')?.host).toBe('bit.ly');
		expect(redirectorFor('https://a.b.tinyurl.com/x')?.host).toBe('tinyurl.com');
	});
	it('ignores a leading www.', () => {
		expect(redirectorFor('https://www.bit.ly/x')?.host).toBe('bit.ly');
	});
	it('tolerates a missing scheme', () => {
		expect(redirectorFor('bit.ly/x')?.host).toBe('bit.ly');
		expect(redirectorFor('www.tinyurl.com')?.host).toBe('tinyurl.com');
		expect(redirectorFor('  bit.ly/x  ')?.host).toBe('bit.ly');
	});
	it('ignores case, a port, a trailing dot, and userinfo', () => {
		expect(redirectorFor('HTTPS://BIT.LY/AbC')?.host).toBe('bit.ly');
		expect(redirectorFor('https://bit.ly:443/x')?.host).toBe('bit.ly');
		expect(redirectorFor('https://bit.ly./x')?.host).toBe('bit.ly');
		expect(redirectorFor('https://user:pw@bit.ly/x')?.host).toBe('bit.ly');
	});
	it('does not match a host that only ends in the same letters', () => {
		expect(redirectorFor('https://notbit.ly/x')).toBeNull();
		expect(redirectorFor('https://bit.ly.example.com/x')).toBeNull();
		expect(redirectorFor('https://example.com/bit.ly')).toBeNull();
		expect(redirectorFor('https://example.com/?u=https://bit.ly/x')).toBeNull();
	});
	it('returns null for a host that is not a redirect service', () => {
		expect(redirectorFor('https://stoneqr.app/')).toBeNull();
		expect(redirectorFor('https://example.com/page')).toBeNull();
	});
	it('returns null, and never throws, for garbage', () => {
		for (const input of ['', '   ', 'not a url', '://', 'https://', 'http://[', '\u0000', 'javascript:alert(1)', 'a'.repeat(5000)]) {
			expect(() => redirectorFor(input)).not.toThrow();
			expect(redirectorFor(input)).toBeNull();
		}
		expect(redirectorFor(undefined as unknown as string)).toBeNull();
		expect(redirectorFor(null as unknown as string)).toBeNull();
	});
});

describe('REDIRECTORS', () => {
	it('lists each host once, lower-case, without a scheme or www', () => {
		const hosts = REDIRECTORS.map((r) => r.host);
		expect(new Set(hosts).size).toBe(hosts.length);
		for (const h of hosts) expect(h).toMatch(/^[a-z0-9]+(\.[a-z0-9-]+)+$/);
		for (const h of hosts) expect(h.startsWith('www.')).toBe(false);
	});
	it('matches every listed host', () => {
		for (const r of REDIRECTORS) expect(redirectorFor(`https://${r.host}/x`)).toEqual(r);
	});
});
