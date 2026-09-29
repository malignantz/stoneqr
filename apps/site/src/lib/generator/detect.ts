/**
 * Paste and go: recognise a string that is already a QR payload.
 *
 * Someone who pastes `WIFI:T:WPA;S:Cafe;P:latte;;` into the Link box, or an email address into the
 * Text box, almost certainly wants the WiFi code or the email code, not a code that displays that
 * string. `detect` reads the string and says what it is and what the form would hold if it were
 * typed in by hand. It only ever describes; the form offers, and nothing changes until a button is
 * pressed. It never reinterprets a web address: `https://example.com` and `example.com` are null.
 *
 * Every reader here is the inverse of the encoder in `packages/engine/src/payloads/`, so a code
 * made by StoneQR reads back to the fields that made it. They are also forgiving of what other
 * generators write (`WPA2`, `sms:` with `&body=`, `TYPE=CELL` spelt bare, a UTC calendar stamp).
 *
 * Pure: no runes, no DOM. `Fields` is a type import, erased at build time.
 */
import type { PayloadType } from '@stoneqr/engine/payloads';
import type { Fields } from './state.svelte';

/** The types a string can turn out to be. A link and plain text are what the string already is, so they are never offered. */
export type DetectedType = Exclude<PayloadType, 'url' | 'text'>;

/** A recognised payload. `label` is the noun phrase for "That looks like {label}." */
export type Detected = {
	[T in DetectedType]: { type: T; fields: Partial<Fields[T]>; label: string };
}[DetectedType];

/** Long enough for any real WiFi, contact, or event payload; anything past it is not something to guess at. */
const MAX_LENGTH = 8192;

export function detect(input: string): Detected | null {
	const text = input.trim();
	if (!text || text.length > MAX_LENGTH) return null;

	if (/^WIFI:/i.test(text)) return wifi(text);
	if (/^BEGIN:VCARD\b/i.test(text)) return vcard(text);
	if (/^MECARD:/i.test(text)) return mecard(text);
	if (/^BEGIN:(VCALENDAR|VEVENT)\b/i.test(text)) return vevent(text);
	if (/^mailto:/i.test(text)) return mailto(text);
	if (/^(sms|smsto):/i.test(text)) return sms(text);
	if (/^tel:/i.test(text)) return tel(text);
	if (/^geo:/i.test(text)) return geo(text);
	return bareEmail(text) ?? barePhone(text);
}

// ---- helpers ----------------------------------------------------------------------------------

/** Split on a separator that is not escaped by a backslash. The pieces keep their escapes. */
function splitUnescaped(s: string, sep: string): string[] {
	const out: string[] = [];
	let cur = '';
	for (let i = 0; i < s.length; i++) {
		const c = s[i];
		if (c === '\\' && i + 1 < s.length) {
			cur += c + s[++i];
		} else if (c === sep) {
			out.push(cur);
			cur = '';
		} else cur += c;
	}
	out.push(cur);
	return out;
}

/** Split once, at the first unescaped separator: `[before, after]`, or null when there is none. */
function splitOnce(s: string, sep: string): [string, string] | null {
	for (let i = 0; i < s.length; i++) {
		if (s[i] === '\\') i++;
		else if (s[i] === sep) return [s.slice(0, i), s.slice(i + 1)];
	}
	return null;
}

/** Undo a backslash escape: `\;` is `;`. WiFi and MeCard escape a fixed set; taking any next character covers both. */
const unescapeBackslash = (s: string) => s.replace(/\\([\s\S])/g, '$1');

/** vCard and iCalendar text escapes: as above, and `\n` is a newline. */
const unescapeText = (s: string) => s.replace(/\\([\s\S])/g, (_, c: string) => (c === 'n' || c === 'N' ? '\n' : c));

/** `decodeURIComponent` that gives the text back untouched when it holds a stray `%`. */
function decode(s: string): string {
	try {
		return decodeURIComponent(s);
	} catch {
		return s;
	}
}

/** `a=1&b=2` into a map of lower-cased names to decoded values; a name given twice keeps the first. */
function query(s: string, sepPattern = /&/): Map<string, string> {
	const out = new Map<string, string>();
	for (const pair of s.split(sepPattern)) {
		if (!pair) continue;
		const eq = pair.indexOf('=');
		const name = (eq < 0 ? pair : pair.slice(0, eq)).toLowerCase();
		if (!out.has(name)) out.set(name, eq < 0 ? '' : decode(pair.slice(eq + 1)));
	}
	return out;
}

