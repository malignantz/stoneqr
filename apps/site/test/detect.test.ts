import { describe, expect, it } from 'vitest';
import { payloads } from '@stoneqr/engine/payloads';
import { detect } from '$lib/generator/detect';

const CRLF = '\r\n';

describe('detect: WiFi', () => {
	it('reads the network, security, and password', () => {
		expect(detect('WIFI:T:WPA;S:Cafe;P:latte;;')).toEqual({
			type: 'wifi',
			label: 'a WiFi network',
			fields: { ssid: 'Cafe', password: 'latte', auth: 'WPA', hidden: false }
		});
	});
	it('maps the security words', () => {
		const auth = (t: string) => (detect(`WIFI:T:${t};S:x;P:y;;`) as { fields: { auth: string } }).fields.auth;
		expect(auth('WPA2')).toBe('WPA');
		expect(auth('WPA3')).toBe('WPA');
		expect(auth('SAE')).toBe('WPA');
		expect(auth('WEP')).toBe('WEP');
		expect(auth('nopass')).toBe('nopass');
	});
	it('treats a missing type as an open network and drops any password', () => {
		expect(detect('WIFI:S:Guest;P:ignored;;')).toMatchObject({ fields: { ssid: 'Guest', auth: 'nopass', password: '' } });
	});
	it('reads the hidden flag', () => {
		expect(detect('WIFI:T:WPA;S:x;P:y;H:true;;')).toMatchObject({ fields: { hidden: true } });
		expect(detect('WIFI:T:WPA;S:x;P:y;H:false;;')).toMatchObject({ fields: { hidden: false } });
	});
	it('unescapes backslash, semicolon, comma, quote, and colon', () => {
		expect(detect('WIFI:T:WPA;S:a\\;b\\:c;P:p\\\\q\\,r\\"s;;')).toMatchObject({
			fields: { ssid: 'a;b:c', password: 'p\\q,r"s' }
		});
	});
	it('is case-insensitive about the scheme and tolerates surrounding space', () => {
		expect(detect('  wifi:T:WPA;S:Cafe;P:latte;;\n')).toMatchObject({ type: 'wifi', fields: { ssid: 'Cafe' } });
	});
	it('round-trips the encoder, awkward characters included', () => {
		for (const fields of [
			{ ssid: 'Cafe', password: 'latte', auth: 'WPA' as const, hidden: false },
			{ ssid: 'Semi;colon: "quoted", back\\slash', password: 'p;a:s,s"w\\d', auth: 'WEP' as const, hidden: true },
			{ ssid: 'Guest', password: '', auth: 'nopass' as const, hidden: false }
		]) {
			expect(detect(payloads.wifi(fields))).toMatchObject({ type: 'wifi', fields });
		}
	});
});

