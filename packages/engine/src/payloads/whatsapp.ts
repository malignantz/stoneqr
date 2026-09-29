/**
 * WhatsApp payload: `https://wa.me/<number>?text=<message>`, WhatsApp's own "click to chat" link
 * (https://faq.whatsapp.com/5913398998672934). It is an ordinary web address, so every phone
 * camera offers to open it, and the chat opens in the app when it is installed.
 *
 * The number is international and digits only: no plus, no leading zeros, no punctuation. People
 * type it with all of those, so the punctuation and a leading `+` are stripped here; anything
 * that cannot be repaired by stripping (letters, a national trunk zero, a length no phone number
 * has) is refused with words that say what to type, because a wrong number opens no chat at all.
 * E.164 allows at most 15 digits; the shortest real numbers in use are around seven.
 */
import { PayloadError } from './errors.js';

export interface WhatsappFields {
	/** With the country code, e.g. `44 7700 900123` or `+44 (7700) 900-123`. */
	number: string;
	/** The first message, ready to send. */
	text?: string;
}

const HELP = 'Enter the number with its country code, digits only, for example 44 7700 900123.';

/** `+44 (7700) 900-123` -> `44770090123`, or a PayloadError saying what to type. */
export function normaliseWhatsappNumber(input: string): string {
	const trimmed = (input ?? '').trim();
	if (trimmed === '') throw new PayloadError(HELP, 'number');
	const digits = (trimmed.startsWith('+') ? trimmed.slice(1) : trimmed).replace(/[\s\-().]/g, '');
	if (!/^\d+$/.test(digits)) throw new PayloadError(`That number has something other than digits in it. ${HELP}`, 'number');
	if (digits.startsWith('0'))
		throw new PayloadError(
			'Leave off the leading zero, and start with the country code instead: 07700 900123 in the UK is 44 7700 900123.',
			'number'
		);
	if (digits.length < 7) throw new PayloadError(`That number is too short. ${HELP}`, 'number');
	if (digits.length > 15) throw new PayloadError(`That number is too long: a phone number has at most 15 digits, country code included.`, 'number');
	return digits;
}

export function whatsapp(fields: WhatsappFields): string {
	const number = normaliseWhatsappNumber(fields.number);
	const text = (fields.text ?? '').trim();
	return text ? `https://wa.me/${number}?text=${encodeURIComponent(text)}` : `https://wa.me/${number}`;
}