/** Undo iCalendar and vCard line folding: a CRLF followed by a space or tab continues the line. */
const unfold = (s: string) => s.replace(/\r?\n[ \t]/g, '').replace(/\r(?!\n)/g, '\n');

/** One content line of a vCard or iCalendar object: the name, its parameters (upper-cased), and the raw value. */
function contentLine(line: string): { name: string; params: string; value: string } | null {
	const colon = line.indexOf(':');
	if (colon < 1) return null;
	const head = line.slice(0, colon);
	const semi = head.indexOf(';');
	return {
		name: (semi < 0 ? head : head.slice(0, semi)).toUpperCase(),
		params: semi < 0 ? '' : head.slice(semi + 1).toUpperCase(),
		value: line.slice(colon + 1)
	};
}

type Contact = Partial<Fields['vcard']>;

/** Drop keys that hold nothing, so a partial record says only what the text carried. */
function present<T extends object>(o: T): Partial<T> {
	const out: Partial<T> = {};
	for (const [k, v] of Object.entries(o) as [keyof T, unknown][]) if (typeof v !== 'string' || v !== '') out[k] = v as T[keyof T];
	return out;
}

// ---- WiFi -------------------------------------------------------------------------------------

function wifi(text: string): Detected {
	let ssid = '';
	let password = '';
	let type = '';
	let hidden = false;
	for (const part of splitUnescaped(text.slice(5), ';')) {
		const kv = splitOnce(part, ':');
		if (!kv) continue;
		const value = unescapeBackslash(kv[1]);
		switch (kv[0].trim().toUpperCase()) {
			case 'S': ssid = value; break;
			case 'P': password = value; break;
			case 'T': type = value.trim().toUpperCase(); break;
			case 'H': hidden = value.trim().toLowerCase() === 'true'; break;
		}
	}
	// A missing type is an open network. WPA2, WPA3, SAE, and the enterprise spellings are all
	// "WPA" to the form.
	const auth: Fields['wifi']['auth'] = type === 'WEP' ? 'WEP' : type === '' || type === 'NOPASS' ? 'nopass' : 'WPA';
	return { type: 'wifi', label: 'a WiFi network', fields: { ssid, password: auth === 'nopass' ? '' : password, auth, hidden } };
}

// ---- Contacts ---------------------------------------------------------------------------------

function vcard(text: string): Detected {
	const c: Contact = {};
	let fn = '';
	let sawName = false;
	for (const raw of unfold(text).split('\n')) {
		const line = contentLine(raw.trim());
		if (!line) continue;
		const { name, params, value } = line;
		const one = () => unescapeText(value).trim();
		switch (name) {
			case 'N': {
				const p = splitUnescaped(value, ';').map((x) => unescapeText(x).trim());
				c.lastName = p[0] ?? '';
				c.firstName = p[1] ?? '';
				sawName = !!(c.lastName || c.firstName);
				break;
			}
			case 'FN': fn = one(); break;
			case 'ORG': c.org ||= unescapeText(splitUnescaped(value, ';')[0]).trim(); break;
			case 'TITLE': c.title ||= one(); break;
			case 'TEL': {
				const n = one();
				// TYPE may be spelt TYPE=CELL, TYPE=cell,voice, or (vCard 2.1) bare CELL.
				const slot: 'mobile' | 'work' | undefined = /CELL|MOBILE/.test(params) ? 'mobile' : /WORK/.test(params) ? 'work' : undefined;
				const free = (['mobile', 'work'] as const).find((k) => !c[k]);
				const target = slot && !c[slot] ? slot : free;
				if (target && n) c[target] = n;
				break;
			}
			case 'EMAIL': c.email ||= one(); break;
			case 'URL': c.url ||= one(); break;
			case 'ADR': {
				// po box; extended; street; city; region; postal code; country
				const p = splitUnescaped(value, ';').map((x) => unescapeText(x).trim());
				if (!c.street && !c.city && !c.region && !c.postal && !c.country) {
					c.street = p[2] ?? '';
					c.city = p[3] ?? '';
					c.region = p[4] ?? '';
					c.postal = p[5] ?? '';
					c.country = p[6] ?? '';
				}
				break;
			}
			case 'NOTE': c.note ||= one(); break;
		}
	}
	if (!sawName && fn) {
		// FN alone: the last word is the surname, as a person would write it.
		const words = fn.split(/\s+/);
		if (words.length > 1) c.lastName = words.pop()!;
		c.firstName = words.join(' ');
	}
	return { type: 'vcard', label: 'a contact card', fields: present(c) };
}

