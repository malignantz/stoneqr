<script lang="ts">
	import { untrack } from 'svelte';
	import { IMAGE_ZOOM_MAX, IMAGE_ZOOM_MIN, IMAGE_OFFSET_MAX, THRESHOLD_MAX, THRESHOLD_MIN } from '@stoneqr/engine';
	import { GLYPHS, glyphDataUrl, glyphName, glyphSvg, type Glyph } from '$lib/glyphs';
	import type { Design, HalftoneTone } from './state.svelte';

	const TONES: { value: HalftoneTone; label: string }[] = [
		{ value: 'colour', label: 'Colour' },
		{ value: 'grey', label: 'Black and white' },
		{ value: 'silhouette', label: 'Silhouette' }
	];

	let { design, open = false, advanced = false }: { design: Design; open?: boolean; advanced?: boolean } = $props();

	/**
	 * The panel's own open state, for the reason spelled out in StylePanel: an attribute bound
	 * straight to the prop is reasserted by the block's shared attribute effect, which both closed
	 * the panel mid-edit and, once a picture was in, made it impossible to fold away. The prop can
	 * still open the panel — /photo, or a picture arriving — but never closes it.
	 */
	let panelOpen = $state(untrack(() => open));
	$effect(() => {
		if (open) panelOpen = true;
	});

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

	/** A built-in shape is a silhouette by definition, so picking one switches the tone as well. */
	function useGlyph(g: Glyph) {
		imageError = '';
		design.halftoneImage = glyphDataUrl(g);
		design.halftoneImageName = glyphName(g);
		design.halftone = true;
		design.halftoneTone = 'silhouette';
		resetCrop();
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

<details class="group" open={panelOpen} ontoggle={(e) => (panelOpen = e.currentTarget.open)}>
	<summary class="flex cursor-pointer list-none items-center justify-between gap-3 py-1 select-none">
		<h2 class="text-xl">Photo QR</h2>
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
					aria-label="Upload a photo to blend into the code"
				/>
				<p class="hint">Blend a photo or a logo into the code itself. PNG, JPEG, or WebP; the picture stays in your browser.</p>
				<span class="label mt-3">Or start from a shape</span>
				<div class="flex flex-wrap gap-2" role="group" aria-label="Built-in shapes">
					{#each GLYPHS as g (g.id)}
						<button
							type="button"
							class="glyph"
							title={g.label}
							aria-label={`Use the ${g.label} shape`}
							onclick={() => useGlyph(g)}
						>
							{@html glyphSvg(g, 40)}
						</button>
					{/each}
				</div>
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
				<span class="label">Look</span>
				{#if advanced}
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
				{/if}
				<div class="flex flex-wrap items-center gap-3 text-sm">
					<span>Show as</span>
					<div class="seg" role="group" aria-label="Picture tone">
						{#each TONES as t (t.value)}
							<button type="button" aria-pressed={design.halftoneTone === t.value} onclick={() => (design.halftoneTone = t.value)}>{t.label}</button>
						{/each}
					</div>
				</div>
				{#if design.halftoneSilhouette}
					<label class="flex items-center gap-3 text-sm">
						Cut
						<span class="text-ink-3">Paper</span>
						<input type="range" min={THRESHOLD_MIN} max={THRESHOLD_MAX} step="0.01" bind:value={design.halftoneThreshold} aria-label="Where the silhouette cuts between paper and ink" />
						<span class="text-ink-3">Ink</span>
						{#if advanced}<span class="num w-14">{Math.round(design.halftoneThreshold * 100)}%</span>{/if}
					</label>
					<p class="hint">
						A silhouette turns the picture into solid blocks of ink and paper: right for a logo or a shape, wrong for a
						photo. Drag toward Ink if parts of the shape are missing, toward Paper if the background fills in.
					</p>
				{/if}
			</div>

			{#if design.halftoneNote}
				<p class="notice notice-warn">{design.halftoneNote}</p>
			{/if}
			{#if design.halftoneOverridesStyle}
				<p class="notice notice-info">
					The photo replaces the Style settings. Dot shapes, gradients, the logo, and the frame are ignored while a photo is
					blended in. Turn the photo off to use them.
				</p>
			{/if}
		{/if}

		<p class="hint">
			Error correction is forced to H and the code is enlarged to at least version 7 so the picture shows through. Every change
			is decoded on your device before download unlocks.
		</p>
		<p class="hint">Picture codes download as PNG or SVG. {advanced ? 'Bigger dots and a faded picture scan more reliably in print.' : 'If a photo is hard to read in print, Advanced has dot size, fade, and contrast.'}</p>
	</div>
</details>
