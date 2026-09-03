<script lang="ts">
	import { IMAGE_ZOOM_MAX, IMAGE_ZOOM_MIN, IMAGE_OFFSET_MAX } from '@stoneqr/engine';
	import type { Design } from './state.svelte';

	let { design, open = false }: { design: Design; open?: boolean } = $props();

	let imageError = $state('');
	const cropChanged = $derived(design.halftoneZoom !== 1 || design.halftoneOffsetX !== 0 || design.halftoneOffsetY !== 0);

	async function onImage(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		imageError = '';
		if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
			imageError = 'Use a PNG, JPEG, or WebP.';
			return;
		}
		if (file.size > 8 * 1024 * 1024) {
			imageError = 'Keep the picture under 8 MB. It is scaled down before it is used anyway.';
			return;
		}
		try {
			design.halftoneImage = await new Promise<string>((res, rej) => {
				const r = new FileReader();
				r.onload = () => res(String(r.result));
				r.onerror = () => rej(new Error('Could not read the file'));
				r.readAsDataURL(file);
			});
			design.halftoneImageName = file.name;
			design.halftone = true;
			resetCrop();
		} catch (err) {
			imageError = err instanceof Error ? err.message : String(err);
		}
		input.value = '';
	}

	function resetCrop() {
		design.halftoneZoom = 1;
		design.halftoneOffsetX = 0;
		design.halftoneOffsetY = 0;
	}

	function clearImage() {
		design.halftoneImage = undefined;
		design.halftoneImageName = '';
		design.halftone = false;
		design.halftoneRaster = null;
		design.halftoneOpts = null;
		design.halftoneNote = '';
		resetCrop();
	}
</script>

<details class="group" {open}>
	<summary class="flex cursor-pointer list-none items-center justify-between gap-3 py-1 select-none">
		<h2 class="text-xl">Artistic (halftone)</h2>
		<span class="ticket transition-transform group-open:rotate-90">▶</span>
	</summary>

	<div class="mt-4 grid gap-5">
		<div class="field">
			<span class="label">Picture</span>
			{#if design.halftoneImage}
				<div class="flex items-center gap-3">
					<img src={design.halftoneImage} alt="" class="h-12 w-12 rounded border border-rule bg-white object-cover" />
					<div class="min-w-0 flex-1 text-sm">
						<p class="truncate">{design.halftoneImageName}</p>
						<button type="button" class="text-ink-3 underline" onclick={clearImage}>Remove</button>
					</div>
				</div>
				<label class="mt-2 flex items-center gap-2 text-sm">
					<input type="checkbox" bind:checked={design.halftone} /> Blend the picture into the code
				</label>
			{:else}
				<input
					type="file"
					accept="image/png,image/jpeg,image/webp"
					class="block w-full text-sm file:mr-3 file:rounded file:border file:border-rule-2 file:bg-white file:px-3 file:py-1.5 file:text-sm"
					onchange={onImage}
					aria-label="Upload a picture for the halftone"
				/>
				<p class="hint">PNG, JPEG, or WebP. The picture stays in your browser.</p>
			{/if}
			{#if imageError}<p class="notice notice-block">{imageError}</p>{/if}
		</div>

		{#if design.halftoneActive}
			<div class="field">
				<span class="label">Crop</span>
				<label class="flex items-center gap-3 text-sm">
					Zoom
					<input type="range" min={IMAGE_ZOOM_MIN} max={IMAGE_ZOOM_MAX} step="0.05" bind:value={design.halftoneZoom} aria-label="Picture zoom" />
					<span class="num w-14">{design.halftoneZoom.toFixed(2)}×</span>
				</label>
				<label class="flex items-center gap-3 text-sm">
					Across
					<input type="range" min={-IMAGE_OFFSET_MAX} max={IMAGE_OFFSET_MAX} step="0.01" bind:value={design.halftoneOffsetX} aria-label="Move the picture left or right" />
					<span class="num w-14">{Math.round(design.halftoneOffsetX * 100)}%</span>
				</label>
				<label class="flex items-center gap-3 text-sm">
					Down
					<input type="range" min={-IMAGE_OFFSET_MAX} max={IMAGE_OFFSET_MAX} step="0.01" bind:value={design.halftoneOffsetY} aria-label="Move the picture up or down" />
					<span class="num w-14">{Math.round(design.halftoneOffsetY * 100)}%</span>
				</label>
				<p class="hint">
					At 1× the picture fills the code and a non-square picture is cropped to the middle. Zoom in to enlarge one
					part, move it with the sliders, or zoom out to leave paper around it.
					{#if cropChanged}<button type="button" class="underline" onclick={resetCrop}>Reset crop</button>{/if}
				</p>
			</div>

			<div class="field">
				<span class="label">Picture</span>
				<label class="flex items-center gap-3 text-sm">
					Dot size
					<input type="range" min="0.25" max="0.7" step="0.05" bind:value={design.halftoneDotScale} aria-label="Dot size" />
					<span class="num w-14">{Math.round(design.halftoneDotScale * 100)}%</span>
				</label>
				<label class="flex items-center gap-3 text-sm">
					Fade picture
					<input type="range" min="0" max="0.6" step="0.05" bind:value={design.halftoneDim} aria-label="Fade the picture" />
					<span class="num w-14">{Math.round(design.halftoneDim * 100)}%</span>
				</label>
				<label class="flex items-center gap-3 text-sm">
					Contrast
					<input type="range" min="0.6" max="1.6" step="0.05" bind:value={design.halftoneContrast} aria-label="Picture contrast" />
					<span class="num w-14">{design.halftoneContrast.toFixed(2)}×</span>
				</label>
				<label class="flex items-center gap-2 text-sm">
					<input type="checkbox" bind:checked={design.halftoneGrayscale} /> Black and white picture
				</label>
			</div>

			{#if design.halftoneNote}
				<p class="notice notice-warn">{design.halftoneNote}</p>
			{/if}
			{#if design.halftoneOverridesStyle}
				<p class="notice notice-info">
					Halftone replaces the Style settings. Dot shapes, gradients, the logo, and the frame are ignored while a picture is
					blended in. Turn the picture off to use them.
				</p>
			{/if}
		{/if}

		<p class="hint">
			Error correction is forced to H and the code is enlarged to at least version 7 so the picture shows through. Every change
			is decoded on your device before download unlocks.
		</p>
		<p class="hint">Halftone codes download as PNG or SVG. Bigger dots and a faded picture scan more reliably in print.</p>
	</div>
</details>
