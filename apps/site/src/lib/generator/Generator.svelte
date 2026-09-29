<script module lang="ts">
	import { browser } from '$app/environment';
	import { Design, defaultFields } from './state.svelte';
	import type { PayloadType } from '@stoneqr/engine/payloads';
	import { apply, readSaved, readImage, type ImageKey } from './persist';
	import { readOpened, writeOpened } from './saved';
	import { History as Timeline, sameEntry, type DesignEntry } from './history';

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
	// The saved design comes back before the first render, the same way the control set does,
	// so the restored code is the first thing painted rather than a default that then changes.
	const restored = shared ? apply(shared, readSaved()) : false;
	let firstMount = true;
	/** The pictures are restored once per page load, not on every client-side navigation. */
	let imagesRestored = false;
	/** What is in IndexedDB now, so a restore does not write the picture straight back. */
	const stored: Record<ImageKey, string | undefined> = { logo: undefined, halftone: undefined };
	/** The saved design the working one came from, read with it so a reload still knows. A module-level object so the dialog can bind to it. */
	const session = $state({ opened: browser ? readOpened() : null });

	/** The three groups of the Design sheet, in tab order. */
	type DesignTab = 'style' | 'logo' | 'artistic';
	/**
	 * Which Design tab is in front, kept here for the same reason as the design: a nav click keeps
	 * the tab the visitor chose. Browser only. Prerendering shares module state across every page
	 * the build renders, so a page that asked for its own tab would leak it into the next one; the
	 * instance uses its own record there instead.
	 */
	const sharedNav = $state<{ tab: DesignTab }>({ tab: 'style' });

	/**
	 * Undo and redo, at module scope for the reason the design is: the history has to outlive the
	 * instance a client-side navigation replaces. Only the listener and the timer belong to a mount.
	 * `seeded` flips once the page's own restore is done, so the first entry is the design as the
	 * page opened it (saved design, share link, pictures from IndexedDB) and undo never reaches
	 * back past that.
	 */
	const timeline = new Timeline<DesignEntry>(100, sameEntry);
	const timelineState = $state({ seeded: false });

	/** The type the next mount opens on, left by `openInGenerator`; it beats the page's preset and the saved type once. */
	let pendingType: PayloadType | null = null;
	/**
	 * /scan's "Make this a StoneQR code": write what a code held into the shared design and leave
	 * the type for the generator the navigation to `/` is about to mount. The fields go over that
	 * type's defaults so nothing from an earlier design leaks into a code it was not part of.
	 * Browser only; `shared` does not exist while prerendering.
	 */
	export function openInGenerator(detected: { type: PayloadType; fields: Record<string, unknown> }) {
		if (!shared) return;
		(shared.fields as Record<PayloadType, unknown>)[detected.type] = { ...defaultFields()[detected.type], ...detected.fields };
		pendingType = detected.type;
	}
</script>

