import { describe, expect, it } from 'vitest';
import { encode, rasterize, verifyRaster } from '../src/index.js';
import {
	PAYLOAD_TYPES,
	PayloadError,
	escapeIcs,
	escapeMecard,
	escapeVcardText,
	escapeWifi,
	geo,
	isLikelyUrl,
	mailto,
	mecard,
	normalisePhone,
	payloads,
	sms,
	tel,
	text,
	url,
	vcard,
	vevent,
	wifi,
	wifiWarnings
} from '../src/payloads/index.js';

const CRLF = '\r\n';

describe('url', () => {
	it('adds https:// when the scheme is missing and keeps the text as typed', () => {
		expect(url('stoneqr.app')).toBe('https://stoneqr.app');
		expect(url('  stoneqr.app/pricing?x=1  ')).toBe('https://stoneqr.app/pricing?x=1');
	});
	it('keeps an existing scheme', () => {
		expect(url('http://example.com/a')).toBe('http://example.com/a');
		expect(url('mailto:a@b.com')).toBe('mailto:a@b.com');
	});
	it('throws a friendly PayloadError on nonsense', () => {
		expect(() => url('')).toThrow(PayloadError);
		expect(() => url('not a url')).toThrow(/does not look like a web address/);
		expect(() => url('https://')).toThrow(PayloadError);
	});
	it('isLikelyUrl spots hosts and full URLs', () => {
		expect(isLikelyUrl('stoneqr.app')).toBe(true);
		expect(isLikelyUrl('https://stoneqr.app/a?b=c')).toBe(true);
		expect(isLikelyUrl('example.com:8080/x')).toBe(true);
		expect(isLikelyUrl('hello world')).toBe(false);
		expect(isLikelyUrl('')).toBe(false);
		expect(isLikelyUrl('Sean Owen')).toBe(false);
	});
});

describe('text', () => {
	it('trims trailing whitespace only', () => {
		expect(text('  hello  \n\t')).toBe('  hello');
		expect(text('plain')).toBe('plain');
	});
});

describe('wifi', () => {
	it('matches the ZXing example', () => {
		expect(wifi({ ssid: 'mynetwork', password: 'mypass', auth: 'WPA' })).toBe('WIFI:T:WPA;S:mynetwork;P:mypass;;');
	});
	it('omits the password for an open network', () => {
		expect(wifi({ ssid: 'Guest', auth: 'nopass', password: 'ignored' })).toBe('WIFI:T:nopass;S:Guest;;');
	});
	it('adds H:true only when hidden', () => {
		expect(wifi({ ssid: 'Guest', password: 'p', auth: 'WPA', hidden: true })).toBe('WIFI:T:WPA;S:Guest;P:p;H:true;;');
		expect(wifi({ ssid: 'Guest', password: 'p', auth: 'WPA', hidden: false })).toBe('WIFI:T:WPA;S:Guest;P:p;;');
	});
	it('escapes backslash first, then ; , " :', () => {
		expect(escapeWifi('a\\b;c"d:e,f')).toBe('a\\\\b\\;c\\"d\\:e\\,f');
		expect(wifi({ ssid: 'Bar;1\\2"3', password: 'p:w,d', auth: 'WPA' })).toBe(
			'WIFI:T:WPA;S:Bar\\;1\\\\2\\"3;P:p\\:w\\,d;;'
		);
	});
	it('validates the SSID length in UTF-8 bytes', () => {
		expect(() => wifi({ ssid: '', auth: 'nopass' })).toThrow(PayloadError);
		expect(() => wifi({ ssid: 'x'.repeat(33), auth: 'nopass' })).toThrow(/32 bytes/);
		// 11 emoji = 44 bytes, well under 33 characters.
		expect(() => wifi({ ssid: '🎈'.repeat(11), auth: 'nopass' })).toThrow(/44/);
		expect(wifi({ ssid: 'x'.repeat(32), auth: 'nopass' })).toContain('S:' + 'x'.repeat(32));
	});
	it('warns about non-ASCII names, WEP, and a missing password', () => {
		expect(wifiWarnings({ ssid: 'Office', password: 'secret', auth: 'WPA' })).toEqual([]);
		const codes = (w: { code: string }[]) => w.map((x) => x.code);
		expect(codes(wifiWarnings({ ssid: 'Café', password: 'secret', auth: 'WPA' }))).toContain('wifi-ssid-non-ascii');
		expect(codes(wifiWarnings({ ssid: 'Office', password: 'sécret', auth: 'WPA' }))).toContain(
			'wifi-password-non-ascii'
		);
		expect(codes(wifiWarnings({ ssid: 'Office', password: 'secret', auth: 'WEP' }))).toContain('wifi-wep');
		expect(codes(wifiWarnings({ ssid: 'Office', auth: 'WPA' }))).toContain('wifi-no-password');
		expect(wifiWarnings({ ssid: 'Café', password: 'secret', auth: 'WEP' })[0]!.level).toBe('warn');
	});
});

