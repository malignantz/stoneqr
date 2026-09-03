/**
 * WiFi join payload: `WIFI:T:WPA;S:mynetwork;P:mypass;;`
 * `T` is WPA (covers WPA/WPA2/WPA3), WEP, or nopass. `H:true` marks a hidden SSID.
 * The special characters `\ ; , " :` are escaped with a backslash, backslash first.
 * https://github.com/zxing/zxing/wiki/Barcode-Contents
 */
import type { Warning } from '../types.js';
import { PayloadError } from './errors.js';

export type WifiAuth = 'WPA' | 'WEP' | 'nopass';

export interface WifiFields {
	ssid: string;
	password?: string;
	auth: WifiAuth;
	hidden?: boolean;
}

/** Escape `\ ; , " :` for the WIFI: format. The backslash is handled first by the character class. */
export function escapeWifi(s: string): string {
	return s.replace(/([\\;,":])/g, '\\$1');
}

function utf8Length(s: string): number {
	return new TextEncoder().encode(s).length;
}

export function wifi(fields: WifiFields): string {
	const { ssid, password, auth, hidden } = fields;
	if (auth !== 'WPA' && auth !== 'WEP' && auth !== 'nopass')
		throw new PayloadError('Security must be WPA, WEP, or nopass.', 'auth');
	if (ssid === undefined || ssid === '') throw new PayloadError('Enter the network name (SSID).', 'ssid');
	const bytes = utf8Length(ssid);
	if (bytes > 32)
		throw new PayloadError(
			`Network names can be at most 32 bytes; this one is ${bytes}. Accents and emoji count as several bytes each.`,
			'ssid'
		);

	let out = `WIFI:T:${auth};S:${escapeWifi(ssid)};`;
	if (auth !== 'nopass' && password) out += `P:${escapeWifi(password)};`;
	if (hidden) out += 'H:true;';
	return out + ';';
}

const ASCII = /^[\x20-\x7e]*$/;

/** Plain-language warnings for the UI. Never blocks: the code still encodes. */
export function wifiWarnings(fields: WifiFields): Warning[] {
	const out: Warning[] = [];
	if (!ASCII.test(fields.ssid ?? ''))
		out.push({
			level: 'warn',
			code: 'wifi-ssid-non-ascii',
			message:
				'The network name has accented or non-Latin characters. Some phones join the wrong network or fail silently; test on an iPhone and an Android before printing.'
		});
	if (fields.password && !ASCII.test(fields.password))
		out.push({
			level: 'warn',
			code: 'wifi-password-non-ascii',
			message:
				'The password has accented or non-Latin characters. Some phones mangle these; test the code on a real phone before printing.'
		});
	if (fields.auth === 'WEP')
		out.push({
			level: 'warn',
			code: 'wifi-wep',
			message:
				'WEP is obsolete and some phones refuse to join a WEP network from a QR code. Use WPA if the router allows it.'
		});
	if (fields.auth !== 'nopass' && !fields.password)
		out.push({
			level: 'warn',
			code: 'wifi-no-password',
			message: 'No password given, so the code will not join the network. Choose "no password" if the network is open.'
		});
	return out;
}
