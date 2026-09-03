export const SITE = {
	name: 'StoneQR',
	url: 'https://stoneqr.app',
	tagline: 'QR codes set in stone. Generated in your browser, never expire.',
	promise: 'Generated on your device. Never expires. Nothing was uploaded.',
	repo: 'https://github.com/malignantz/stoneqr',
	signupcity: 'https://signupcity.app'
} as const;

export const NAV = [
	{ href: '/', label: 'Generator' },
	{ href: '/print-size', label: 'Print size' },
	{ href: '/wifi', label: 'WiFi' },
	{ href: '/vcard', label: 'vCard' },
	{ href: '/bulk', label: 'Bulk' },
	{ href: '/never-expires', label: 'Never expires' },
	{ href: '/open-source', label: 'Open source' }
] as const;
