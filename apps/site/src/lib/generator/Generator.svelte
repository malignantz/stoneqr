<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { page } from '$app/state';
	import type { PayloadType } from '@stoneqr/engine/payloads';
	import { Design } from './state.svelte';
	import ContentForm from './ContentForm.svelte';
	import Preview from './Preview.svelte';
	import StylePanel from './StylePanel.svelte';
	import HalftonePanel from './HalftonePanel.svelte';
	import ExportPanel from './ExportPanel.svelte';

	let { preset = 'url', lockType = false, styleOpen = false }: { preset?: PayloadType; lockType?: boolean; styleOpen?: boolean } = $props();

	const design = new Design();
	design.type = untrack(() => preset);

	onMount(() => {
		// Return leg of the dynamic hand-off: ?short=<https://su.city/q/slug>
		const short = page.url.searchParams.get('short');
		if (short && /^https:\/\//.test(short)) {
			design.shortUrl = short;
			history.replaceState(null, '', page.url.pathname);
		}
	});
</script>

<div class="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)_minmax(0,22rem)] lg:gap-8 lg:py-8">
	<div class="sheet order-2 p-5 lg:order-1 lg:p-6">
		<ContentForm {design} {lockType} />
		<hr class="rule my-6" />
		<StylePanel {design} open={styleOpen} />
		<hr class="rule my-6" />
		<HalftonePanel {design} />
	</div>
	<div class="order-1 lg:order-2 lg:sticky lg:top-6 lg:self-start">
		<Preview {design} />
	</div>
	<div class="sheet order-3 p-5 lg:p-6">
		<ExportPanel {design} />
	</div>
</div>