describe('detect: contacts', () => {
	it('reads a vCard', () => {
		const text = [
			'BEGIN:VCARD', 'VERSION:3.0', 'N:Holmes;Garrett;;;', 'FN:Garrett Holmes', 'ORG:StoneQR', 'TITLE:Maker',
			'TEL;TYPE=CELL:+1 555 0100', 'TEL;TYPE=WORK:+1 555 0199', 'EMAIL:g@example.com', 'URL:https://stoneqr.app',
			'ADR;TYPE=WORK:;;1 Main St;Denver;CO;80202;USA', 'NOTE:Line one\\nLine two\\, with comma', 'END:VCARD'
		].join(CRLF);
		expect(detect(text)).toEqual({
			type: 'vcard',
			label: 'a contact card',
			fields: {
				firstName: 'Garrett', lastName: 'Holmes', org: 'StoneQR', title: 'Maker', mobile: '+1 555 0100', work: '+1 555 0199',
				email: 'g@example.com', url: 'https://stoneqr.app', street: '1 Main St', city: 'Denver', region: 'CO', postal: '80202',
				country: 'USA', note: 'Line one\nLine two, with comma'
			}
		});
	});
	it('falls back to FN and to the next free phone slot', () => {
		const text = ['BEGIN:VCARD', 'VERSION:3.0', 'FN:Ada Augusta King', 'TEL:111', 'TEL:222', 'TEL:333', 'END:VCARD'].join('\n');
		expect(detect(text)).toMatchObject({ fields: { firstName: 'Ada Augusta', lastName: 'King', mobile: '111', work: '222' } });
	});
	it('unfolds long lines', () => {
		expect(detect(`BEGIN:VCARD${CRLF}N:Long;Name;;;${CRLF}NOTE:abc${CRLF} def${CRLF}END:VCARD`)).toMatchObject({ fields: { note: 'abcdef' } });
	});
	it('round-trips the vCard encoder', () => {
		const fields = {
			firstName: 'Garrett', lastName: 'Holmes; Jr', org: 'A, B', title: 'Maker', mobile: '+15550100', work: '+15550199',
			email: 'g@example.com', url: 'https://stoneqr.app', street: '1 Main St', city: 'Denver', region: 'CO', postal: '80202',
			country: 'USA', note: 'two\nlines'
		};
		expect(detect(payloads.vcard(fields))).toMatchObject({ type: 'vcard', fields });
	});
	it('reads a MeCard, splitting Last,First', () => {
		expect(detect('MECARD:N:Owen,Sean;TEL:+12125551212;TEL:+12125550000;EMAIL:srowen@example.org;ADR:,,1 Main St,Denver,CO,80202,USA;;')).toEqual({
			type: 'mecard',
			label: 'a contact card',
			fields: {
				lastName: 'Owen', firstName: 'Sean', mobile: '+12125551212', work: '+12125550000', email: 'srowen@example.org',
				street: '1 Main St', city: 'Denver', region: 'CO', postal: '80202', country: 'USA'
			}
		});
	});
	it('round-trips the MeCard encoder, escapes included', () => {
		const fields = {
			firstName: 'Sean', lastName: 'Ow;en', org: 'Acme: East, Ltd', mobile: '+12125551212', work: '+12125550000',
			email: 'srowen@example.org', url: 'https://example.org/a;b', street: '1 Main St', city: 'Denver', region: 'CO',
			postal: '80202', country: 'USA', note: 'hi'
		};
		expect(detect(payloads.mecard(fields))).toMatchObject({ type: 'mecard', fields });
	});
});

describe('detect: calendar events', () => {
	it('reads local and floating times as written', () => {
		const text = ['BEGIN:VCALENDAR', 'BEGIN:VEVENT', 'SUMMARY:Board\\, again', 'DTSTART;TZID=America/Denver:20260601T090000', 'DTEND:20260601T103000',
			'LOCATION:Room 4', 'DESCRIPTION:Bring notes\\nand coffee', 'END:VEVENT', 'END:VCALENDAR'].join(CRLF);
		expect(detect(text)).toEqual({
			type: 'event',
			label: 'a calendar event',
			fields: { summary: 'Board, again', start: '2026-06-01T09:00', end: '2026-06-01T10:30', location: 'Room 4', description: 'Bring notes\nand coffee', allDay: false }
		});
	});
	it('turns a UTC stamp into local wall time', () => {
		const local = (d: Date) => {
			const p = (n: number) => String(n).padStart(2, '0');
			return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
		};
		const got = detect('BEGIN:VEVENT\nSUMMARY:x\nDTSTART:20260601T140000Z\nDTEND:20260601T153000Z\nEND:VEVENT');
		expect(got).toMatchObject({
			fields: { start: local(new Date(Date.UTC(2026, 5, 1, 14, 0))), end: local(new Date(Date.UTC(2026, 5, 1, 15, 30))), allDay: false }
		});
	});
	it('reads VALUE=DATE as all day, with the exclusive end brought back a day', () => {
		const text = 'BEGIN:VEVENT\nSUMMARY:Holiday\nDTSTART;VALUE=DATE:20260701\nDTEND;VALUE=DATE:20260704\nEND:VEVENT';
		expect(detect(text)).toMatchObject({ fields: { allDay: true, start: '2026-07-01T00:00', end: '2026-07-03T00:00' } });
	});
	it('gives a one-hour event an end when none is written', () => {
		expect(detect('BEGIN:VEVENT\nSUMMARY:x\nDTSTART:20260601T090000\nEND:VEVENT')).toMatchObject({ fields: { end: '2026-06-01T10:00' } });
	});
	it('round-trips the encoder for a timed and an all-day event', () => {
		const start = new Date(2026, 5, 1, 9, 0);
		const end = new Date(2026, 5, 1, 10, 30);
		expect(detect(payloads.vevent({ summary: 'Board; again', start, end, location: 'Room 4', description: 'a\nb' }))).toEqual({
			type: 'event',
			label: 'a calendar event',
			fields: { summary: 'Board; again', start: '2026-06-01T09:00', end: '2026-06-01T10:30', location: 'Room 4', description: 'a\nb', allDay: false }
		});
		expect(
			detect(payloads.vevent({ summary: 'Away', start: new Date(Date.UTC(2026, 6, 1)), end: new Date(Date.UTC(2026, 6, 3)), allDay: true }))
		).toMatchObject({ fields: { allDay: true, start: '2026-07-01T00:00', end: '2026-07-03T00:00' } });
	});
});

