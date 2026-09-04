<script lang="ts">
	/**
	 * A colour control: a swatch button and a mono hex field. The swatch opens our own picker
	 * (ColourPopover) rather than the browser's, which on macOS is the full system Colors panel —
	 * a separate window that floats away from the control and stays open while you click
	 * elsewhere. There is no <input type=color> anywhere on the site.
	 */
	import { normaliseHex } from '$lib/colour';
	import ColourPopover from './ColourPopover.svelte';

	let {
		label,
		value = $bindable(),
		disabled = false,
		/** Other colours in the current design, offered in the picker's swatch row. */
		related = [],
		/** Compact form: swatch only, no hex field, for the frame's two colours. */
		compact = false
	}: {
		label: string;
		value: string;
		disabled?: boolean;
		related?: string[];
		compact?: boolean;
	} = $props();

	let swatch = $state<HTMLButtonElement>();
	let open = $state(false);
	/** The hex field is free text while it is being typed; only a valid value reaches the design. */
	let text = $state(value);

	// Keep the field in step when the colour changes from the picker, a swatch, or a reset.
	$effect(() => {
		const norm = normaliseHex(value);
		if (norm && normaliseHex(text) !== norm) text = norm;
	});
</script>

<div class="field">
	<span class="label">{label}</span>
	<div class="flex items-center gap-2">
		<button
			bind:this={swatch}
			type="button"
			class="swatch-well"
			style="--well: {value}"
			{disabled}
			aria-haspopup="dialog"
			aria-expanded={open}
			aria-label="{label} colour, currently {value}. Opens a colour picker."
			onclick={() => (open = !open)}
		></button>
		{#if !compact}
			<input
				class="input num px-2 py-1.5 text-sm"
				type="text"
				aria-label="{label} hex"
				maxlength="7"
				spellcheck="false"
				autocapitalize="off"
				{disabled}
				value={text}
				oninput={(e) => {
					text = e.currentTarget.value;
					const norm = normaliseHex(text);
					if (norm) value = norm;
				}}
				onblur={() => (text = normaliseHex(text) ?? value)}
			/>
		{/if}
	</div>
</div>

<ColourPopover bind:open {value} anchor={swatch} title={label} {related} onchange={(hex) => (value = hex)} />
