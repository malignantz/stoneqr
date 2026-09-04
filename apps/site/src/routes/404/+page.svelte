<script lang="ts">
	/**
	 * Prerendered to build/404.html, which Cloudflare Pages serves with a 404 status for any path
	 * it has no file for. Without it Pages falls back to index.html with a 200, and a request for
	 * a hashed asset that has not yet replicated after a deploy came back as the site's own HTML,
	 * stamped by _headers with a one-year immutable cache header, and the page stayed broken for
	 * whoever fetched it first.
	 */
	import { SITE } from '$lib/site';
</script>

<svelte:head>
	<title>Page not found · {SITE.name}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<article class="mx-auto max-w-7xl px-4 py-12 sm:px-6">
	<p class="ticket reveal">404</p>
	<h1 class="reveal reveal-2 mt-3 max-w-3xl">Nothing is set in stone here.</h1>
	<p class="reveal reveal-3 mt-5 max-w-2xl text-lg text-ink-2">
		There is no page at this address. The generator is one click away, and every code it has ever
		made still works.
	</p>
	<p class="reveal reveal-3 mt-8"><a href="/" class="btn">Open the generator</a></p>
</article>
