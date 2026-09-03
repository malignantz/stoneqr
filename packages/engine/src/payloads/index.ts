/**
 * Payload encoders: turn form fields into the exact string a scanner expects.
 * Every format here follows the ZXing "Barcode Contents" conventions, which are
 * the de-facto spec that phone cameras implement.
 * https://github.com/zxing/zxing/wiki/Barcode-Contents
 */
export { PayloadError } from './errors.js';

export { url, isLikelyUrl } from './url.js';
export { text } from './text.js';
export { wifi, wifiWarnings, escapeWifi, type WifiAuth, type WifiFields } from './wifi.js';
export { vcard, escapeVcardText, type VcardFields } from './vcard.js';
export { mecard, escapeMecard, type MecardFields } from './mecard.js';
export { mailto, type MailtoFields } from './mailto.js';
export { sms, type SmsFields } from './sms.js';
export { tel, normalisePhone } from './tel.js';
export { geo, type GeoFields } from './geo.js';
export { vevent, escapeIcs, foldIcsLine, type VeventFields } from './vevent.js';

import { url } from './url.js';
import { text } from './text.js';
import { wifi } from './wifi.js';
import { vcard } from './vcard.js';
import { mecard } from './mecard.js';
import { mailto } from './mailto.js';
import { sms } from './sms.js';
import { tel } from './tel.js';
import { geo } from './geo.js';
import { vevent } from './vevent.js';

/** Every encoder in one object, for `payloads[type](fields)` style call sites. */
export const payloads = { url, text, wifi, vcard, mecard, mailto, sms, tel, geo, vevent } as const;

/** The content types the UI offers, in the order they appear in the selector. */
export type PayloadType = 'url' | 'text' | 'wifi' | 'vcard' | 'mecard' | 'email' | 'sms' | 'tel' | 'geo' | 'event';

export const PAYLOAD_TYPES: { id: PayloadType; label: string; description: string }[] = [
	{ id: 'url', label: 'URL', description: 'Open a web page.' },
	{ id: 'text', label: 'Text', description: 'Show plain text the phone can copy.' },
	{ id: 'wifi', label: 'WiFi', description: 'Join a wireless network without typing the password.' },
	{ id: 'vcard', label: 'vCard', description: 'Save a contact. More fields, bigger code.' },
	{ id: 'mecard', label: 'MeCard', description: 'Save a contact. Fewer fields, smaller code.' },
	{ id: 'email', label: 'Email', description: 'Start an email with the subject and body filled in.' },
	{ id: 'sms', label: 'SMS', description: 'Start a text message with the wording filled in.' },
	{ id: 'tel', label: 'Phone', description: 'Dial a number.' },
	{ id: 'geo', label: 'Location', description: 'Drop a pin at a latitude and longitude.' },
	{ id: 'event', label: 'Calendar event', description: 'Add an event to the calendar.' }
];