<script lang="ts">
	import { onMount, untrack, type Snippet } from 'svelte';
	import { page } from '$app/state';
	import Icon from '$lib/components/Icon.svelte';
	import Tabs from '$lib/components/Tabs.svelte';
	import { preloadStyled } from '$lib/styled';
	import { snapshot, compact, writeSaved, writeImage, clearSaved, clearImages, decodeHash, isDesignHash, addressFromHash, applyAddress } from './persist';
	import { defaults } from './defaults';
	import { logoIconByName } from '$lib/logo-icons';
	import ContentForm from './ContentForm.svelte';
	import Preview from './Preview.svelte';
	import LogoPanel from './LogoPanel.svelte';
	import StylePanel from './StylePanel.svelte';
	import HalftonePanel from './HalftonePanel.svelte';
	import ExportPanel from './ExportPanel.svelte';
	import SavedDesigns from './SavedDesigns.svelte';
	import { styleSummary, logoSummary, artisticSummary } from './summaries';
	import { keyAction, ownsUndo, shortcuts } from './history';
	import { undoBar, platformIsApple } from './undo.svelte';

	// `tab` is the Design tab a landing page asks for: /logo passes 'logo', /photo 'artistic'. A page
	// that passes nothing (/, /wifi, /vcard, /event) leaves the tab where the visitor put it, which
	// starts as Style: styling is what people come to StoneQR for, and the logo is one click away
	// on a tab that carries a dot once a logo is set, so it is never buried the way §8l found it.
	let {
		preset = 'url',
		tab,
		hero
	}: { preset?: PayloadType; tab?: DesignTab; hero?: Snippet } = $props();

	const design = shared ?? new Design();
	// The home page keeps the saved type on the first visit of a page load; a landing page, or
	// any later navigation, preselects its own.
	if (pendingType) {
		design.type = pendingType;
		pendingType = null;
	} else if (!(firstMount && restored && untrack(() => preset) === 'url')) design.type = untrack(() => preset);
	firstMount = false;

	const localNav = $state<{ tab: DesignTab }>({ tab: 'style' });
	const nav = browser ? sharedNav : localNav;
	// Set while initialising rather than in onMount so the prerendered page already shows its tab.
	{
		const asked = untrack(() => tab);
		if (asked) nav.tab = asked;
	}

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
		if (!imagesRestored) {
			imagesRestored = true;
			restoreImagesOrLink().catch(() => undefined).then(() => {
				timelineState.seeded = true;
				commit();
			});
		}
	});

	/**
	 * A share link in the fragment wins over the saved design: that is what opening it means. It
	 * carries no pictures, so the ones saved here are dropped rather than attached to someone
	 * else's design. Otherwise the saved pictures come back from IndexedDB. The fragment is then
	 * removed so the address bar does not keep describing a design that has since been edited.
	 *
	 * An address link (`#url=`) is the exception: it sets the content to one web address and keeps
	 * the rest of the saved design, pictures included, so it falls through to the restore below.
	 */
	async function restoreImagesOrLink() {
		const hash = location.hash;
		const address = addressFromHash(hash);
		if (address) {
			applyAddress(design, address);
			history.replaceState(null, '', location.pathname + location.search);
		}
		if (isDesignHash(hash)) {
			const saved = await decodeHash(hash);
			if (saved && apply(design, saved)) {
				design.logo = undefined;
				// A built-in icon is a name rather than a picture, so it travels: the Logo panel
				// draws it again from `logoName`. Anything else by that name was a file, and stays behind.
				if (!logoIconByName(design.logoName)) {
					design.logoName = '';
					design.logoAspect = 1;
				}
				design.halftoneImage = undefined;
				design.halftoneImageName = '';
				design.halftone = false;
				history.replaceState(null, '', location.pathname + location.search);
				// The pictures saved here were never on the design, so `keepImage` sees nothing to
				// write; delete them outright, or the next plain load would attach them to it.
				// Best effort: a store that cannot be written could not have handed the pictures back either.
				await Promise.all([writeImage('logo', undefined), writeImage('halftone', undefined)]).catch(() => undefined);
				return;
			}
		}
		const [logo, halftone] = await Promise.all([readImage('logo'), readImage('halftone')]);
		stored.logo = logo;
		stored.halftone = halftone;
		if (logo && !design.logo) design.logo = logo;
		if (halftone && !design.halftoneImage) design.halftoneImage = halftone;
		// A picture is in force from the first paint of the restored design: show the tab that owns it,
		// unless this page asked for a tab of its own (/logo keeps Logo, where "Show the logo instead" is).
		if (design.halftoneActive && !tab) nav.tab = 'artistic';
	}

	// Save as you go. Reading the snapshot inside the effect tracks every persisted field; the
	// short wait folds a slider drag into one write.
	$effect(() => {
		const s = snapshot(design);
		const t = setTimeout(() => {
			storageNote = writeSaved(s)
				? ''
				: 'This browser is not keeping your design as you work: its storage is full or switched off. Download a design file from Saved to keep it.';
		}, 300);
		return () => clearTimeout(t);
	});
	$effect(() => keepImage('logo', design.logo));
	$effect(() => keepImage('halftone', design.halftoneImage));
	/**
	 * Why the design is not being kept, shown above the tool. A picture the browser refused
	 * used to vanish without a word: the settings came back after a reload and the picture did not.
	 */
	let storageNote = $state('');
	function keepImage(key: ImageKey, dataUrl: string | undefined) {
		if (stored[key] === dataUrl) return;
		stored[key] = dataUrl;
		writeImage(key, dataUrl).then(
			() => {
				if (dataUrl) storageNote = '';
			},
			(e: unknown) => {
				if (!dataUrl) return;
				const what = key === 'logo' ? 'the logo' : 'the Artistic QR picture';
				const full = /quota/i.test(e instanceof Error ? e.message + e.name : String(e));
				storageNote = `This browser could not keep ${what} for next time${full ? ': its storage is full' : ''}. Everything else is saved as you work; download a design file from Saved to keep the picture.`;
			}
		);
	}

	// Undo and redo. An entry is the persisted record and the two pictures, held by reference. The
	// design is put into history once it has been still for 400 ms, so a slider drag is one step.
	// Applying an entry changes the design and so schedules a push, but that push equals the entry
	// the cursor is on and is folded away (see `History.push`), which is how undo leaves redo alone.
	const entryNow = (): DesignEntry => ({ saved: snapshot(design), logo: design.logo, halftoneImage: design.halftoneImage });
	let pendingPush: ReturnType<typeof setTimeout> | undefined;
	let apple = $state(false);
	/** Set for a few seconds after Start over, which is the one change that says out loud that it can be undone. */
	let cleared = $state(false);
	let clearedTimer: ReturnType<typeof setTimeout> | undefined;

	function sync() {
		undoBar.canUndo = timeline.canUndo;
		undoBar.canRedo = timeline.canRedo;
	}
	/** Put the design as it stands into history now. An entry equal to the current one is folded away. */
	function commit(entry: DesignEntry = entryNow()) {
		clearTimeout(pendingPush);
		if (!timelineState.seeded) return;
		// A real change ends the offer to undo the clearing: Undo would now step back over this instead.
		if (timeline.push(entry)) cleared = false;
		sync();
	}
	$effect(() => {
		if (!timelineState.seeded) return;
		const entry = entryNow();
		pendingPush = setTimeout(() => commit(entry), 400);
		return () => clearTimeout(pendingPush);
	});
	function travel(way: 'undo' | 'redo') {
		// A change still inside its 400 ms is kept first, so undo steps back over it rather than past it.
		commit();
		const entry = way === 'undo' ? timeline.undo() : timeline.redo();
		sync();
		if (!entry) return;
		cleared = false;
		apply(design, entry.saved);
		design.logo = entry.logo;
		design.halftoneImage = entry.halftoneImage;
	}
	onMount(() => {
		apple = platformIsApple();
		undoBar.undo = () => travel('undo');
		undoBar.redo = () => travel('redo');
		sync();
		window.addEventListener('keydown', onKey);
		return () => {
			window.removeEventListener('keydown', onKey);
			// Leaving the page (a nav click) keeps a change that was still waiting.
			commit();
			clearTimeout(clearedTimer);
			undoBar.undo = undoBar.redo = () => {};
		};
	});
	/**
	 * Undo, redo, and save from the keyboard. A text field, a select, or editable content keeps its
	 * own undo; a slider or a checkbox has none, so the key reaches the design from there. A modal
	 * (the colour picker, the saved designs, the design menu) makes the rest of the page inert, so
	 * nothing is done behind it, though the browser's save dialog is still kept away.
	 */
	function onKey(e: KeyboardEvent) {
		const act = keyAction(e);
		if (!act || e.defaultPrevented || e.isComposing) return;
		if (act === 'save') e.preventDefault();
		if (document.querySelector('dialog[open]')) return;
		if (act === 'save') {
			savedOpen = true;
			return;
		}
		if (ownsUndo(e.target as Element | null)) return;
		e.preventDefault();
		travel(act);
	}

	/** Nothing set and nothing typed: the "Start over" control has nothing to do and stays hidden. */
	const pristine = $derived(
		!design.logo && !design.halftoneImage && Object.keys(compact(snapshot(design), defaults())).length === 1
	);
	function startOver() {
		// What is on screen is the entry Undo returns to; the cleared design gets its own at once.
		commit();
		apply(design, defaults());
		design.type = preset;
		design.logo = undefined;
		design.logoName = '';
		design.halftoneImage = undefined;
		design.halftoneImageName = '';
		clearSaved();
		void clearImages();
		session.opened = null;
		writeOpened(null);
		commit();
		cleared = true;
		clearTimeout(clearedTimer);
		clearedTimer = setTimeout(() => (cleared = false), 8000);
	}

	let savedOpen = $state(false);
	let savedCount = $state(0);

	const inUse = $derived(design.advancedInUse);

	// The Design tabs. A dot means something is set inside; a struck-through label means Artistic
	// QR has switched the group off. The controls of an off group keep their values, so the tab
	// stays selectable.
	const summaries = $derived({
		style: styleSummary(design),
		logo: logoSummary(design),
		artistic: artisticSummary(design)
	});
	const designTabs = $derived([
		{ id: 'style' as const, label: 'Style', on: summaries.style !== '', off: design.halftoneActive },
		{ id: 'logo' as const, label: 'Logo', on: !!design.logo, off: design.halftoneActive },
		{ id: 'artistic' as const, label: 'Artistic QR', on: design.halftoneActive }
	]);
	/**
	 * What the tabs in the background hold, in one line, so switching tabs never hides a setting:
	 * "Logo · WiFi (built-in icon)". Empty while every inactive tab is untouched.
	 */
	const alsoSet = $derived(
		designTabs
			.filter((t) => t.id !== nav.tab && summaries[t.id] !== '')
			.map((t) => `${t.label} · ${summaries[t.id]}`)
			.join('; ')
	);
	/** Style and Logo hand styled output to a lazy chunk; opening either is the cue to fetch it. Artistic QR needs neither. */
	function tabChosen(id: DesignTab) {
		if (id !== 'artistic') preloadStyled();
	}
