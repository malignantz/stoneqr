import { describe, expect, it } from 'vitest';
import { encode, rasterize, verifyRaster } from '../src/index.js';
import { PAYLOAD_TYPES, PayloadError, normaliseWhatsappNumber, payloads, whatsapp } from '../src/payloads/index.js';

describe('whatsapp', () => {
	it('builds a wa.me link from digits, with no text when there is none', () => {
		expect(whatsapp({ number: '447700900123' })).toBe('https://wa.me/447700900123');
		expect(whatsapp({ number: '447700900123', text: '   ' })).toBe('https://wa.me/447700900123');
	});
	it('percent-encodes the message and trims it', () => {
		expect(whatsapp({ number: '447700900123', text: ' Hi, is the table free? 100% & more\nThanks ' })).toBe(
			'https://wa.me/447700900123?text=Hi%2C%20is%20the%20table%20free%3F%20100%25%20%26%20more%0AThanks'
		);
	});
	it('normalises spaces, dashes, dots, brackets, and a leading plus', () => {
		for (const typed of ['+44 7700 900123', '44-7700-900-123', '44.7700.900123', '+44 (7700) 900123', '  447700900123  ', '(44) 7700 900123'])
			expect(whatsapp({ number: typed }), typed).toBe('https://wa.me/447700900123');
		expect(normaliseWhatsappNumber('+1 (555) 555-0100')).toBe('15555550100');
	});
	it('accepts the shortest and longest lengths', () => {
		expect(whatsapp({ number: '1234567' })).toBe('https://wa.me/1234567');
		expect(whatsapp({ number: '123456789012345' })).toBe('https://wa.me/123456789012345');
	});
	it('refuses what stripping cannot repair, and says what to type', () => {
		const words = /country code/;
		expect(() => whatsapp({ number: '' })).toThrow(words);
		expect(() => whatsapp({ number: '   ' })).toThrow(words);
		expect(() => whatsapp({ number: '44 7700 CALL ME' })).toThrow(words);
		expect(() => whatsapp({ number: '44+7700900123' })).toThrow(words);
		expect(() => whatsapp({ number: '++447700900123' })).toThrow(words);
		expect(() => whatsapp({ number: '123456' })).toThrow(/too short/);
		expect(() => whatsapp({ number: '1234567890123456' })).toThrow(/too long/);
	});
	it('refuses a leading zero, which is a national trunk prefix, not part of the number', () => {
		expect(() => whatsapp({ number: '07700 900123' })).toThrow(/leading zero/);
		expect(() => whatsapp({ number: '+0 7700 900123' })).toThrow(/leading zero/);
		expect(() => whatsapp({ number: '0044 7700 900123' })).toThrow(/leading zero/);
	});
	it('reports errors as PayloadError on the number field', () => {
		try {
			whatsapp({ number: 'abc' });
			expect.unreachable();
		} catch (e) {
			expect(e).toBeInstanceOf(PayloadError);
			expect((e as PayloadError).field).toBe('number');
		}
	});
	it('is offered as a content type and on the namespace object', () => {
		expect(PAYLOAD_TYPES.find((t) => t.id === 'whatsapp')).toMatchObject({ label: 'WhatsApp' });
		expect(payloads.whatsapp({ number: '447700900123' })).toBe('https://wa.me/447700900123');
	});
	it('decodes back to the exact payload', () => {
		const payload = whatsapp({ number: '+44 7700 900123', text: 'Hello from the poster' });
		const img = rasterize(encode(payload, { ecc: 'M' }), { pxPerModule: 8 });
		expect(verifyRaster(img, payload)).toEqual({ ok: true, decoded: payload });
	});
});
