<script lang="ts">
	import { page } from '$app/state';
	import { SITE } from '$lib/site';

	let {
		title,
		description,
		path = page.url.pathname
	}: { title: string; description: string; path?: string } = $props();

	const full = $derived(title === SITE.name ? title : `${title} · ${SITE.name}`);
	const canonical = $derived(`${SITE.url}${path === '/' ? '' : path.replace(/\/$/, '')}`);
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
	<meta property="og:image" content="{SITE.url}/og.png" />
	<meta name="twitter:card" content="summary_large_image" />
</svelte:head>
