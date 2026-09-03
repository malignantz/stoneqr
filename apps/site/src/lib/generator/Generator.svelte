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

	// Basic shows the controls most people need; Advanced shows everything. Remembered per browser.
	const MODE_KEY = 'stoneqr.mode';
	let advanced = $state(false);
	function setMode(next: boolean) {
		advanced = next;
		try {
			localStorage.setItem(MODE_KEY, next ? 'advanced' : 'basic');
		} catch {
			/* private mode or storage disabled: the choice just does not persist */
		}
	}

	onMount(() => {
		try {
			advanced = localStorage.getItem(MODE_KEY) === 'advanced';
		} catch {
			/* see above */
		}
		// Return leg of the dynamic hand-off: ?short=<https://su.city/q/slug>
		const short = page.url.searchParams.get('short');
		if (short && /^https:\/\//.test(short)) {
			design.shortUrl = short;
			history.replaceState(null, '', page.url.pathname);
		}
	});

	const inUse = $derived(design.advancedInUse);
</script>

<div class="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:pt-8">
	<div class="flex flex-wrap items-center justify-end gap-3">
		<span class="ticket">Controls</span>
		<div class="seg" role="group" aria-label="Control set">
			<button type="button" aria-pressed={!advanced} onclick={() => setMode(false)}>Basic</button>
			<button type="button" aria-pressed={advanced} onclick={() => setMode(true)}>Advanced</button>
		</div>
	</div>
	{#if !advanced && inUse.length}
		<p class="notice notice-info mt-3 max-w-none">
			Advanced settings still apply: {inUse.join(', ')}.
			<button type="button" class="underline" onclick={() => setMode(true)}>Switch to Advanced</button> to change them.
		</p>
	{/if}
</div>

<div class="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)_minmax(0,22rem)] lg:gap-8 lg:py-8">
	<div class="sheet order-2 p-5 lg:order-1 lg:p-6">
		<ContentForm {design} {lockType} />
		<hr class="rule my-6" />
		<StylePanel {design} open={styleOpen} {advanced} />
		{#if advanced}
			<hr class="rule my-6" />
			<HalftonePanel {design} open={design.halftoneActive} />
		{/if}
	</div>
	<div class="order-1 lg:order-2 lg:sticky lg:top-6 lg:self-start">
		<Preview {design} />
	</div>
	<div class="sheet order-3 p-5 lg:p-6">
		<ExportPanel {design} {advanced} />
	</div>
</div>
