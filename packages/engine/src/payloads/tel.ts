/**
 * Telephone payload: `tel:+15555550100` (RFC 3966, as ZXing describes it).
 * Phones dial the number as written, so we keep a leading `+` for the country code
 * and strip the punctuation people type: spaces, dashes, parentheses, dots.
 * https://github.com/zxing/zxing/wiki/Barcode-Contents
 */
import { PayloadError } from './errors.js';

/** `+1 (555) 555-0100` -> `+15555550100`. Keeps a leading `+` only. */
export function normalisePhone(input: string): string {
	const trimmed = (input ?? '').trim();
	const plus = trimmed.startsWith('+');
	const rest = (plus ? trimmed.slice(1) : trimmed).replace(/[\s\-().]/g, '').replace(/\+/g, '');
	return (plus ? '+' : '') + rest;
}

export function tel(number: string): string {
	const n = normalisePhone(number);
	if (!/\d/.test(n)) throw new PayloadError('Enter a phone number, for example +1 555 555 0100.', 'to');
	return `tel:${n}`;
}
