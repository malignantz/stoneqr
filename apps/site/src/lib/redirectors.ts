/**
 * Hosts that exist to redirect: link shorteners and QR redirect services. A code that holds one of
 * these addresses does not hold its destination; it holds a pointer, and whoever runs the host
 * decides where the pointer leads and for how long. That is a description of the mechanism, not a
 * claim about any company, so keep the entries to hosts their operator describes as a shortener
 * or redirect service, and record each one, with its source, in `docs/claims.md`.
 *
 * Pure: no network, no DOM. A host matches exactly or as a parent domain (`go.bit.ly` is `bit.ly`).
 */
export const REDIRECTORS: readonly { host: string; name: string }[] = [
	{ host: 'bit.ly', name: 'bit.ly' },
	{ host: 'tinyurl.com', name: 'TinyURL' },
	{ host: 'is.gd', name: 'is.gd' },
	{ host: 'cutt.ly', name: 'Cuttly' },
	{ host: 'tiny.cc', name: 'tiny.cc' },
	{ host: 'ow.ly', name: 'Ow.ly' },
	{ host: 'goo.gl', name: 'goo.gl' },
	{ host: 'qrco.de', name: 'qrco.de' }
];

/** The host of an address, lower-cased and without a leading `www.`, or null when it has none. Tolerates a missing scheme. */
function hostOf(url: string): string | null {
	const text = url.trim();
	if (!text) return null;
	try {
		const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `https://${text}`;
		const host = new URL(withScheme).hostname.toLowerCase().replace(/\.$/, '').replace(/^www\./, '');
		return host || null;
	} catch {
		return null;
	}
}

/** The redirect service an address goes through, or null. Never throws. */
export function redirectorFor(url: string): { host: string; name: string } | null {
	const host = hostOf(typeof url === 'string' ? url : '');
	if (!host) return null;
	return REDIRECTORS.find((r) => host === r.host || host.endsWith(`.${r.host}`)) ?? null;
}
