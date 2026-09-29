/**
 * Split a web address into the parts a reader needs to judge it, without sending it anywhere.
 * One module for every page that shows an address (the preview's Inspector and /scan), so the
 * two never disagree about which part is the host: the host is what the browser would go to,
 * not what the text seems to say. Nothing here opens, fetches, or resolves an address, and a
 * page using it must not render one as a link.
 *
 * Pure: no DOM (the URL parser is the platform's, in the browser and in Node), tested in
 * `apps/site/test/links.test.ts`.
 */

export interface LinkParts {
	/** `http://` or `https://`, as written (with any extra slashes a browser would skip). */
	scheme: string;
	/** Text before an `@` in the address, without the `@`; empty when there is none. The site is the host after it. */
	userinfo: string;
	/** The host as the browser would use it: lower-cased, and `xn--` for a name in another alphabet. */
	host: string;
	/** The port digits as written, without the colon; empty when there is none. */
	port: string;
	/** Everything after the host and port, as written: path, query, fragment. May be empty. */
	rest: string;
	/** The host is written in another alphabet (`xn--`), which can look like ordinary letters. */
	nonLatin: boolean;
}

/** Split an http(s) address; null for anything else (plain text, `mailto:`, `WIFI:`, a sentence that starts with a scheme). */
export function splitLink(text: string): LinkParts | null {
	// Whitespace inside means it is a sentence that happens to start with a scheme, not an address.
	if (!/^https?:\/\/\S+$/i.test(text)) return null;
	let url: URL;
	try {
		url = new URL(text);
	} catch {
		return null;
	}
	if (!url.hostname) return null;
	// Browsers ignore extra slashes after the scheme, so `https:///a.example` goes to a.example; keep them in the scheme.
	const scheme = /^https?:[/\\]+/i.exec(text)![0];
	const afterScheme = text.slice(scheme.length);
	// A backslash ends the authority too: browsers read `https://a.example\@b.example` as going to a.example.
	const authorityEnd = afterScheme.search(/[/?#\\]/);
	const authority = authorityEnd < 0 ? afterScheme : afterScheme.slice(0, authorityEnd);
	const rest = authorityEnd < 0 ? '' : afterScheme.slice(authorityEnd);
	const at = authority.lastIndexOf('@');
	const port = /:(\d+)$/.exec(authority.slice(at + 1))?.[1] ?? '';
	return {
		scheme,
		userinfo: at < 0 ? '' : authority.slice(0, at),
		host: url.hostname,
		port,
		rest,
		nonLatin: url.hostname.split('.').some((label) => label.startsWith('xn--'))
	};
}
