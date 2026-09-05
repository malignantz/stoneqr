<script lang="ts">
	/**
	 * The phone-only bar that pins to the bottom of the viewport once the preview card has
	 * scrolled away, carrying a thumbnail of the current render, the decode badge, and the
	 * primary download. It is the "sticky preview" the plan asked for, done in a way that does
	 * not spend the first screen on an empty card.
	 *
	 * It shows only while the generator itself is on screen, so it never sits over the footer or
	 * the explainer text below the tool.
	 */
	import Icon from '$lib/components/Icon.svelte';
	import type { Design } from '$lib/generator/state.svelte';

	let {
		design,
		label,
		disabled = false,
		busy = false,
		onDownload
	}: {
		design: Design;
		label: string;
		disabled?: boolean;
		busy?: boolean;
		onDownload: () => void;
	} = $props();

	let past = $state(false);
	let inTool = $state(false);
	const svg = $derived(design.styled ? design.styledSvg : design.plainSvg);
	const show = $derived(past && inTool && !design.isEmpty);

	/**
	 * Found by id rather than threaded through as refs: the two elements are in different
	 * branches of the generator's grid, and passing a DOM node up through props to get it back
	 * down here would be more moving parts than the two ids are worth.
	 */
	$effect(() => {
		const card = document.getElementById('preview-card');
		const tool = document.getElementById('generator');
		if (!card || !tool) return;
		const io = new IntersectionObserver(
			(entries) => {
				for (const e of entries) {
					if (e.target === card) past = !e.isIntersecting;
					else if (e.target === tool) inTool = e.isIntersecting;
				}
			},
			{ threshold: 0 }
		);
		io.observe(card);
		io.observe(tool);
		return () => io.disconnect();
	});
</script>

<div class="preview-bar lg:hidden" data-show={show} aria-hidden={!show}>
	<div class="mx-auto flex max-w-7xl items-center gap-3 px-4">
		<div class="preview-bar-thumb" style="background: white">
			{#if design.halftoneActive && design.halftonePreviewUrl}
				<img src={design.halftonePreviewUrl} alt="" class="h-full w-full object-contain [image-rendering:pixelated]" />
			{:else if svg}
				<div class="h-full w-full [&>svg]:h-full [&>svg]:w-full">{@html svg}</div>
			{/if}
		</div>
		<div class="min-w-0 flex-1">
			{#if design.verify === 'ok'}
				<span class="badge badge-ok"><Icon name="tick" size={10} width={2} /> Scannable</span>
			{:else if design.verify === 'fail'}
				<span class="badge badge-block">Did not decode</span>
			{:else}
				<span class="badge badge-muted">Checking…</span>
			{/if}
		</div>
		<button type="button" class="btn btn-accent btn-sm shrink-0" disabled={disabled || busy} onclick={onDownload} tabindex={show ? 0 : -1}>
			{busy ? 'Working…' : label}
		</button>
	</div>
</div>
