<script lang="ts">
	import { page } from '$app/state';
	import { SITE } from '$lib/site';
	import { OG_IMAGES } from '$lib/og-images';

	let {
		title,
		description,
		path = page.url.pathname,
		schema = []
	}: {
		title: string;
		description: string;
		path?: string;
		/** Extra schema.org nodes for this page, added to the WebSite and WebPage nodes every page carries. */
		schema?: Record<string, unknown>[];
	} = $props();

	const full = $derived(title === SITE.name ? title : `${title} · ${SITE.name}`);
	const slug = $derived(path.replace(/^\/|\/$/g, ''));
	const canonical = $derived(`${SITE.url}${path === '/' ? '/' : path.replace(/\/$/, '')}`);
	// A card per route, drawn by `bun run og`; anything without one shares the home card.
	const image = $derived(`${SITE.url}${OG_IMAGES.has(slug) ? `/og/${slug}.png` : '/og.png'}`);

	// Structured data. Search engines read it; the CSP does not apply because ld+json never executes.
	// `<` is escaped so no description can close the script element early.
	const jsonLd = $derived(
		JSON.stringify({
			'@context': 'https://schema.org',
			'@graph': [
				{ '@type': 'WebSite', '@id': `${SITE.url}/#website`, name: SITE.name, url: `${SITE.url}/` },
				{
					'@type': 'WebPage',
					'@id': canonical,
					url: canonical,
					name: full,
					description,
					isPartOf: { '@id': `${SITE.url}/#website` },
					primaryImageOfPage: image
				},
				...schema
			]
		}).replace(/</g, '\\u003c')
	);
</script>

<svelte:head>
	<title>{full}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={canonical} />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content={SITE.name} />
	<meta property="og:title" content={full} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={canonical} />
	<meta property="og:image" content={image} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:alt" content={full} />
	<meta name="twitter:card" content="summary_large_image" />
	{@html `<script type="application/ld+json">${jsonLd}</script>`}
</svelte:head>
