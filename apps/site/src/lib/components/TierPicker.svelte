<script lang="ts">
	/**
	 * Basic's print size: the four tiers in `sizes.ts` as one row of tiles, and one sentence under
	 * them for the chosen tier. Four tall cards spent 560 px saying what one sentence says.
	 *
	 * A width set by hand in Advanced matches no tier, so it appears as a fifth, chosen "Custom"
	 * tile on a row of its own; nothing is ever silently in force. It sits in the radio group, so
	 * the arrow keys walk off it onto a tier, which replaces it.
	 *
	 * Four across or two by two is decided by the picker's own width (a container query in the
	 * `tier` block of app.css), not the window's: the same column is 22 rem at 1440 px and 18 rem
	 * between `lg` and `xl`.
	 */
	import { formatMm } from '@stoneqr/engine';
	import { SIZE_TIERS, tierFor, tierFit, tierDistance, formatIn, type TierFit } from '$lib/generator/sizes';
	import { radioKeys } from './radiogroup';
	import Icon from './Icon.svelte';

	let {
		widthMm,
		size = null,
		quiet = 4,
		onpick
	}: {
		/** The width in force, in mm. */
		widthMm: number;
		/** Modules a side of the code being sized, or null when there is no content yet. */
		size?: number | null;
		/** Quiet zone in modules, for the fit check. */
		quiet?: number;
		/** Called with the chosen tier's width in mm. */
		onpick: (mm: number) => void;
	} = $props();

	const hintId = $props.id();
	const fitLabel = { good: '', tight: 'Tight for this content', small: 'Too small for this content' } as const;

	const tier = $derived(tierFor(widthMm));
	const fitOf = (mm: number): TierFit => (size ? tierFit(mm, size, quiet) : 'good');
	const known = $derived(Number.isFinite(widthMm) && widthMm > 0);
	const chosenFit = $derived(fitOf(widthMm));
	/** "Flyers, menus, table tents, handouts. Read across a table, up to about 50 cm (20 in)." */
	const sentence = $derived(
		tier ? `${tier.uses} ${tierDistance(tier)}.` : 'Set in Advanced. Pick a size to replace it.'
	);
</script>

<div class="tier-picker">
	<div class="tier-grid" role="radiogroup" aria-label="Print size" aria-describedby={hintId} use:radioKeys>
		{#each SIZE_TIERS as t (t.id)}
			{@const fit = fitOf(t.mm)}
			{@const on = tier?.id === t.id}
			<button
				type="button"
				class="tier-tile"
				role="radio"
				aria-checked={on}
				tabindex={on ? 0 : -1}
				data-on={on}
				data-fit={fit}
				title={fitLabel[fit] || undefined}
				onclick={() => onpick(t.mm)}
			>
				{#if fit !== 'good'}<span class="tier-mark" aria-hidden="true"><Icon name="warning" size={12} /></span>{/if}
				<span class="tier-name">{t.name}</span>
				<span class="tier-use">{t.short}</span>
				<span class="tier-size num">
					<span>{t.mm} mm</span><span class="tier-sep" aria-hidden="true">·</span><span>{formatIn(t.mm)} in</span>
				</span>
				{#if fit !== 'good'}<span class="sr-only">. {fitLabel[fit]}</span>{/if}
			</button>
		{/each}
		{#if !tier}
			<!-- Chosen by definition, so a click has nothing to do; arrowing off it picks a tier. -->
			<button
				type="button"
				class="tier-tile tier-tile-custom"
				role="radio"
				aria-checked="true"
				tabindex="0"
				data-on="true"
				data-fit={chosenFit}
				title={fitLabel[chosenFit] || undefined}
			>
				{#if chosenFit !== 'good'}<span class="tier-mark" aria-hidden="true"><Icon name="warning" size={12} /></span>{/if}
				<span class="tier-name">Custom</span>
				<span class="tier-size num">
					{#if known}
						<span>{formatMm(widthMm)} mm</span><span class="tier-sep" aria-hidden="true">·</span><span>{formatIn(widthMm, true)} in</span>
					{:else}
						<span>no width set</span>
					{/if}
				</span>
				{#if chosenFit !== 'good'}<span class="sr-only">. {fitLabel[chosenFit]}</span>{/if}
			</button>
		{/if}
	</div>
	<p class="hint mt-1.5" id={hintId}>
		{sentence}
		{#if chosenFit !== 'good'}
			<span class="font-medium {chosenFit === 'small' ? 'text-block' : 'text-warn'}">{fitLabel[chosenFit]}.</span>
		{/if}
	</p>
</div>