describe('detect: mailto, sms, tel, geo', () => {
	it('reads mailto with a decoded subject and body, and its cc and bcc', () => {
		expect(detect('mailto:a@example.com,b@example.com?subject=Hello%20there&body=Line%201%0ALine%202&cc=c@example.com&bcc=d@example.com')).toEqual({
			type: 'email',
			label: 'an email address',
			fields: { to: 'a@example.com,b@example.com', subject: 'Hello there', body: 'Line 1\nLine 2', cc: 'c@example.com', bcc: 'd@example.com' }
		});
		expect(detect('MAILTO:a%40example.com')).toMatchObject({ fields: { to: 'a@example.com' } });
	});
	it('round-trips mailto', () => {
		const fields = { to: 'rsvp@example.com', subject: 'Yes & no?', body: 'Count me in: 100% (+1)' };
		expect(detect(payloads.mailto(fields))).toMatchObject({ type: 'email', fields });
		expect(detect(payloads.mailto({ to: 'a@example.com' }))).toMatchObject({ type: 'email', fields: { to: 'a@example.com' } });
	});
	it('round-trips mailto with cc and bcc, including characters that had to be encoded', () => {
		const fields = { to: 'rsvp@example.com', subject: 'Yes', cc: 'a@example.com,name+tag@example.com', bcc: 'r&d@example.com' };
		expect(detect(payloads.mailto(fields))).toMatchObject({ type: 'email', fields });
		expect(detect(payloads.mailto({ to: 'a@example.com', bcc: 'b@example.com' }))).toEqual({
			type: 'email',
			label: 'an email address',
			fields: { to: 'a@example.com', bcc: 'b@example.com' }
		});
	});
	it('reads sms in each spelling the wild uses', () => {
		expect(detect('sms:+15555550100?body=Hi%20there')).toMatchObject({ type: 'sms', fields: { to: '+15555550100', body: 'Hi there', scheme: 'sms' } });
		expect(detect('sms:+15555550100?&body=Hi')).toMatchObject({ fields: { body: 'Hi', scheme: 'sms' } });
		expect(detect('sms:+15555550100;body=Hi')).toMatchObject({ fields: { body: 'Hi' } });
		expect(detect('sms:+15555550100')).toMatchObject({ fields: { to: '+15555550100', body: '' } });
		expect(detect('SMSTO:+15555550100:Hi? Call me & say: hi')).toMatchObject({ fields: { to: '+15555550100', body: 'Hi? Call me & say: hi', scheme: 'smsto' } });
		expect(detect('smsto:+15555550100')).toMatchObject({ fields: { scheme: 'smsto', body: '' } });
	});
	it('round-trips sms in both schemes', () => {
		for (const scheme of ['sms', 'smsto'] as const) {
			const fields = { to: '+15555550100', body: 'Hi there: 50% off?', scheme };
			expect(detect(payloads.sms(fields))).toMatchObject({ type: 'sms', fields });
		}
		expect(detect(payloads.sms({ to: '+15555550100' }))).toMatchObject({ fields: { to: '+15555550100', body: '', scheme: 'sms' } });
	});
	it('reads tel and round-trips it', () => {
		expect(detect('TEL:+15555550100')).toEqual({ type: 'tel', label: 'a phone number', fields: { number: '+15555550100' } });
		expect(detect(payloads.tel('+1 (555) 555-0100'))).toMatchObject({ type: 'tel', fields: { number: '+15555550100' } });
	});
	it('reads geo with and without a label, and round-trips it', () => {
		expect(detect('geo:39.7392,-104.9903')).toEqual({ type: 'geo', label: 'a location', fields: { lat: '39.7392', lng: '-104.9903', query: '' } });
		expect(detect('GEO:37.78,-122.4,12;u=35?q=Main%20entrance')).toMatchObject({ fields: { lat: '37.78', lng: '-122.4', query: 'Main entrance' } });
		expect(detect(payloads.geo({ lat: 39.7392, lng: -104.9903, query: 'Café & bar' }))).toMatchObject({
			type: 'geo',
			fields: { lat: '39.7392', lng: '-104.9903', query: 'Café & bar' }
		});
		expect(detect(payloads.geo({ lat: -33.865143, lng: 151.2099 }))).toMatchObject({ fields: { lat: '-33.865143', lng: '151.2099' } });
	});
	it('does not accept a geo string with no coordinates', () => {
		expect(detect('geo:')).toBeNull();
		expect(detect('geo:here,there')).toBeNull();
	});
});

