<script lang="ts" module>
	/** What the share did: the link, and whether the clipboard took it. The heading's notice says the rest. */
	export type Shared = { link: string; copied: boolean };
</script>

<script lang="ts">
	/**
	 * The design menu: one three-dot button in the Content heading that holds what used to be two
	 * text links there ("Save", "Start over") and the share link that used to sit under the download
	 * buttons. It is always shown, also while there is nothing to save.
	 *
	 * The card is a modal <dialog> opened with showModal(), the same pattern as `ColourPopover` and
	 * for the same reason: the browser makes the rest of the page inert, so a press outside the card
	 * lands on the dialog's own backdrop, closes the menu, and is swallowed instead of pressing
	 * whatever sits underneath. The Popover API's light dismiss and a document click listener both
	 * let that press through, so neither is used here. It closes on scroll and resize rather than
	 * following the button around.
	 *
	 * The items are a list. Undo and Redo sit at the top, and Generator keeps them true (it owns the
	 * history and the keys) through `undoBar`, so the menu needs no props for them.
	 */
	import { tick } from 'svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { snapshot, compact, encodeHash } from './persist';
	import { defaults } from './defaults';
	import { shortcuts } from './history';
	import { undoBar, platformIsApple } from './undo.svelte';
	import type { Design } from './state.svelte';

	let {
		design,
		pristine = true,
		savedCount = 0,
		onsaved,
		onstartover,
		onshared
	}: {
		design: Design;
		pristine?: boolean;
		savedCount?: number;
		onsaved?: () => void;
		onstartover?: () => void;
		onshared?: (shared: Shared) => void;
	} = $props();

	type Item = {
		id: string;
		label: string;
		/** The keyboard shortcut, shown at the right in the quiet ink. */
		hint?: string;
		disabled?: boolean;
		/** True asks once before running: the first press changes the label, the second runs it. */
		confirm?: boolean;
		run: () => void;
	};

	/** The item waiting for its second press, for four seconds. */
	let armed = $state<string | null>(null);
	let armTimer: ReturnType<typeof setTimeout> | undefined;

	// Set from an effect, so the prerendered menu (Windows labels) and the first client render agree.
	let apple = $state(false);
	$effect(() => {
		apple = platformIsApple();
	});
	const hints = $derived(shortcuts(apple));

	const items = $derived<Item[]>([
		{ id: 'undo', label: 'Undo', hint: hints.undo, disabled: !undoBar.canUndo, run: () => undoBar.undo() },
		{ id: 'redo', label: 'Redo', hint: hints.redo, disabled: !undoBar.canRedo, run: () => undoBar.redo() },
		{ id: 'save', label: savedCount ? `Saved designs (${savedCount})` : 'Save this design…', hint: hints.save, run: () => onsaved?.() },
		{ id: 'link', label: 'Copy a link to this design', run: () => void copyLink() },
		{ id: 'reset', label: armed === 'reset' ? 'Clear everything?' : 'Start over', disabled: pristine, confirm: true, run: () => onstartover?.() }
	]);

	let trigger = $state<HTMLButtonElement>();
	let dialog = $state<HTMLDialogElement>();
	let open = $state(false);
	let pos = $state({ left: 0, top: 0 });

	/** Right edge under the button's, below it when there is room and above when there is not, always inside the viewport. */
	function place() {
		if (!trigger) return;
		const r = trigger.getBoundingClientRect();
		const W = dialog?.offsetWidth || 255;
		const H = dialog?.offsetHeight || items.length * 44 + 12;
		const gap = 6;
		const margin = 8;
		const vw = window.innerWidth;
		const vh = window.innerHeight;
		const below = r.bottom + gap;
		const wanted = below + H + margin <= vh ? below : r.top - gap - H;
		const clamp = (n: number, hi: number) => Math.max(margin, Math.min(n, Math.max(margin, hi)));
		pos = { left: clamp(r.right - W, vw - W - margin), top: clamp(wanted, vh - H - margin) };
	}

	function show() {
		if (!dialog || dialog.open) return;
		place();
		open = true;
		dialog.showModal();
		tick().then(() => {
			place();
			dialog?.querySelector<HTMLElement>('[role="menuitem"]:not(:disabled)')?.focus();
		});
	}

	function close() {
		if (dialog?.open) dialog.close();
	}

	/** Runs for every way the card can close: an item, Escape, the backdrop, scrolling. */
	function closed() {
		open = false;
		armed = null;
		clearTimeout(armTimer);
		trigger?.focus();
	}

	$effect(() => () => clearTimeout(armTimer));

	$effect(() => {
		if (!open) return;
		const shut = () => close();
		window.addEventListener('scroll', shut, { capture: true, passive: true });
		window.addEventListener('resize', shut);
		return () => {
			window.removeEventListener('scroll', shut, { capture: true });
			window.removeEventListener('resize', shut);
		};
	});

	function activate(item: Item) {
		if (item.confirm && armed !== item.id) {
			// Starting over takes the saved copy with it, so it asks first, in place.
			armed = item.id;
			clearTimeout(armTimer);
			armTimer = setTimeout(() => (armed = null), 4000);
			return;
		}
		// Close before running: the saved-designs list is a modal of its own and cannot open over this one.
		close();
		item.run();
	}

	/** Up, Down, Home, and End move between the items; Tab leaves the menu, as it does in a menu bar. */
	function keys(e: KeyboardEvent) {
		if (e.key === 'Tab') {
			e.preventDefault();
			close();
			return;
		}
		const els = [...(dialog?.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)') ?? [])];
		if (!els.length) return;
		const at = els.indexOf(document.activeElement as HTMLElement);
		let to: number;
		if (e.key === 'ArrowDown') to = (at + 1) % els.length;
		else if (e.key === 'ArrowUp') to = at <= 0 ? els.length - 1 : at - 1;
		else if (e.key === 'Home') to = 0;
		else if (e.key === 'End') to = els.length - 1;
		else return;
		e.preventDefault();
		els[to].focus();
	}

	/**
	 * The share link: the design's settings and typed content, deflated into the URL fragment. A
	 * fragment never reaches a server, and this only ever goes to the clipboard, so the site's
	 * promise holds; what it does reach is whoever the link is given to, which the notice says.
	 * The link is built before the write starts and handed to the clipboard as a promise, because
	 * Safari only accepts a write made inside the press, and compressing takes a moment.
	 */
	async function copyLink() {
		const linkPromise = (async () => `${location.origin}/${await encodeHash(compact(snapshot(design), defaults()))}`)();
		let copied = false;
		try {
			if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
				const blob = linkPromise.then((l) => new Blob([l], { type: 'text/plain' }));
				await navigator.clipboard.write([new ClipboardItem({ 'text/plain': blob })]);
			} else {
				await navigator.clipboard.writeText(await linkPromise);
			}
			copied = true;
		} catch {
			/* no clipboard access: the notice shows the link to copy by hand */
		}
		onshared?.({ link: await linkPromise.catch(() => ''), copied });
	}
</script>

<button
	bind:this={trigger}
	type="button"
	class="menu-trigger"
	aria-label="Design menu"
	aria-haspopup="menu"
	aria-expanded={open}
	onclick={show}
>
	<Icon name="more" size={18} width={2.6} />
</button>

<dialog
	bind:this={dialog}
	class="menu"
	style="left: {pos.left}px; top: {pos.top}px"
	aria-label="Design menu"
	onclose={closed}
	onkeydown={keys}
	onpointerdown={(e) => {
		// The backdrop reports the dialog itself as the target. A press on an item hits a child.
		if (e.target === e.currentTarget) close();
	}}
>
	<div class="menu-list" role="menu" aria-label="Design menu">
		{#each items as item (item.id)}
			<button
				type="button"
				role="menuitem"
				class="menu-item {armed === item.id ? 'text-block' : ''}"
				disabled={item.disabled}
				onclick={() => activate(item)}
			>
				<span class="flex items-baseline justify-between gap-6">
					<span>{item.label}</span>
					{#if item.hint}<span class="text-xs text-ink-3">{item.hint}</span>{/if}
				</span>
			</button>
		{/each}
	</div>
</dialog>
