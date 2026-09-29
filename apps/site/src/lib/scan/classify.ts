/**
 * What a decoded code holds, in the terms /scan shows it: one of the payload types the generator
 * knows (through `detect`), a web address, or plain text.
 *
 * A web address is only ever described. It is split (by `lib/links.ts`) into scheme, host, and the rest so the page
 * can set the host in heavy type, and the flags say when the host is something a glance can get
 * wrong. Nothing here opens, fetches, or resolves an address; a reader must not become a way to
 * get phished, so the page never renders one as a link.
 *
 * Pure: no DOM, no runes, and the import of `detect` is a type-and-function import from another
 * pure module.
 */
import { detect, type Detected } from '$lib/generator/detect';
import { splitLink } from '$lib/links';

export interface LinkParts {
	/** `https:` or `http:` with the slashes, as typed. */
	scheme: string;
	/** The host as the browser would use it: lower-cased, punycode for non-Latin names. */
	host: string;
	/** Everything after the host: port, path, query, fragment. May be empty. */
	rest: string;
	/** The host is written in another alphabet (`xn--`), which can look like ordinary letters. */
	nonLatin: boolean;
	/** Something sits before an `@`; the site is the host after it, not that. */
	userinfo: string;
	/** The exact text. */
	text: string;
}

export type Scanned =
	| { kind: 'detected'; text: string; detected: Detected }
	| { kind: 'link'; text: string; link: LinkParts }
	| { kind: 'text'; text: string };

/**
 * Split an http(s) address without sending it anywhere; null when it is not one. The splitting is
 * `lib/links.ts`, shared with the preview's Inspector; this only puts the port back on the host,
 * the way /scan sets it in heavy type.
 */
export function parseLink(input: string): LinkParts | null {
	const text = input.trim();
	const parts = splitLink(text);
	if (!parts) return null;
	return {
		scheme: parts.scheme,
		host: parts.host + (parts.port ? `:${parts.port}` : ''),
		rest: parts.rest,
		nonLatin: parts.nonLatin,
		userinfo: parts.userinfo,
		text
	};
}

/** Read what a code holds. Link and text are never turned into anything else. */
export function classify(text: string): Scanned {
	const detected = detect(text);
	if (detected) return { kind: 'detected', text, detected };
	const link = parseLink(text);
	if (link) return { kind: 'link', text, link };
	return { kind: 'text', text };
}

/** What `openInGenerator` takes: the type and the fields that would refill the form. */
export function toGenerator(scanned: Scanned): { type: Detected['type'] | 'url' | 'text'; fields: Record<string, unknown> } {
	switch (scanned.kind) {
		case 'detected':
			return { type: scanned.detected.type, fields: { ...scanned.detected.fields } };
		case 'link':
			return { type: 'url', fields: { url: scanned.link.text } };
		default:
			return { type: 'text', fields: { text: scanned.text } };
	}
}

// ---- Fields, laid out ----------------------------------------------------------------------------

const LABELS: Record<string, string> = {
	ssid: 'Network name',
	password: 'Password',
	auth: 'Security',
	hidden: 'Hidden network',
	firstName: 'First name',
	lastName: 'Last name',
	org: 'Organisation',
	title: 'Job title',
	mobile: 'Mobile',
	work: 'Work phone',
	email: 'Email',
	url: 'Website',
	street: 'Street',
	city: 'City',
	region: 'Region',
	postal: 'Postcode',
	country: 'Country',
	note: 'Note',
	to: 'To',
	cc: 'Copy to',
	bcc: 'Blind copy to',
	subject: 'Subject',
	body: 'Message',
	scheme: 'Format',
	number: 'Number',
	lat: 'Latitude',
	lng: 'Longitude',
	query: 'Place name',
	summary: 'Title',
	start: 'Starts',
	end: 'Ends',
	location: 'Where',
	description: 'Details',
	allDay: 'All day'
};

const AUTH: Record<string, string> = { WPA: 'WPA, WPA2, or WPA3', WEP: 'WEP', nopass: 'None (open network)' };

/** A key nobody labelled above: `someKey` becomes "Some key", so a field a later type adds still reads. */
const humanise = (key: string) => key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());

/** The fields a detected code carried, as label and value pairs in a sensible order. Empty ones are left out. */
export function fieldRows(detected: Detected): { label: string; value: string }[] {
	const rows: { label: string; value: string }[] = [];
	for (const [key, raw] of Object.entries(detected.fields as Record<string, unknown>)) {
		if (raw === '' || raw === undefined || raw === null) continue;
		let value: string;
		if (typeof raw === 'boolean') {
			// A false flag is the ordinary case; only say it when it is on.
			if (!raw) continue;
			value = 'Yes';
		} else if (key === 'auth') value = AUTH[String(raw)] ?? String(raw);
		else if (key === 'scheme') value = raw === 'smsto' ? 'SMSTO' : 'SMS';
		else if ((key === 'start' || key === 'end') && typeof raw === 'string') value = raw.replace('T', ' ');
		else value = String(raw);
		rows.push({ label: LABELS[key] ?? humanise(key), value });
	}
	return rows;
}