const CONTACT = {
	firstName: 'Sean',
	lastName: 'Owen',
	org: 'ZXing',
	title: 'Engineer',
	mobile: '+12125551212',
	work: '+12125551213',
	email: 'srowen@example.org',
	url: 'https://zxing.org',
	street: '1 Main St',
	city: 'Springfield',
	region: 'IL',
	postal: '62701',
	country: 'USA',
	note: 'Met at the conference'
};

describe('vcard', () => {
	it('emits vCard 3.0 with CRLF endings', () => {
		expect(vcard(CONTACT)).toBe(
			[
				'BEGIN:VCARD',
				'VERSION:3.0',
				'N:Owen;Sean;;;',
				'FN:Sean Owen',
				'ORG:ZXing',
				'TITLE:Engineer',
				'TEL;TYPE=CELL:+12125551212',
				'TEL;TYPE=WORK:+12125551213',
				'EMAIL:srowen@example.org',
				'URL:https://zxing.org',
				'ADR;TYPE=WORK:;;1 Main St;Springfield;IL;62701;USA',
				'NOTE:Met at the conference',
				'END:VCARD'
			].join(CRLF)
		);
	});
	it('omits empty lines and the address block', () => {
		expect(vcard({ firstName: 'Sean' })).toBe(['BEGIN:VCARD', 'VERSION:3.0', 'N:;Sean;;;', 'FN:Sean', 'END:VCARD'].join(CRLF));
		expect(vcard({ lastName: 'Owen' })).toContain('FN:Owen');
	});
	it('has no bare LF and no trailing whitespace', () => {
		const out = vcard(CONTACT);
		expect(out.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
		expect(out).not.toMatch(/\s$/);
		expect(out).not.toMatch(/[ \t]\r\n/);
		expect(out.endsWith('END:VCARD')).toBe(true);
	});
	it('escapes \\ ; , and newlines per RFC 2426', () => {
		expect(escapeVcardText('a\\b;c,d\ne')).toBe('a\\\\b\\;c\\,d\\ne');
		expect(vcard({ firstName: 'A;B', lastName: 'C,D', note: 'one\ntwo' })).toContain('N:C\\,D;A\\;B;;;');
		expect(vcard({ firstName: 'X', note: 'one\r\ntwo' })).toContain('NOTE:one\\ntwo');
	});
	it('requires a name', () => {
		expect(() => vcard({ org: 'ZXing' })).toThrow(/first or last name/);
	});
});

describe('mecard', () => {
	it('matches the ZXing example', () => {
		expect(mecard({ firstName: 'Sean', lastName: 'Owen', mobile: '+12125551212', email: 'srowen@example.org' })).toBe(
			'MECARD:N:Owen,Sean;TEL:+12125551212;EMAIL:srowen@example.org;;'
		);
	});
	it('carries the fields it can and escapes \\ ; , :', () => {
		expect(escapeMecard('a\\b;c,d:e')).toBe('a\\\\b\\;c\\,d\\:e');
		expect(mecard(CONTACT)).toBe(
			'MECARD:N:Owen,Sean;ORG:ZXing;TEL:+12125551212;TEL:+12125551213;EMAIL:srowen@example.org;' +
				'URL:https\\://zxing.org;ADR:,,1 Main St,Springfield,IL,62701,USA;NOTE:Met at the conference;;'
		);
	});
	it('is smaller than the same vCard', () => {
		expect(mecard(CONTACT).length).toBeLessThan(vcard(CONTACT).length);
	});
	it('requires a name', () => {
		expect(() => mecard({ email: 'a@b.com' })).toThrow(PayloadError);
	});
});

describe('mailto', () => {
	it('encodes subject and body but leaves the address readable', () => {
		expect(mailto({ to: 'srowen@example.org' })).toBe('mailto:srowen@example.org');
		expect(mailto({ to: 'srowen@example.org', subject: 'Hi there', body: 'Line one & two' })).toBe(
			'mailto:srowen@example.org?subject=Hi%20there&body=Line%20one%20%26%20two'
		);
	});
	it('supports several recipients', () => {
		expect(mailto({ to: 'a@b.com, c@d.org', subject: 'Hi' })).toBe('mailto:a@b.com,c@d.org?subject=Hi');
	});
	it('validates the address shape', () => {
		expect(() => mailto({ to: '' })).toThrow(PayloadError);
		expect(() => mailto({ to: 'not-an-email' })).toThrow(/not a valid email address/);
		expect(() => mailto({ to: 'a@b.com,broken@' })).toThrow(/broken@/);
	});
});

describe('sms and tel', () => {
	it('normalises the number', () => {
		expect(normalisePhone('+1 (555) 555-0100')).toBe('+15555550100');
		expect(normalisePhone(' 555.555.0100 ')).toBe('5555550100');
		expect(tel('+1 (555) 555-0100')).toBe('tel:+15555550100');
	});
	it('uses ?body= for the sms scheme and a colon for SMSTO', () => {
		expect(sms({ to: '+1 (555) 555-0100', body: 'Hi there' })).toBe('sms:+15555550100?body=Hi%20there');
		expect(sms({ to: '+1 555 555 0100' })).toBe('sms:+15555550100');
		expect(sms({ to: '+15555550100', body: 'Hi there', scheme: 'smsto' })).toBe('SMSTO:+15555550100:Hi there');
		expect(sms({ to: '+15555550100', scheme: 'smsto' })).toBe('SMSTO:+15555550100');
	});
	it('throws when nothing numeric is left', () => {
		expect(() => tel('call me')).toThrow(PayloadError);
		expect(() => sms({ to: '--' })).toThrow(PayloadError);
	});
});

describe('geo', () => {
	it('rounds to six decimals and drops trailing zeros', () => {
		expect(geo({ lat: 37.1234567, lng: -122.5 })).toBe('geo:37.123457,-122.5');
		expect(geo({ lat: 0, lng: 0 })).toBe('geo:0,0');
		expect(geo({ lat: 51.5, lng: -0.12 })).toBe('geo:51.5,-0.12');
	});
	it('adds an encoded ?q= label', () => {
		expect(geo({ lat: 51.5, lng: -0.12, query: 'Big Ben' })).toBe('geo:51.5,-0.12?q=Big%20Ben');
	});
	it('validates ranges', () => {
		expect(() => geo({ lat: 91, lng: 0 })).toThrow(/latitude/);
		expect(() => geo({ lat: 0, lng: -181 })).toThrow(/longitude/);
		expect(() => geo({ lat: Number.NaN, lng: 0 })).toThrow(PayloadError);
	});
});

const EVENT_START = new Date(Date.UTC(2026, 5, 1, 14, 0, 0));

describe('vevent', () => {
	it('writes a UTC VEVENT with a default one-hour duration', () => {
		expect(vevent({ summary: 'Board meeting', start: EVENT_START, location: 'Room 2' })).toBe(
			[
				'BEGIN:VCALENDAR',
				'VERSION:2.0',
				'PRODID:-//StoneQR//EN',
				'BEGIN:VEVENT',
				'UID:f0486c6bbd3a0d1d@stoneqr.app',
				'DTSTAMP:20260601T140000Z',
				'SUMMARY:Board meeting',
				'DTSTART:20260601T140000Z',
				'DTEND:20260601T150000Z',
				'LOCATION:Room 2',
				'END:VEVENT',
				'END:VCALENDAR'
			].join(CRLF)
		);
	});
	it('writes DATE values for an all-day event with an exclusive DTEND', () => {
		const out = vevent({ summary: 'Offsite', start: new Date(Date.UTC(2026, 5, 1)), allDay: true });
		expect(out).toContain('DTSTART;VALUE=DATE:20260601');
		expect(out).toContain('DTEND;VALUE=DATE:20260602');
		const twoDays = vevent({
			summary: 'Offsite',
			start: new Date(Date.UTC(2026, 5, 1)),
			end: new Date(Date.UTC(2026, 5, 2)),
			allDay: true
		});
		expect(twoDays).toContain('DTEND;VALUE=DATE:20260603');
	});
	it('is deterministic: same input, same UID and DTSTAMP', () => {
		const a = vevent({ summary: 'Board meeting', start: EVENT_START, location: 'Room 2' });
		const b = vevent({ summary: 'Board meeting', start: new Date(EVENT_START.getTime()), location: 'Room 2' });
		expect(a).toBe(b);
		expect(a).toMatch(/^UID:[0-9a-f]{16}@stoneqr\.app$/m);
		const c = vevent({ summary: 'Board meeting!', start: EVENT_START, location: 'Room 2' });
		expect(c).not.toBe(a);
	});
	it('escapes text per RFC 5545 and does not escape the colon', () => {
		expect(escapeIcs('a\\b;c,d\ne')).toBe('a\\\\b\\;c\\,d\\ne');
		expect(vevent({ summary: 'Lunch, then talk; 12:00', start: EVENT_START })).toContain(
			'SUMMARY:Lunch\\, then talk\\; 12:00'
		);
	});
	it('folds long lines at 75 octets with CRLF + space', () => {
		const description = 'Agenda item number one and then some. '.repeat(6);
		const out = vevent({ summary: 'Board meeting', start: EVENT_START, description });
		const enc = new TextEncoder();
		expect(out).toContain(CRLF + ' ');
		for (const line of out.split(CRLF)) expect(enc.encode(line).length).toBeLessThanOrEqual(75);
		// Unfolding restores the original value.
		const unfolded = out.split(CRLF + ' ').join('');
		expect(unfolded).toContain(`DESCRIPTION:${escapeIcs(description.replace(/\s+$/, ''))}`);
	});
	it('rejects impossible dates', () => {
		expect(() => vevent({ summary: '', start: EVENT_START })).toThrow(/title/);
		expect(() => vevent({ summary: 'x', start: new Date('nope') })).toThrow(PayloadError);
		expect(() => vevent({ summary: 'x', start: EVENT_START, end: new Date(EVENT_START.getTime() - 1) })).toThrow(
			/ends before it starts/
		);
	});
});

describe('registry', () => {
	it('lists the ten types in selector order', () => {
		expect(PAYLOAD_TYPES.map((t) => t.id)).toEqual([
			'url',
			'text',
			'wifi',
			'vcard',
			'mecard',
			'email',
			'sms',
			'tel',
			'geo',
			'event'
		]);
		expect(PAYLOAD_TYPES.map((t) => t.label)).toEqual([
			'URL',
			'Text',
			'WiFi',
			'vCard',
			'MeCard',
			'Email',
			'SMS',
			'Phone',
			'Location',
			'Calendar event'
		]);
		for (const t of PAYLOAD_TYPES) expect(t.description.length).toBeGreaterThan(0);
	});
	it('exposes every encoder on the namespace object', () => {
		expect(Object.keys(payloads).sort()).toEqual(
			['geo', 'mailto', 'mecard', 'sms', 'tel', 'text', 'url', 'vcard', 'vevent', 'wifi'].sort()
		);
		expect(payloads.url('stoneqr.app')).toBe('https://stoneqr.app');
	});
});

describe('round trip through the encoder and decoder', () => {
	const fixtures: [string, string][] = [
		['url', url('stoneqr.app/pricing')],
		['text', text('Coffee is at 3pm in the kitchen.')],
		['wifi', wifi({ ssid: 'Guest;WiFi', password: 'p\\ss,word', auth: 'WPA', hidden: true })],
		['vcard', vcard(CONTACT)],
		['mecard', mecard(CONTACT)],
		['email', mailto({ to: 'srowen@example.org', subject: 'RSVP', body: 'Yes, I can make it.' })],
		['sms', sms({ to: '+1 (555) 555-0100', body: 'On my way' })],
		['smsto', sms({ to: '+1 (555) 555-0100', body: 'On my way', scheme: 'smsto' })],
		['tel', tel('+1 555 555 0100')],
		['geo', geo({ lat: 51.500729, lng: -0.124625, query: 'Big Ben' })],
		[
			'event',
			vevent({
				summary: 'Board meeting',
				start: EVENT_START,
				location: 'Room 2, second floor',
				description: 'Agenda item number one and then some more words to force a fold.'
			})
		]
	];

	for (const [name, payload] of fixtures) {
		it(`decodes back to the exact ${name} payload`, () => {
			const qr = encode(payload, { ecc: 'M' });
			const img = rasterize(qr, { pxPerModule: 8 });
			expect(verifyRaster(img, payload)).toEqual({ ok: true, decoded: payload });
		});
	}
});
