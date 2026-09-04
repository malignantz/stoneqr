<script module lang="ts">
	// One design per browser session. The landing pages (/wifi, /vcard, /event, /logo) mount
	// this same component, so keeping the state here means a nav click only changes the
	// preselected type: size, style, and everything typed so far survive the navigation.
	let shared: Design | undefined;
</script>

<script lang="ts">
	import { onMount, untrack, type Snippet } from 'svelte';
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import type { PayloadType } from '@stoneqr/engine/payloads';
	import { Design } from './state.svelte';
	import ContentForm from './ContentForm.svelte';
	import Preview from './Preview.svelte';
	import StylePanel from './StylePanel.svelte';
	import HalftonePanel from './HalftonePanel.svelte';
	import ExportPanel from './ExportPanel.svelte';

	let {
		preset = 'url',
		styleOpen = false,
		photoOpen = false,
		hero
	}: { preset?: PayloadType; styleOpen?: boolean; photoOpen?: boolean; hero?: Snippet } = $props();

	// Prerendering gets a fresh instance per page so no state leaks between routes at build time.
	const design = browser ? (shared ??= new Design()) : new Design();
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

<!-- On wide screens the page's heading shares a row with the control toggle, so the tool starts right under the fold. -->
<div class="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
	<!-- Below lg the heading owns the full width and the toggle sits under it. Sharing the row is
	     an lg-and-up rule rather than a flex-basis guess, so a heading can never collapse into a
	     narrow column next to the toggle on a phone. -->
	<div class="flex flex-col items-start gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-x-8">
		<div class="w-full min-w-0 lg:flex-1">{@render hero?.()}</div>
		<div class="flex shrink-0 items-center gap-3 lg:pb-1">
			<span class="ticket">Controls</span>
			<div class="seg" role="group" aria-label="Control set">
				<button type="button" aria-pressed={!advanced} onclick={() => setMode(false)}>Basic</button>
				<button type="button" aria-pressed={advanced} onclick={() => setMode(true)}>Advanced</button>
			</div>
		</div>
	</div>
	{#if !advanced && inUse.length}
		<p class="notice notice-info mt-3 max-w-none">
			Advanced settings still apply: {inUse.join(', ')}.
			<button type="button" class="underline" onclick={() => setMode(true)}>Switch to Advanced</button> to change them.
		</p>
	{/if}
</div>

<div class="mx-auto grid max-w-7xl gap-6 px-4 pt-5 pb-6 sm:px-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)_minmax(0,22rem)] lg:gap-8 lg:pb-8">
	<div class="sheet order-2 p-5 lg:order-1 lg:p-6">
		<ContentForm {design} />
		<hr class="rule my-6" />
		<StylePanel {design} open={styleOpen} {advanced} />
		<hr class="rule my-6" />
		<HalftonePanel {design} open={photoOpen || design.halftoneActive} {advanced} />
	</div>
	<div class="order-1 lg:order-2 lg:sticky lg:top-6 lg:self-start">
		<Preview {design} />
	</div>
	<div class="sheet order-3 p-5 lg:p-6">
		<ExportPanel {design} {advanced} />
	</div>
</div>
