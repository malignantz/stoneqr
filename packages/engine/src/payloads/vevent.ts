/**
 * Calendar payload: a one-event VCALENDAR (RFC 5545) that most scanners offer to
 * add to the calendar. Times are written in UTC (`YYYYMMDDTHHMMSSZ`); all-day events
 * use `;VALUE=DATE:YYYYMMDD` with an exclusive DTEND, as the RFC requires.
 * Text values escape `\ ; ,` and newlines, and lines are folded at 75 octets.
 * The UID and DTSTAMP are derived from the content, so the same input always
 * produces the same QR code (no random UID, no "now" timestamp).
 * https://github.com/zxing/zxing/wiki/Barcode-Contents
 */
import { PayloadError } from './errors.js';

export interface VeventFields {
	summary: string;
	start: Date;
	end?: Date;
	location?: string;
	description?: string;
	allDay?: boolean;
}

const CRLF = '\r\n';
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** Escape `\ ; ,` and newlines in an iCalendar text value (RFC 5545 section 3.3.11). */
export function escapeIcs(s: string): string {
	return s
		.replace(/\\/g, '\\\\')
		.replace(/;/g, '\\;')
		.replace(/,/g, '\\,')
		.replace(/\r\n|\r|\n/g, '\\n');
}

/** Fold a content line at 75 octets, continuing with CRLF + one space (RFC 5545 section 3.1). */
export function foldIcsLine(line: string): string {
	const enc = new TextEncoder();
	if (enc.encode(line).length <= 75) return line;
	const parts: string[] = [];
	let cur = '';
	let bytes = 0;
	let limit = 75;
	for (const ch of line) {
		const n = enc.encode(ch).length;
		if (bytes + n > limit) {
			parts.push(cur);
			cur = '';
			bytes = 0;
			limit = 74; // continuation lines spend one octet on the leading space
		}
		cur += ch;
		bytes += n;
	}
	if (cur !== '') parts.push(cur);
	return parts.map((p, i) => (i === 0 ? p : ` ${p}`)).join(CRLF);
}

function pad(n: number): string {
	return String(n).padStart(2, '0');
}

function utcDate(d: Date): string {
	return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}

function utcStamp(d: Date): string {
	return `${utcDate(d)}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

/** FNV-1a twice, with different multipliers, for a short stable UID. Not a security hash. */
function contentHash(s: string): string {
	const bytes = new TextEncoder().encode(s);
	let a = 0x811c9dc5;
	let b = 0x01000193;
	for (const byte of bytes) {
		a = Math.imul(a ^ byte, 0x01000193) >>> 0;
		b = Math.imul(b ^ byte, 0x85ebca6b) >>> 0;
	}
	return a.toString(16).padStart(8, '0') + b.toString(16).padStart(8, '0');
}

export function vevent(fields: VeventFields): string {
	const summary = (fields.summary ?? '').trim();
	if (summary === '') throw new PayloadError('Give the event a title.', 'summary');
	const start = fields.start;
	if (!(start instanceof Date) || Number.isNaN(start.getTime()))
		throw new PayloadError('Pick a start date and time for the event.', 'start');
	if (fields.end !== undefined && (!(fields.end instanceof Date) || Number.isNaN(fields.end.getTime())))
		throw new PayloadError('That end date is not a real date.', 'end');
	if (fields.end !== undefined && fields.end.getTime() < start.getTime())
		throw new PayloadError('The event ends before it starts.', 'end');

	const allDay = fields.allDay === true;
	const location = (fields.location ?? '').trim();
	const description = (fields.description ?? '').trim();

	let dtstart: string;
	let dtend: string;
	if (allDay) {
		// DTEND is exclusive: the day after the last day of the event.
		const last = fields.end ?? start;
		const endExclusive = new Date(Date.UTC(last.getUTCFullYear(), last.getUTCMonth(), last.getUTCDate()) + DAY_MS);
		dtstart = `DTSTART;VALUE=DATE:${utcDate(start)}`;
		dtend = `DTEND;VALUE=DATE:${utcDate(endExclusive)}`;
	} else {
		const end = fields.end ?? new Date(start.getTime() + HOUR_MS);
		dtstart = `DTSTART:${utcStamp(start)}`;
		dtend = `DTEND:${utcStamp(end)}`;
	}

	const uid = `${contentHash([summary, dtstart, dtend, location, description].join(' '))}@stoneqr.app`;

	const lines: string[] = [
		'BEGIN:VCALENDAR',
		'VERSION:2.0',
		'PRODID:-//StoneQR//EN',
		'BEGIN:VEVENT',
		`UID:${uid}`,
		`DTSTAMP:${utcStamp(start)}`,
		`SUMMARY:${escapeIcs(summary)}`,
		dtstart,
		dtend
	];
	if (location) lines.push(`LOCATION:${escapeIcs(location)}`);
	if (description) lines.push(`DESCRIPTION:${escapeIcs(description)}`);
	lines.push('END:VEVENT', 'END:VCALENDAR');

	return lines.map(foldIcsLine).join(CRLF);
}
