<script module lang="ts">
	import { browser } from '$app/environment';
	import { Design } from './state.svelte';

	// One design per browser session. The landing pages (/wifi, /vcard, /event, /logo, /photo)
	// mount this same component, so keeping the state here means a nav click only changes the
	// preselected type: size, style, and everything typed so far survive the navigation.
	//
	// It is built here, at module scope, and never inside the instance. A $derived created while a
	// component is initialising belongs to that component's effect, and every field of Design is a
	// $derived; a client-side navigation destroys the first Generator, which would leave the whole
	// graph (payload, encoded, plainSvg, isEmpty, status) inert and frozen at its last value, so the
	// preview would sit on "Rendering…" until a full page load. Module scope has no owning effect.
	// Prerendering gets a fresh instance per page instead, so no state leaks between routes at build time.
	const shared = browser ? new Design() : undefined;
</script>

<script lang="ts">
	import { onMount, untrack, type Snippet } from 'svelte';
	import { page } from '$app/state';
	import type { PayloadType } from '@stoneqr/engine/payloads';
	import Icon from '$lib/components/Icon.svelte';
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

	const design = shared ?? new Design();
	design.type = untrack(() => preset);

	// Basic shows the controls most people need; Advanced shows everything. Remembered per browser.
	//
	// Read synchronously on the client rather than in onMount: the prerendered HTML is Basic, and
	// a saved Advanced choice applied after mount painted Basic first and then rebuilt the panels.
	// Svelte recovers from an {#if} that differs from the server by rendering that branch afresh,
	// so the first client render is already Advanced; app.html and app.css hold the tool
	// invisible until then (see the data-hydrated stamp in onMount).
	const MODE_KEY = 'stoneqr.mode';
	let advanced = $state(readMode());
	function readMode(): boolean {
		if (!browser) return false;
		try {
			return localStorage.getItem(MODE_KEY) === 'advanced';
		} catch {
			return false;
		}
	}
	function setMode(next: boolean) {
		advanced = next;
		try {
			localStorage.setItem(MODE_KEY, next ? 'advanced' : 'basic');
		} catch {
			/* private mode or storage disabled: the choice just does not persist */
		}
	}

	onMount(() => {
		// The generator is in the DOM in the saved control set: let app.css show it.
		document.documentElement.dataset.hydrated = '';
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
			<span class="ticket">Show</span>
			<div class="seg" role="group" aria-label="Control set">
				<button type="button" aria-pressed={!advanced} onclick={() => setMode(false)}>Basic</button>
				<button type="button" aria-pressed={advanced} onclick={() => setMode(true)}>Advanced</button>
			</div>
		</div>
	</div>
	{#if !advanced && inUse.length}
		<p class="notice notice-info mt-3 max-w-none">
			<Icon name="warning" size={15} />
			<span>
				Advanced settings still apply: {inUse.join(', ')}.
				<button type="button" class="underline" onclick={() => setMode(true)}>Switch to Advanced</button> to change them.
			</span>
		</p>
	{/if}
</div>

<!--
  Below lg this is one column and the order is Content, Preview, Style, Photo QR, Size and
  download: someone on a phone meets the form they have to fill in before the card that tells
  them to fill it in. The left column is `display: contents` there, so its two sheets take part
  in the single-column order individually; at lg it becomes a normal block and they stack in the
  first column as before. The bottom padding leaves room for the pinned preview bar.

  The side columns hold back to 18rem between lg and xl. At a flat 22rem the three columns eat
  everything at 1024 px and leave the preview about 208 px, which crushed the caption strip and
  the figures under the code.
-->
<div
	id="generator"
	class="mx-auto grid max-w-7xl gap-6 px-4 pt-5 pb-24 sm:px-6 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)_minmax(0,18rem)] lg:gap-8 lg:pb-8 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)_minmax(0,22rem)]"
>
	<div class="contents lg:order-1 lg:block lg:space-y-6">
		<div class="sheet order-1 p-5 lg:p-6">
			<ContentForm {design} />
		</div>
		<div class="sheet order-3 p-5 lg:p-6">
			<StylePanel {design} open={styleOpen} {advanced} />
			<hr class="rule my-6" />
			<HalftonePanel {design} open={photoOpen || design.halftoneActive} {advanced} />
		</div>
	</div>
	<div class="order-2 lg:order-2 lg:sticky lg:top-6 lg:self-start">
		<Preview {design} {advanced} />
	</div>
	<!-- self-start: the sheet hugs its content instead of stretching to the height of the Style column beside it. -->
	<div class="sheet order-4 p-5 lg:order-3 lg:self-start lg:p-6">
		<ExportPanel {design} {advanced} />
	</div>
</div>
