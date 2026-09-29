import { describe, expect, it } from 'vitest';
import { splitLink } from '$lib/links';

describe('splitLink: the host', () => {
	it('splits an ordinary https address', () => {
		expect(splitLink('https://example.com/menu')).toEqual({
			scheme: 'https://',
			userinfo: '',
			host: 'example.com',
			port: '',
			rest: '/menu',
			nonLatin: false
		});
	});
	it('keeps www. as part of the host', () => {
		expect(splitLink('https://www.example.com/a')).toMatchObject({ host: 'www.example.com', rest: '/a' });
	});
	it('reads http as well', () => {
		expect(splitLink('http://example.com/')).toMatchObject({ scheme: 'http://', host: 'example.com' });
	});
	it('lower-cases the host but leaves the scheme and the rest as written', () => {
		expect(splitLink('HTTPS://Example.COM/Path?Q=A')).toMatchObject({ scheme: 'HTTPS://', host: 'example.com', rest: '/Path?Q=A' });
	});
	it('handles a missing path', () => {
		expect(splitLink('https://example.com')).toMatchObject({ host: 'example.com', rest: '' });
	});
	it('starts the rest at a query or a fragment when there is no path', () => {
		expect(splitLink('https://example.com?x=1')).toMatchObject({ host: 'example.com', rest: '?x=1' });
		expect(splitLink('https://example.com#top')).toMatchObject({ host: 'example.com', rest: '#top' });
	});
	it('keeps the path, query, and fragment together as written', () => {
		expect(splitLink('https://example.com/a/b?c=d&e=f#g')).toMatchObject({ host: 'example.com', rest: '/a/b?c=d&e=f#g' });
	});
	it('does not take an @ in the path or query for user info', () => {
		expect(splitLink('https://example.com/@user?mail=a@b.example')).toMatchObject({ userinfo: '', host: 'example.com', rest: '/@user?mail=a@b.example' });
	});
});

describe('splitLink: user info', () => {
	it('names the host after the @, not the name before it', () => {
		expect(splitLink('https://paypal.com@evil.example/x')).toMatchObject({ userinfo: 'paypal.com', host: 'evil.example', rest: '/x' });
	});
	it('takes user info with a password', () => {
		expect(splitLink('https://user:secret@example.com/')).toMatchObject({ userinfo: 'user:secret', host: 'example.com', port: '' });
	});
	it('uses the last @, as the browser does', () => {
		expect(splitLink('https://a@b@evil.example/')).toMatchObject({ userinfo: 'a@b', host: 'evil.example' });
	});
	it('reads extra slashes after the scheme the way a browser does', () => {
		expect(splitLink('https:///a.example/x')).toMatchObject({ scheme: 'https:///', host: 'a.example', rest: '/x' });
	});
	it('ends the authority at a backslash, as the browser does', () => {
		expect(splitLink('https://evil.example\\@paypal.com/')).toMatchObject({ userinfo: '', host: 'evil.example', rest: '\\@paypal.com/' });
	});
});

describe('splitLink: the port', () => {
	it('reads the port as written', () => {
		expect(splitLink('https://example.com:8080/a')).toMatchObject({ host: 'example.com', port: '8080', rest: '/a' });
	});
	it('keeps a default port that was written', () => {
		expect(splitLink('https://example.com:443/')).toMatchObject({ host: 'example.com', port: '443' });
	});
	it('reads a port with no path, and with user info', () => {
		expect(splitLink('http://example.com:3000')).toMatchObject({ port: '3000', rest: '' });
		expect(splitLink('https://a@example.com:81/')).toMatchObject({ userinfo: 'a', host: 'example.com', port: '81' });
	});
	it('reads an IPv6 host with and without a port', () => {
		expect(splitLink('http://[::1]:8080/')).toMatchObject({ host: '[::1]', port: '8080' });
		expect(splitLink('http://[::1]/')).toMatchObject({ host: '[::1]', port: '' });
	});
});

describe('splitLink: names in another alphabet', () => {
	it('flags a host already in xn-- form', () => {
		expect(splitLink('https://xn--pple-43d.com/')).toMatchObject({ host: 'xn--pple-43d.com', nonLatin: true });
	});
	it('turns a Unicode host into its xn-- form', () => {
		// The Cyrillic "а" in place of the Latin one.
		const parts = splitLink('https://\u0430pple.com/login');
		expect(parts).toMatchObject({ host: 'xn--pple-43d.com', nonLatin: true, rest: '/login' });
	});
	it('flags an xn-- label anywhere in the host', () => {
		expect(splitLink('https://www.xn--pple-43d.com/')?.nonLatin).toBe(true);
	});
	it('does not flag plain names, including hyphens and digits', () => {
		expect(splitLink('https://my-site2.example.com/')?.nonLatin).toBe(false);
	});
});

describe('splitLink: what is not an address', () => {
	it('returns null for plain text', () => {
		for (const t of ['', 'hello', 'example.com', 'www.example.com', 'see https://example.com now']) expect(splitLink(t)).toBeNull();
	});
	it('returns null for mailto:, WIFI:, and other schemes', () => {
		for (const t of ['mailto:a@example.com', 'WIFI:T:WPA;S:Cafe;P:latte;;', 'tel:+15551234567', 'javascript:alert(1)', 'ftp://example.com/', 'geo:1,2']) expect(splitLink(t)).toBeNull();
	});
	it('returns null when there is no host', () => {
		for (const t of ['https://', 'https:///', 'https://a b']) expect(splitLink(t)).toBeNull();
	});
	it('does not trim: the caller passes the text it means', () => {
		expect(splitLink(' https://example.com/')).toBeNull();
	});
});
