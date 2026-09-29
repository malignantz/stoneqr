<script lang="ts">
	/**
	 * What the code contains, in words, under the preview: the site's promise made visible. The
	 * payload is the whole of it, since a QR code holds only the text it encodes and nothing else,
	 * so this line is the code's entire content and nothing here is a summary.
	 *
	 * One line with an ellipsis, and a disclosure that shows it in full (mono, wrapping, selectable).
	 * The byte count is Advanced only. For an address the host is set in the text colour and the
	 * rest fainter, so a lookalike domain or a login tucked in front of the real one is easy to
	 * see; it is never a link, because a page that lets you click what a code holds is a way to be
	 * sent somewhere. When the host is a redirect service the shared note says so.
	 */
	import Icon from '$lib/components/Icon.svelte';
	import RedirectNote from '$lib/components/RedirectNote.svelte';
	import { splitLink } from '$lib/links';
	import type { Design } from './state.svelte';

	let { design, advanced = false }: { design: Design; advanced?: boolean } = $props();

	let open = $state(false);

	const payload = $derived(design.payload);
	const bytes = $derived(new TextEncoder().encode(payload).length);
	// The parts come from `lib/links.ts`, shared with /scan, so both pages agree on the host. The
	// line shows the host as the browser reads it (lower-cased, `xn--` for another alphabet); the
	// full view below is the text exactly as the code holds it.
	const link = $derived(design.type === 'url' ? splitLink(payload) : null);
</script>

{#if payload}
	<div class="inspector">
		<div class="inspector-line">
			<span class="ticket shrink-0">Contains</span>
			<span class="inspector-text" title={open ? undefined : payload}>
				{#if link}<span class="text-ink-3">{link.scheme}{link.userinfo ? `${link.userinfo}@` : ''}</span><b class="font-semibold text-ink">{link.host}</b><span class="text-ink-3">{link.port ? `:${link.port}` : ''}{link.rest}</span>{:else}{payload}{/if}
			</span>
			<button type="button" class="inspector-toggle" aria-expanded={open} aria-controls="inspector-full" onclick={() => (open = !open)}>
				{open ? 'Hide' : 'Show all'}
				<Icon name="chevron" size={12} />
			</button>
		</div>
		{#if open}
			<div id="inspector-full" class="inspector-full">
				<p class="inspector-payload">{payload}</p>
				{#if advanced}
					<p class="num text-xs text-ink-3">{bytes} {bytes === 1 ? 'byte' : 'bytes'}</p>
				{/if}
			</div>
		{/if}
		{#if link}
			<RedirectNote url={payload} />
		{/if}
	</div>
{/if}
