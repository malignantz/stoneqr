/**
 * SMS payload. Two spellings are in the wild:
 *   `sms:+15555550100?body=message`  (RFC 5724; what iOS Camera handles best)
 *   `SMSTO:+15555550100:message`     (ZXing's own form, common on Android)
 * ZXing also accepts `sms:number:message`, but we use `?body=` for the sms scheme
 * because the colon form is ignored by iOS.
 * https://github.com/zxing/zxing/wiki/Barcode-Contents
 */
import { PayloadError } from './errors.js';
import { normalisePhone } from './tel.js';

export interface SmsFields {
	to: string;
	body?: string;
	/** 'sms' (default) or 'smsto'. */
	scheme?: 'sms' | 'smsto';
}

export function sms(fields: SmsFields): string {
	const to = normalisePhone(fields.to ?? '');
	if (!/\d/.test(to)) throw new PayloadError('Enter a phone number, for example +1 555 555 0100.', 'to');
	const body = (fields.body ?? '').trim();
	const scheme = fields.scheme ?? 'sms';
	if (scheme !== 'sms' && scheme !== 'smsto') throw new PayloadError('SMS format must be "sms" or "smsto".', 'scheme');
	if (scheme === 'smsto') return body ? `SMSTO:${to}:${body}` : `SMSTO:${to}`;
	return body ? `sms:${to}?body=${encodeURIComponent(body)}` : `sms:${to}`;
}
