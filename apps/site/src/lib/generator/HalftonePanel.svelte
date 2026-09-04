<script lang="ts">
	import { untrack } from 'svelte';
	import {
		IMAGE_ZOOM_MAX,
		IMAGE_ZOOM_MIN,
		IMAGE_OFFSET_MAX,
		THRESHOLD_DEFAULT,
		THRESHOLD_MAX,
		THRESHOLD_MIN
	} from '@stoneqr/engine';
	import { GLYPHS, glyphDataUrl, glyphName, glyphSvg, type Glyph } from '$lib/glyphs';
	import DropTile from '$lib/components/DropTile.svelte';
	import SectionHeader from '$lib/components/SectionHeader.svelte';
	import Slider from '$lib/components/Slider.svelte';
	import Swatches from '$lib/components/Swatches.svelte';
	import ToneArt from '$lib/components/ToneArt.svelte';
	import type { Design, HalftoneTone } from './state.svelte';

	const TONES: { id: HalftoneTone; label: string }[] = [
		{ id: 'colour', label: 'Colour' },
		{ id: 'grey', label: 'Black and white' },
		{ id: 'silhouette', label: 'Silhouette' }
	];

	let { design, open = false, advanced = false }: { design: Design; open?: boolean; advanced?: boolean } = $props();

	/**
	 * The panel's own open state, for the reason spelled out in SectionHeader: an attribute bound
	 * straight to the prop is reasserted by the block's shared attribute effect, which both closed
	 * the panel mid-edit and, once a picture was in, made it impossible to fold away. The prop can
	 * still open the panel — /photo, or a picture arriving — but never closes it.
	 */
	let panelOpen = $state(untrack(() => open));
	$effect(() => {
		if (open) panelOpen = true;
	});

	/** What the panel says about itself when folded, so nothing is hidden by folding. */
	const summary = $derived.by(() => {
		if (!design.halftoneImage) return '';
		const tone = TONES.find((t) => t.id === design.halftoneTone)?.label ?? '';
		return [design.halftoneImageName, design.halftone ? tone : 'off'].filter(Boolean).join(' · ');
	});

	let imageError = $state('');
	const cropChanged = $derived(design.halftoneZoom !== 1 || design.halftoneOffsetX !== 0 || design.halftoneOffsetY !== 0);

	async function onImage(file: File) {
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
		imageError = '';
		resetCrop();
	}

	const pct = (v: number) => `${Math.round(v * 100)}%`;
</script>

<SectionHeader title="Photo QR" collapsible bind:open={panelOpen} {summary} controls="photo-body" />

{#if panelOpen}
	<div id="photo-body" class="mt-4 grid gap-5">
		<div class="grid gap-3">
			<p class="subhead">Picture</p>
			<DropTile
				src={design.halftoneImage ?? ''}
				name={design.halftoneImageName}
				label="Drop a picture here, or choose a file"
				hint="Blend a photo or a logo into the code itself. It stays in your browser."
				error={imageError}
				ariaLabel="Upload a photo to blend into the code"
				onfile={onImage}
				onclear={clearImage}
			/>
			{#if design.halftoneImage}
				<label class="toggle">
					<input type="checkbox" bind:checked={design.halftone} />
					Blend the picture into the code
				</label>
			{:else}
				<!--
				  An action, not a choice: each shape loads itself as the picture. They wear the same
				  tile as the style swatches, without captions, because seven captions will not fit a
				  22 rem column and the shapes say what they are.
				-->
				<div class="field">
					<span class="label">Or start from a shape</span>
					<div class="grid grid-cols-7 gap-1.5">
						{#each GLYPHS as g (g.id)}
							<button
								type="button"
								class="swatch"
								title={g.label}
								aria-label={`Use the ${g.label} shape`}
								onclick={() => useGlyph(g)}
							>
								<span class="swatch-art">{@html glyphSvg(g, 40)}</span>
							</button>
						{/each}
					</div>
				</div>
			{/if}
		</div>

		{#if design.halftoneActive}
			<div class="grid gap-3">
				<p class="subhead">Crop</p>
				<Slider label="Zoom" bind:value={design.halftoneZoom} min={IMAGE_ZOOM_MIN} max={IMAGE_ZOOM_MAX} step={0.05} reset={1} format={(v) => `${v.toFixed(2)}×`} />
				<Slider label="Across" bind:value={design.halftoneOffsetX} min={-IMAGE_OFFSET_MAX} max={IMAGE_OFFSET_MAX} step={0.01} reset={0} format={pct} />
				<Slider label="Down" bind:value={design.halftoneOffsetY} min={-IMAGE_OFFSET_MAX} max={IMAGE_OFFSET_MAX} step={0.01} reset={0} format={pct} />
				<p class="hint">
					At 1× the picture fills the code and a non-square picture is cropped to the middle. Zoom in to enlarge one
					part, move it with the sliders, or zoom out to leave paper around it.
					{#if cropChanged}<button type="button" class="underline" onclick={resetCrop}>Reset crop</button>{/if}
				</p>
			</div>

			<div class="grid gap-3">
				<p class="subhead">Look</p>
				<Swatches label="Show as" options={TONES} bind:value={design.halftoneTone} columns={3} ariaLabel="Picture tone">
					{#snippet draw(id)}<ToneArt tone={id} />{/snippet}
				</Swatches>

				{#if design.halftoneSilhouette}
					<Slider
						label="Cut"
						bind:value={design.halftoneThreshold}
						min={THRESHOLD_MIN}
						max={THRESHOLD_MAX}
						step={0.01}
						reset={THRESHOLD_DEFAULT}
						startLabel="Paper"
						endLabel="Ink"
						format={advanced ? pct : () => ''}
					/>
					<p class="hint">
						A silhouette turns the picture into solid blocks of ink and paper: right for a logo or a shape, wrong for a
						photo. Drag toward Ink if parts of the shape are missing, toward Paper if the background fills in.
					</p>
				{/if}

				{#if advanced}
					<Slider label="Dot size" bind:value={design.halftoneDotScale} min={0.25} max={0.7} step={0.05} reset={0.4} format={pct} />
					<Slider label="Fade" bind:value={design.halftoneDim} min={0} max={0.6} step={0.05} reset={0} format={pct} />
					<Slider label="Contrast" bind:value={design.halftoneContrast} min={0.6} max={1.6} step={0.05} reset={1} format={(v) => `${v.toFixed(2)}×`} />
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
			Error correction is forced to H and the code is enlarged to at least version 7 so the picture shows through. Every
			change is decoded on your device before download unlocks, and picture codes download as PNG or SVG.
			{#if !advanced}Advanced adds dot size, fade, and contrast for a photo that is hard to read in print.{/if}
		</p>
	</div>
{/if}
