/**
 * MeCard contact payload (NTT DoCoMo), the compact alternative to vCard:
 * `MECARD:N:Owen,Sean;TEL:+12125551212;EMAIL:srowen@example.org;;`
 * Roughly 30-40% smaller than the same vCard, but it carries fewer fields:
 * there is no job title, so `title` is not encoded.
 * Escapes `\ ; , :` with a backslash, backslash first.
 * https://github.com/zxing/zxing/wiki/Barcode-Contents
 */
import { PayloadError } from './errors.js';
import type { VcardFields } from './vcard.js';

/** MeCard fields are the vCard fields minus the ones MeCard has no home for. */
export type MecardFields = Omit<VcardFields, 'title'> & { title?: string };

/** Escape `\ ; , :` for the MECARD: format. */
export function escapeMecard(s: string): string {
	return s.replace(/([\\;,:])/g, '\\$1');
}

function clean(s: string | undefined): string {
	return (s ?? '').trim();
}

export function mecard(fields: MecardFields): string {
	const first = clean(fields.firstName);
	const last = clean(fields.lastName);
	if (first === '' && last === '') throw new PayloadError('Enter at least a first or last name.', 'firstName');

	const e = escapeMecard;
	let out = `MECARD:N:${e(last)},${e(first)};`;

	const org = clean(fields.org);
	if (org) out += `ORG:${e(org)};`;
	const mobile = clean(fields.mobile);
	if (mobile) out += `TEL:${e(mobile)};`;
	const work = clean(fields.work);
	if (work) out += `TEL:${e(work)};`;
	const email = clean(fields.email);
	if (email) out += `EMAIL:${e(email)};`;
	const link = clean(fields.url);
	if (link) out += `URL:${e(link)};`;

	// DoCoMo ADR keeps the vCard component order, comma separated:
	// po box, extended, street, locality, region, postal code, country.
	const adr = [fields.street, fields.city, fields.region, fields.postal, fields.country].map((p) => clean(p));
	if (adr.some((p) => p !== '')) out += `ADR:,,${adr.map(e).join(',')};`;

	const note = clean(fields.note);
	if (note) out += `NOTE:${e(note)};`;

	return out + ';';
}