function mecard(text: string): Detected {
	const c: Contact = {};
	for (const part of splitUnescaped(text.slice(7), ';')) {
		const kv = splitOnce(part, ':');
		if (!kv) continue;
		const raw = kv[1];
		const value = unescapeBackslash(raw).trim();
		switch (kv[0].trim().toUpperCase()) {
			case 'N': {
				// "Last,First" as the encoder writes it; a bare "First Last" is split at its last space.
				const p = splitUnescaped(raw, ',').map((x) => unescapeBackslash(x).trim());
				if (p.length > 1) {
					c.lastName = p[0];
					c.firstName = p[1];
				} else {
					const words = value.split(/\s+/);
					c.lastName = words.length > 1 ? words.pop()! : value;
					c.firstName = words.length ? words.join(' ') : '';
				}
				break;
			}
			case 'ORG': c.org ||= value; break;
			case 'TEL': {
				if (!c.mobile) c.mobile = value;
				else if (!c.work) c.work = value;
				break;
			}
			case 'EMAIL': c.email ||= value; break;
			case 'URL': c.url ||= value; break;
			case 'ADR': {
				// po box, extended, street, locality, region, postal code, country
				const p = splitUnescaped(raw, ',').map((x) => unescapeBackslash(x).trim());
				c.street = p[2] ?? '';
				c.city = p[3] ?? '';
				c.region = p[4] ?? '';
				c.postal = p[5] ?? '';
				c.country = p[6] ?? '';
				break;
			}
			case 'NOTE': c.note ||= value; break;
		}
	}
	return { type: 'mecard', label: 'a contact card', fields: present(c) };
}

// ---- Calendar events --------------------------------------------------------------------------

const pad = (n: number) => String(n).padStart(2, '0');
const localStamp = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

/**
 * An iCalendar DATE or DATE-TIME as the form holds it. A `Z` stamp is UTC and becomes the reader's
 * local wall time; a stamp with no `Z` (floating, or with a TZID) is already wall time and is taken
 * as written. `date` is set for a bare date, which means an all-day event.
 */
function icsTime(value: string): { date: boolean; parts: [number, number, number, number, number]; utc: boolean } | null {
	const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/i.exec(value.trim());
	if (!m) return null;
	const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
	if (m[4] === undefined) return { date: true, parts: [y, mo, d, 0, 0], utc: false };
	return { date: false, parts: [y, mo, d, Number(m[4]), Number(m[5])], utc: !!m[7] };
}

function vevent(text: string): Detected {
	const f: Partial<Fields['event']> = {};
	let dtstart: ReturnType<typeof icsTime> = null;
	let dtend: ReturnType<typeof icsTime> = null;
	let inEvent = !/BEGIN:VEVENT/i.test(text);
	for (const raw of unfold(text).split('\n')) {
		const line = raw.trim();
		if (/^BEGIN:VEVENT$/i.test(line)) {
			inEvent = true;
			continue;
		}
		if (/^END:VEVENT$/i.test(line)) break;
		if (!inEvent) continue;
		const cl = contentLine(line);
		if (!cl) continue;
		const { name, params, value } = cl;
		const dateOnly = /VALUE=DATE(?!-)/.test(params);
		switch (name) {
			case 'SUMMARY': f.summary ||= unescapeText(value).trim(); break;
			case 'LOCATION': f.location ||= unescapeText(value).trim(); break;
			case 'DESCRIPTION': f.description ||= unescapeText(value).trim(); break;
			case 'DTSTART': dtstart ??= icsTime(dateOnly ? value.trim().slice(0, 8) : value); break;
			case 'DTEND': dtend ??= icsTime(dateOnly ? value.trim().slice(0, 8) : value); break;
		}
	}
	if (dtstart) {
		const at = (t: NonNullable<typeof dtstart>): Date => {
			const [y, mo, d, h, mi] = t.parts;
			return t.utc ? new Date(Date.UTC(y, mo - 1, d, h, mi)) : new Date(y, mo - 1, d, h, mi);
		};
		const start = at(dtstart);
		f.allDay = dtstart.date;
		f.start = localStamp(start);
		if (dtstart.date) {
			// DTEND on a date is exclusive: the event's last day is the day before it.
			const last = dtend ? at(dtend) : null;
			if (last) last.setDate(last.getDate() - 1);
			f.end = localStamp(last && last >= start ? last : start);
		} else {
			f.end = localStamp(dtend ? at(dtend) : new Date(start.getTime() + 60 * 60 * 1000));
		}
	}
	return { type: 'event', label: 'a calendar event', fields: present(f) };
}

