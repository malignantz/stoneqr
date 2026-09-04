<script lang="ts">
	/**
	 * The picture input: a dashed tile that takes a drop or a click, and becomes a thumbnail row
	 * once a file is in. Replaces the native "Choose File · No file chosen" control, which is the
	 * loudest piece of browser chrome on the page.
	 *
	 * The real <input type=file> stays, covering the tile, so click, keyboard, and the file
	 * picker all behave exactly as the browser intends; only its appearance is ours.
	 */
	import Icon from './Icon.svelte';

	let {
		/** Data URL of the current picture, or empty. */
		src = '',
		name = '',
		accept = 'image/png,image/jpeg,image/webp',
		label = 'Drop a picture here, or choose a file',
		hint = '',
		error = '',
		ariaLabel,
		disabled = false,
		onfile,
		onclear
	}: {
		src?: string;
		name?: string;
		accept?: string;
		label?: string;
		hint?: string;
		error?: string;
		ariaLabel: string;
		disabled?: boolean;
		onfile: (file: File) => void;
		onclear?: () => void;
	} = $props();

	let over = $state(false);

	function pick(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (file) onfile(file);
		// Clearing lets the same file be chosen again after a Remove.
		input.value = '';
	}

	function drop(e: DragEvent) {
		e.preventDefault();
		over = false;
		if (disabled) return;
		const file = e.dataTransfer?.files?.[0];
		if (file) onfile(file);
	}
</script>

{#if src}
	<div class="flex items-center gap-3">
		<img {src} alt="" class="h-12 w-12 shrink-0 rounded border border-rule bg-white object-contain" />
		<div class="min-w-0 flex-1 text-sm">
			<p class="truncate" title={name}>{name}</p>
			{#if onclear}
				<button type="button" class="text-ink-3 underline hover:text-ink" onclick={onclear}>Remove</button>
			{/if}
		</div>
	</div>
{:else}
	<!--
	  The drag handlers live on the file input, not on this wrapper. The input covers the whole
	  tile, so it receives the drag anyway, and hanging them on a form control rather than a bare
	  <div> keeps the tile out of the way of anyone using a keyboard or a screen reader.
	-->
	<div class="drop" data-over={over}>
		<Icon name="upload" size={18} class="text-ink-3" />
		<span class="text-sm">{label}</span>
		{#if hint}<span class="hint">{hint}</span>{/if}
		<input
			type="file"
			{accept}
			{disabled}
			aria-label={ariaLabel}
			onchange={pick}
			ondragover={(e) => {
				e.preventDefault();
				over = true;
			}}
			ondragleave={() => (over = false)}
			ondrop={drop}
		/>
	</div>
{/if}
{#if error}<p class="notice notice-block mt-2">{error}</p>{/if}
