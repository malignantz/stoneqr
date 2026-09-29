import { describe, expect, it } from 'vitest';
import { classify, fieldRows, parseLink, toGenerator } from '$lib/scan/classify';
import { attemptsFor, MAX_SIDE } from '$lib/scan/read';

describe('classify', () => {
	it('reads a WiFi code into labelled rows', () => {
		const s = classify('WIFI:T:WPA;S:Cafe;P:latte;;');
		expect(s.kind).toBe('detected');
		if (s.kind !== 'detected') return;
		expect(fieldRows(s.detected)).toEqual([
			{ label: 'Network name', value: 'Cafe' },
			{ label: 'Password', value: 'latte' },
			{ label: 'Security', value: 'WPA, WPA2, or WPA3' }
		]);
		expect(toGenerator(s)).toEqual({ type: 'wifi', fields: { ssid: 'Cafe', password: 'latte', auth: 'WPA', hidden: false } });
	});
	it('treats a web address as a link and never as another type', () => {
		const s = classify('https://bit.ly/abc?x=1#top');
		expect(s.kind).toBe('link');
		expect(toGenerator(s)).toEqual({ type: 'url', fields: { url: 'https://bit.ly/abc?x=1#top' } });
	});
	it('treats anything else as text', () => {
		const s = classify('hello there');
		expect(s).toEqual({ kind: 'text', text: 'hello there' });
		expect(toGenerator(s)).toEqual({ type: 'text', fields: { text: 'hello there' } });
	});
	it('does not call a sentence that starts with a scheme a link', () => {
		expect(classify('https://example.com is nice').kind).toBe('text');
		expect(classify('ftp://example.com/file').kind).toBe('text');
	});
});

describe('parseLink', () => {
	it('splits scheme, host, and the rest as written', () => {
		expect(parseLink('https://Example.COM:8080/a/b?c=d#e')).toMatchObject({
			scheme: 'https://',
			host: 'example.com:8080',
			rest: '/a/b?c=d#e',
			userinfo: '',
			nonLatin: false
		});
	});
	it('flags a name before the @ and a non-Latin host', () => {
		expect(parseLink('https://paypal.com@evil.example/x')).toMatchObject({ host: 'evil.example', userinfo: 'paypal.com' });
		expect(parseLink('https://xn--pple-43d.com/')?.nonLatin).toBe(true);
	});
	it('returns null for things that are not addresses', () => {
		for (const t of ['', 'example.com', 'https://', 'javascript:alert(1)', 'https://a b']) expect(parseLink(t)).toBeNull();
	});
});

describe('attemptsFor', () => {
	it('never enlarges a big photo and ends with a padded try', () => {
		const a = attemptsFor(4000);
		expect(a[0]).toEqual({ side: MAX_SIDE, pad: false });
		expect(a.every((x) => x.side <= MAX_SIDE)).toBe(true);
		expect(a.at(-1)?.pad).toBe(true);
	});
	it('gives a small picture one enlarged try', () => {
		expect(attemptsFor(300).map((x) => x.side)).toContain(900);
	});
});