// ---- Email, text message, phone, location ------------------------------------------------------

function mailto(text: string): Detected {
	const rest = text.slice(7);
	const q = rest.indexOf('?');
	const head = decode(q < 0 ? rest : rest.slice(0, q)).trim();
	const params = query(q < 0 ? '' : rest.slice(q + 1));
	// A second recipient list can arrive as ?to=.
	const to = [head, params.get('to')?.trim() ?? ''].filter(Boolean).join(',');
	return {
		type: 'email',
		label: 'an email address',
		fields: present({
			to,
			subject: params.get('subject') ?? '',
			body: params.get('body') ?? '',
			cc: params.get('cc')?.trim() ?? '',
			bcc: params.get('bcc')?.trim() ?? ''
		})
	};
}

function sms(text: string): Detected {
	const colon = text.indexOf(':');
	const scheme = text.slice(0, colon).toLowerCase() === 'smsto' ? 'smsto' : 'sms';
	const rest = text.slice(colon + 1);
	let to: string;
	let body = '';
	// Whichever separator comes first says which form this is. RFC 5724 puts the body in a query;
	// some generators join it with `&` or `;` instead of `?`, and iOS's own links use `?&body=`.
	// ZXing's SMSTO and the older `sms:number:message` put it after a colon, as written, with no
	// percent-encoding, so a `?` inside that message is just text.
	const sep = rest.search(/[?&;:]/);
	if (sep >= 0 && rest[sep] !== ':') {
		to = decode(rest.slice(0, sep));
		body = query(rest.slice(sep + 1), /[&;?]/).get('body') ?? '';
	} else {
		to = decode(sep < 0 ? rest : rest.slice(0, sep));
		body = sep < 0 ? '' : rest.slice(sep + 1);
	}
	return { type: 'sms', label: 'a text message', fields: { to: to.trim(), body, scheme } };
}

function tel(text: string): Detected {
	// `;ext=` and other parameters are not something the form has a place for.
	const number = decode(text.slice(4).split(/[;?]/)[0]).trim();
	return { type: 'tel', label: 'a phone number', fields: { number } };
}

const COORD = /^[-+]?\d{1,3}(?:\.\d+)?$/;

function geo(text: string): Detected | null {
	const rest = text.slice(4);
	const q = rest.indexOf('?');
	const params = query(q < 0 ? '' : rest.slice(q + 1));
	// geo:lat,lng[,altitude][;crs=…;u=…]
	const [lat, lng] = (q < 0 ? rest : rest.slice(0, q)).split(';')[0].split(',').map((s) => s.trim());
	if (!lat || !lng || !COORD.test(lat) || !COORD.test(lng)) return null;
	return { type: 'geo', label: 'a location', fields: { lat, lng, query: params.get('q') ?? '' } };
}

/** An address on its own, with nothing around it that would make it part of a link. */
function bareEmail(text: string): Detected | null {
	// 254 is the longest an address can be; the cap also keeps the pattern's backtracking small.
	if (text.length > 254 || !/^[^\s@,<>/:;]+@[^\s@,<>/]+\.[^\s@,<>/]+$/.test(text)) return null;
	return { type: 'email', label: 'an email address', fields: { to: text } };
}

/**
 * A phone number on its own: digits with spaces, dashes, dots, and brackets between, and a `+`
 * only at the front. A leading `+` needs six digits and no plus needs seven, so a year, a short
 * code, or "1.5" is left alone. A bare date and a decimal are excluded, because eight digits and a
 * dash or a dot are also what those look like.
 */
function barePhone(text: string): Detected | null {
	if (text.length > 40 || !/^\+?[\d\s\-().]+$/.test(text)) return null;
	if (/^\d{4}-\d{2}-\d{2}$/.test(text) || /^\d+\.\d+$/.test(text)) return null;
	const digits = text.replace(/\D/g, '').length;
	if (digits > 15 || digits < (text.startsWith('+') ? 6 : 7)) return null;
	return { type: 'tel', label: 'a phone number', fields: { number: text } };
}
