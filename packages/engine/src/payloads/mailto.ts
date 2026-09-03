/**
 * Email payload: `mailto:a@b?subject=...&body=...` (RFC 6068).
 * The address stays readable in the code; only the query values are percent-encoded.
 * Several recipients are separated by commas.
 * https://github.com/zxing/zxing/wiki/Barcode-Contents
 */
import { PayloadError } from './errors.js';

export interface MailtoFields {
	to: string;
	subject?: string;
	body?: string;
}

const EMAIL = /^[^\s@,<>]+@[^\s@,<>]+\.[^\s@,<>]+$/;

export function mailto(fields: MailtoFields): string {
	const raw = (fields.to ?? '').trim();
	if (raw === '') throw new PayloadError('Enter an email address.', 'to');
	const addresses = raw
		.split(',')
		.map((a) => a.trim())
		.filter((a) => a !== '');
	if (addresses.length === 0) throw new PayloadError('Enter an email address.', 'to');
	for (const a of addresses) if (!EMAIL.test(a)) throw new PayloadError(`That is not a valid email address: ${a}`, 'to');

	const params: string[] = [];
	const subject = (fields.subject ?? '').trim();
	if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
	const body = (fields.body ?? '').trim();
	if (body) params.push(`body=${encodeURIComponent(body)}`);

	const query = params.length > 0 ? `?${params.join('&')}` : '';
	return `mailto:${addresses.join(',')}${query}`;
}
