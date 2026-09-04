/**
 * The site's icon set: 16 px stroke paths on a 16-unit grid, as path data only.
 *
 * These are strings rather than components so a caller can drop one into an existing <svg>
 * without a wrapper element, and so the whole set costs a few hundred bytes in the bundle.
 * Draw them with `<svg class="icon">{@html ICONS.chevron}</svg>`; `.icon` in app.css sets the
 * viewBox-matching size, the round caps, and `currentColor`.
 *
 * Keep every path inside 1..15 so a 1.4 stroke never clips at the edge.
 */
export const ICONS = {
	// Chrome
	chevron: '<path d="M4 6l4 4 4-4"/>',
	tick: '<path d="M3 8.5l3.5 3.5L13 4"/>',
	warning: '<path d="M8 2.5L15 14H1z"/><path d="M8 6.5v3.5"/><path d="M8 12h.01"/>',
	close: '<path d="M4 4l8 8M12 4l-8 8"/>',
	upload: '<path d="M8 11V3"/><path d="M5 6l3-3 3 3"/><path d="M2.5 11v2.5h11V11"/>',
	reset: '<path d="M13 8a5 5 0 1 1-1.6-3.7"/><path d="M13.2 2v3h-3"/>',
	dropper:
		'<path d="M9.5 3.5l3 3"/><path d="M11 2l3 3-1.5 1.5-3-3z"/><path d="M9.5 5L3 11.5V13h1.5L11 6.5z"/>',

	// Content types, in PAYLOAD_TYPES order
	url: '<path d="M6.5 9.5a2.5 2.5 0 0 0 3.5 0l2-2a2.5 2.5 0 0 0-3.5-3.5l-.6.6"/><path d="M9.5 6.5a2.5 2.5 0 0 0-3.5 0l-2 2a2.5 2.5 0 0 0 3.5 3.5l.6-.6"/>',
	text: '<path d="M3 4h10"/><path d="M3 8h10"/><path d="M3 12h6"/>',
	wifi: '<path d="M2 6.2a9 9 0 0 1 12 0"/><path d="M4.5 8.9a5.5 5.5 0 0 1 7 0"/><path d="M7 11.6a2 2 0 0 1 2 0"/><path d="M8 13.5h.01"/>',
	vcard: '<rect x="2" y="3.5" width="12" height="9" rx="1.5"/><circle cx="6" cy="7.5" r="1.5"/><path d="M3.8 11c.5-1.2 1.4-1.8 2.2-1.8s1.7.6 2.2 1.8"/><path d="M10 7h2.2"/><path d="M10 9.5h2.2"/>',
	mecard:
		'<rect x="2" y="3.5" width="12" height="9" rx="1.5"/><circle cx="8" cy="7.2" r="1.6"/><path d="M5.4 11.2c.6-1.3 1.6-2 2.6-2s2 .7 2.6 2"/>',
	email: '<rect x="2" y="3.5" width="12" height="9" rx="1.5"/><path d="M2.5 5l5.5 4 5.5-4"/>',
	sms: '<path d="M14 9.5a2 2 0 0 1-2 2H7l-4 2.5v-2.5a2 2 0 0 1-1-2v-5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2z"/>',
	tel: '<path d="M5.5 2.5l2 2.5-1.5 1.5a8 8 0 0 0 3.5 3.5L11 8.5l2.5 2-1.5 2c-3.5.6-8.6-4.5-8-8z"/>',
	geo: '<path d="M8 14s4.5-4.3 4.5-7.5a4.5 4.5 0 1 0-9 0C3.5 9.7 8 14 8 14z"/><circle cx="8" cy="6.5" r="1.7"/>',
	event:
		'<rect x="2" y="3.5" width="12" height="10" rx="1.5"/><path d="M2 6.5h12"/><path d="M5.5 2v2.5"/><path d="M10.5 2v2.5"/>'
} as const;

export type IconName = keyof typeof ICONS;

/** A complete <svg> element for the named icon, for the odd place a snippet is awkward. */
export function icon(name: IconName, size = 16): string {
	return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
}
