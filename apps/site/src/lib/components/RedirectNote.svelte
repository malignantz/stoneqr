<script lang="ts">
	/**
	 * The plain warning for an address that goes through a redirect service. One component so the
	 * words are the same under the Link field, in the preview's Inspector, and on /scan. It says
	 * what a redirect is; it claims nothing about the company (see `docs/claims.md`).
	 */
	import { redirectorFor } from '$lib/redirectors';

	let { url }: { url: string } = $props();

	const redirector = $derived(redirectorFor(url));
</script>

{#if redirector}
	<p class="notice notice-info">
		This address goes through {redirector.name}, a redirect service. Whoever runs it decides where the link leads, and can change it or switch it off.
	</p>
{/if}
