<script lang="ts">
	/**
	 * A labelled range control on the shared `.row` grid, so label, track, and readout line up
	 * down a whole panel however long the words are.
	 *
	 * The reset dot appears only when the value is off its default, which is how someone gets
	 * back to a known state without remembering what the number was.
	 */
	import Icon from './Icon.svelte';

	let {
		label,
		value = $bindable(),
		min,
		max,
		step = 1,
		/** Rendered readout. Given the raw value so the caller can choose units and rounding. */
		format = (v: number) => String(v),
		/** Shown when the value differs from this; omit for no reset affordance. */
		reset,
		/** Extra classes on the readout, e.g. to colour a percentage that has gone past a limit. */
		readoutClass = '',
		disabled = false,
		/** Words at the two ends of the track, for a control whose ends mean something. */
		startLabel = '',
		endLabel = ''
	}: {
		label: string;
		value: number;
		min: number;
		max: number;
		step?: number;
		format?: (v: number) => string;
		reset?: number;
		readoutClass?: string;
		disabled?: boolean;
		startLabel?: string;
		endLabel?: string;
	} = $props();

	const id = $props.id();
	/** How far along the track the thumb sits, so the filled part of the track can be painted. */
	const pct = $derived(Math.round(((value - min) / (max - min)) * 100));
	const changed = $derived(reset !== undefined && Math.abs(value - reset) > 1e-9);
</script>

<div class="row" class:opacity-45={disabled}>
	<label class="row-label" for={id}>{label}</label>
	<div class="flex min-w-0 items-center gap-2">
		{#if startLabel}<span class="ticket shrink-0">{startLabel}</span>{/if}
		<input
			{id}
			class="range"
			type="range"
			{min}
			{max}
			{step}
			{disabled}
			bind:value
			style="--fill: {pct}%"
		/>
		{#if endLabel}<span class="ticket shrink-0">{endLabel}</span>{/if}
	</div>
	<div class="row-readout">
		{#if changed}
			{@const shown = format(reset!)}
			<button
				type="button"
				class="text-ink-3 hover:text-ink"
				title={shown ? `Back to the default (${shown})` : 'Back to the default'}
				aria-label={shown ? `Reset ${label} to ${shown}` : `Reset ${label}`}
				onclick={() => (value = reset!)}
			>
				<Icon name="reset" size={13} />
			</button>
		{/if}
		<span class="num {readoutClass}">{format(value)}</span>
	</div>
</div>
