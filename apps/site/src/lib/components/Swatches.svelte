<script lang="ts" generics="T extends string">
	/**
	 * A row of drawn choices: each option is a tile holding a small picture of what it does, with
	 * its name in ticket type underneath. Replaces the segmented controls for anything that
	 * changes how the code looks, because "Classy" and "Soft" tell you nothing.
	 *
	 * The column count is fixed per group rather than left to wrapping, so a group can never
	 * leave one lonely tile on a second row — which is exactly what the old segmented controls
	 * did with "Soft" and "Round" in a 22 rem column.
	 */
	import type { Snippet } from 'svelte';
	import { radioKeys } from './radiogroup';

	let {
		label,
		options,
		value = $bindable(),
		draw,
		columns = 5,
		disabled = false,
		/** Accessible name for the group when the visible label is not enough. */
		ariaLabel
	}: {
		label?: string;
		options: readonly { id: T; label: string; title?: string }[];
		value: T;
		/** Draws one option's picture, inside a 40 px square. */
		draw: Snippet<[T]>;
		columns?: number;
		disabled?: boolean;
		ariaLabel?: string;
	} = $props();
</script>

<div class="field">
	{#if label}<span class="label">{label}</span>{/if}
	<!--
	  The column count is fixed and the whole grid is capped, so tiles stay tile-sized in a wide
	  column instead of stretching, and a group never leaves one lonely tile on a second row.
	-->
	<div
		class="grid gap-1.5"
		style="grid-template-columns: repeat({columns}, minmax(0, 1fr)); max-width: {columns * 4.6}rem"
		role="radiogroup"
		aria-label={ariaLabel ?? label}
		use:radioKeys
	>
		{#each options as o, i (o.id)}
			<!-- Roving tabindex: Tab reaches the chosen tile, the arrow keys move between them. With
			     no tile chosen (a hand-made combination in the Look group) the first one takes it. -->
			<button
				type="button"
				class="swatch"
				role="radio"
				aria-checked={value === o.id}
				tabindex={value === o.id || (i === 0 && !options.some((x) => x.id === value)) ? 0 : -1}
				data-on={value === o.id}
				title={o.title ?? o.label}
				{disabled}
				onclick={() => (value = o.id)}
			>
				<span class="swatch-art">{@render draw(o.id)}</span>
				<span class="swatch-name">{o.label}</span>
			</button>
		{/each}
	</div>
</div>