describe('detect: a bare address or number', () => {
	it('recognises an email address', () => {
		expect(detect('  rsvp@example.com ')).toEqual({ type: 'email', label: 'an email address', fields: { to: 'rsvp@example.com' } });
		expect(detect('first.last+tag@sub.example.co.uk')).toMatchObject({ type: 'email' });
	});
	it('leaves things that only contain an @ alone', () => {
		expect(detect('https://user@example.com/path')).toBeNull();
		expect(detect('@stoneqr')).toBeNull();
		expect(detect('see me@example.com tomorrow')).toBeNull();
		expect(detect('a@b')).toBeNull();
	});
	it('recognises a phone number with a plus or seven digits', () => {
		expect(detect('+1 (555) 555-0100')).toEqual({ type: 'tel', label: 'a phone number', fields: { number: '+1 (555) 555-0100' } });
		expect(detect('555-0100')).toMatchObject({ type: 'tel' });
		expect(detect('020 7946 0958')).toMatchObject({ type: 'tel' });
		expect(detect('+44.20.7946.0958')).toMatchObject({ type: 'tel' });
	});
	it('leaves short numbers, dates, decimals, and pairs alone', () => {
		for (const s of ['12345', '2026', '+12', '2026-09-28', '3.14159265', '39.7392, -104.9903', '1234567890123456', '555-01x0', '5+5551234567']) {
			expect(detect(s), s).toBeNull();
		}
	});
});

describe('detect: what it never guesses', () => {
	it('returns null for links, bare domains, and prose', () => {
		for (const s of [
			'https://example.com/menu', 'http://example.com', 'example.com', 'www.example.com/a?b=c', 'https://wa.me/123',
			'Hello there, see you at 7', 'Call me on Tuesday', 'WiFi is free', 'javascript:alert(1)', '', '   '
		]) {
			expect(detect(s), s).toBeNull();
		}
	});
	it('does not stall on a very long string', () => {
		expect(detect('a'.repeat(100000))).toBeNull();
		expect(detect(`${'a.'.repeat(4000)}@x`)).toBeNull();
	});
});
