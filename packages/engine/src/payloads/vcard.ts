/**
 * vCard 3.0 contact payload, CRLF line endings, no PHOTO (a photo blows the version past
 * anything a phone will read from a printed card). 3.0 rather than 4.0 for phone support.
 * Text values escape `\ ; ,` and newlines per RFC 2426 section 2.
 * https://github.com/zxing/zxing/wiki/Barcode-Contents
 */
import { PayloadError } from './errors.js';

export interface VcardFields {
	firstName?: string;
	lastName?: string;
	org?: string;
	title?: string;
	mobile?: string;
	work?: string;
	email?: string;
	url?: string;
	street?: string;
	city?: string;
	region?: string;
	postal?: string;
	country?: string;
	note?: string;
}

/** Escape `\ ; ,` and newlines in a vCard text value (RFC 2426). */
export function escapeVcardText(s: string): string {
	return s
		.replace(/\\/g, '\\\\')
		.replace(/;/g, '\\;')
		.replace(/,/g, '\\,')
		.replace(/\r\n|\r|\n/g, '\\n');
}

const CRLF = '\r\n';

function clean(s: string | undefined): string {
	return (s ?? '').trim();
}

export function vcard(fields: VcardFields): string {
	const first = clean(fields.firstName);
	const last = clean(fields.lastName);
	if (first === '' && last === '') throw new PayloadError('Enter at least a first or last name.', 'firstName');

	const e = escapeVcardText;
	const lines: string[] = ['BEGIN:VCARD', 'VERSION:3.0'];
	lines.push(`N:${e(last)};${e(first)};;;`);
	lines.push(`FN:${e([first, last].filter(Boolean).join(' '))}`);

	const org = clean(fields.org);
	if (org) lines.push(`ORG:${e(org)}`);
	const title = clean(fields.title);
	if (title) lines.push(`TITLE:${e(title)}`);
	const mobile = clean(fields.mobile);
	if (mobile) lines.push(`TEL;TYPE=CELL:${e(mobile)}`);
	const work = clean(fields.work);
	if (work) lines.push(`TEL;TYPE=WORK:${e(work)}`);
	const email = clean(fields.email);
	if (email) lines.push(`EMAIL:${e(email)}`);
	const link = clean(fields.url);
	if (link) lines.push(`URL:${e(link)}`);

	const adr = [fields.street, fields.city, fields.region, fields.postal, fields.country].map((p) => clean(p));
	if (adr.some((p) => p !== '')) lines.push(`ADR;TYPE=WORK:;;${adr.map(e).join(';')}`);

	const note = clean(fields.note);
	if (note) lines.push(`NOTE:${e(note)}`);

	lines.push('END:VCARD');
	return lines.join(CRLF);
}
