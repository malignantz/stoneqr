/**
 * Email payload: `mailto:a@b?subject=...&body=...&cc=...&bcc=...` (RFC 6068).
 * The address stays readable in the code; only the query values are percent-encoded.
 * Several recipients are separated by commas, in `to`, `cc`, and `bcc` alike.
 * https://github.com/zxing/zxing/wiki/Barcode-Contents
 */
import { PayloadError } from './errors.js';

export interface MailtoFields {
	to: string;
	subject?: string;
	body?: string;
	/** Copied recipients, comma-separated, each checked like `to`. */
	cc?: string;
	/** Blind-copied recipients, comma-separated, each checked like `to`. */
	bcc?: string;
}

const EMAIL = /^[^\s@,<>]+@[^\s@,<>]+\.[^\s@,<>]+$/;

/** Split a comma-separated list and check every address; an empty list is `[]`. */
function addresses(raw: string, field: string): string[] {
	const list = raw
		.split(',')
		.map((a) => a.trim())
		.filter((a) => a !== '');
	for (const a of list) if (!EMAIL.test(a)) throw new PayloadError(`That is not a valid email address: ${a}`, field);
	return list;
}

/**
 * An address as a query value. The path part of a mailto can carry `&`, `#`, `?`, or `%` in a
 * local part as written, but in the query they end the value or start something else, and `+`
 * (`name+tag@example.com`) is read as a space by some parsers. So encode the lot and put back the
 * one character that is safe and that makes the address readable.
 */
const inQuery = (list: string[]) => list.map((a) => encodeURIComponent(a).replace(/%40/g, '@')).join(',');

export function mailto(fields: MailtoFields): string {
	const raw = (fields.to ?? '').trim();
	if (raw === '') throw new PayloadError('Enter an email address.', 'to');
	const to = addresses(raw, 'to');
	if (to.length === 0) throw new PayloadError('Enter an email address.', 'to');
	const cc = addresses(fields.cc ?? '', 'cc');
	const bcc = addresses(fields.bcc ?? '', 'bcc');

	const params: string[] = [];
	const subject = (fields.subject ?? '').trim();
	if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
	const body = (fields.body ?? '').trim();
	if (body) params.push(`body=${encodeURIComponent(body)}`);
	if (cc.length > 0) params.push(`cc=${inQuery(cc)}`);
	if (bcc.length > 0) params.push(`bcc=${inQuery(bcc)}`);

	const query = params.length > 0 ? `?${params.join('&')}` : '';
	return `mailto:${to.join(',')}${query}`;
}
