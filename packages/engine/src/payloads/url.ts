/**
 * URL payload. ZXing "Barcode Contents": a URL is encoded as the plain URL text,
 * scheme included, so the scanner offers "open link" rather than "copy text".
 * https://github.com/zxing/zxing/wiki/Barcode-Contents
 *
 * We keep the user's text as typed (only adding `https://` when no scheme is present)
 * rather than the URL constructor's normalised `href`, because normalisation adds a
 * trailing slash and re-encodes characters, which makes the code longer and the
 * preview surprising.
 */
import { PayloadError } from './errors.js';

const SCHEME = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;
const HOSTISH = /^[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+(?::\d+)?(?:[/?#]|$)/;

/** Does this look like something we should offer to turn into a link? */
export function isLikelyUrl(s: string): boolean {
	const t = s.trim();
	if (t === '') return false;
	if (SCHEME.test(t)) {
		try {
			new URL(t);
			return true;
		} catch {
			return false;
		}
	}
	return HOSTISH.test(t);
}

/** `https://stoneqr.app` — adds `https://` when the scheme is missing. */
export function url(input: string): string {
	const trimmed = input.trim();
	if (trimmed === '') throw new PayloadError('Enter a web address, for example stoneqr.app', 'url');
	const withScheme = SCHEME.test(trimmed) ? trimmed : `https://${trimmed}`;
	let parsed: URL;
	try {
		parsed = new URL(withScheme);
	} catch {
		throw new PayloadError(`That does not look like a web address: ${trimmed}`, 'url');
	}
	if ((parsed.protocol === 'http:' || parsed.protocol === 'https:') && parsed.hostname === '')
		throw new PayloadError(`That web address is missing a domain: ${trimmed}`, 'url');
	return withScheme;
}