</script>

<!-- On wide screens the page's heading shares a row with the control toggle, so the tool starts right under the fold. -->
<div class="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
	<!-- Below lg the heading owns the full width and the toggle sits under it. Sharing the row is
	     an lg-and-up rule rather than a flex-basis guess, so a heading can never collapse into a
	     narrow column next to the toggle on a phone. -->
	<div class="flex flex-col items-start gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-x-8">
		<div class="w-full min-w-0 lg:flex-1">{@render hero?.()}</div>
		<div class="flex shrink-0 items-center lg:pb-1">
			<div class="seg" role="group" aria-label="Control set">
				<button type="button" aria-pressed={!advanced} onclick={() => setMode(false)}>Basic</button>
				<button type="button" aria-pressed={advanced} onclick={() => setMode(true)}>Advanced</button>
			</div>
		</div>
	</div>
	{#if storageNote}
		<p class="notice notice-warn mt-3 max-w-none" role="status">
			<Icon name="warning" size={15} />
			<span>{storageNote}</span>
		</p>
	{/if}
	{#if cleared}
		<div class="notice notice-info mt-3 max-w-none" role="status">
			<span>
				Cleared. Undo brings it back ({shortcuts(apple).undo}).
				<button type="button" class="underline" onclick={() => travel('undo')}>Undo</button>
			</span>
		</div>
	{/if}
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
  Below lg this is one column and the order is Content, Preview, Design (tabs: Style, Logo,
  Artistic QR), Size and download: someone on a phone meets the form they have to fill in before
  the card that tells them to fill it in. The left column is `display: contents` there, so its two
  sheets take part in the single-column order individually; at lg it becomes a normal block and
  they stack in the first column as before. The bottom padding leaves room for the pinned preview bar.

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
			<ContentForm {design} {advanced} {pristine} onstartover={startOver} {savedCount} onsaved={() => (savedOpen = true)} />
		</div>
		<div class="sheet order-3 p-5 lg:p-6">
			<Tabs tabs={designTabs} bind:value={nav.tab} ariaLabel="Design" onselect={tabChosen} />
			{#if alsoSet}
				<p class="ticket tabs-also">Also set: {alsoSet}</p>
			{/if}
			<!--
			  All three panels stay mounted whichever tab shows; a panel only stops drawing its body.
			  LogoPanel keeps a built-in icon following the code colour from a script-level effect, and
			  that must go on running while Style is in front, so a hidden tab is never an unmounted one.
			-->
			<div role="tabpanel" id="design-tab-style" aria-labelledby="design-tabbutton-style" class="tabs-panel" hidden={nav.tab !== 'style'}>
				<StylePanel {design} {advanced} tabbed open={nav.tab === 'style'} />
			</div>
			<div role="tabpanel" id="design-tab-logo" aria-labelledby="design-tabbutton-logo" class="tabs-panel" hidden={nav.tab !== 'logo'}>
				<LogoPanel {design} {advanced} tabbed open={nav.tab === 'logo'} />
			</div>
			<div role="tabpanel" id="design-tab-artistic" aria-labelledby="design-tabbutton-artistic" class="tabs-panel" hidden={nav.tab !== 'artistic'}>
				<HalftonePanel {design} {advanced} tabbed open={nav.tab === 'artistic'} />
			</div>
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
<SavedDesigns {design} {pristine} bind:open={savedOpen} bind:count={savedCount} bind:opened={session.opened} />
