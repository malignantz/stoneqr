<script lang="ts">
	import { contrastRatio, LOGO_BLOCK_RATIO, LOGO_WARN_RATIO } from '@stoneqr/engine';
	import { preloadStyled, FRAME, type CornerDotStyle, type CornerSquareStyle, type DotStyle } from '$lib/styled';
	import type { Design } from './state.svelte';

	let { design, open = false, advanced = false }: { design: Design; open?: boolean; advanced?: boolean } = $props();

	const dots: { id: DotStyle; label: string }[] = [
		{ id: 'square', label: 'Square' },
		{ id: 'rounded', label: 'Rounded' },
		{ id: 'dots', label: 'Dots' },
		{ id: 'classy', label: 'Classy' },
		{ id: 'extra-rounded', label: 'Soft' }
	];
	const cornerSquares: { id: CornerSquareStyle; label: string }[] = [
		{ id: 'square', label: 'Square' },
		{ id: 'extra-rounded', label: 'Rounded' },
		{ id: 'dot', label: 'Round' },
		{ id: 'classy', label: 'Classy' }
	];
	const cornerDots: { id: CornerDotStyle; label: string }[] = [
		{ id: 'square', label: 'Square' },
		{ id: 'dot', label: 'Round' },
		{ id: 'classy', label: 'Classy' }
	];
	const ctas = ['Scan me', 'Scan to RSVP', 'Scan for menu', 'Scan to join WiFi', 'Scan to save contact', 'Scan for details'];

	const contrast = $derived(design.transparentBg ? null : contrastRatio(design.fg, design.bg));
	const logoPct = $derived(Math.round(design.logoAreaRatio * 100));
	/** The whole panel is inert while a halftone picture owns the render. */
	const off = $derived(design.halftoneActive);

	let logoError = $state('');
	async function onLogo(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		logoError = '';
		if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) {
			logoError = 'Use a PNG, JPEG, or WebP. SVG logos are coming later.';
			return;
		}
		if (file.size > 2 * 1024 * 1024) {
			logoError = 'Keep the logo under 2 MB. It only needs to be a few hundred pixels.';
			return;
		}
		const url = await new Promise<string>((res, rej) => {
			const r = new FileReader();
			r.onload = () => res(String(r.result));
			r.onerror = () => rej(new Error('Could not read the file'));
			r.readAsDataURL(file);
		});
		design.logo = url;
		design.logoName = file.name;
		input.value = '';
	}
	function clearLogo() {
		design.logo = undefined;
		design.logoName = '';
	}
</script>

<details class="group" {open} ontoggle={(e) => e.currentTarget.open && preloadStyled()}>
	<summary class="flex cursor-pointer list-none items-center justify-between gap-3 py-1 select-none">
		<h2 class="text-xl">Style</h2>
		<span class="flex items-center gap-3">
			{#if off}<span class="badge badge-warn">Off: photo</span>{/if}
			<span class="ticket transition-transform group-open:rotate-90">▶</span>
		</span>
	</summary>

	<div class="mt-4 grid gap-5">
		{#if off}
			<p class="notice notice-info">
				The photo replaces these settings. Colours, shapes, the logo, and the frame come back when you remove the photo
				or untick "Blend the picture into the code".
			</p>
		{/if}

		<fieldset
			disabled={off}
			aria-disabled={off}
			class="m-0 grid min-w-0 gap-5 border-0 p-0 transition-opacity {off ? 'opacity-40 select-none' : ''}"
		>
			<div class="grid grid-cols-2 gap-3">
				<div class="field">
					<label for="fg">Ink</label>
					<div class="flex items-center gap-2">
						<input id="fg" type="color" class="h-9 w-12 cursor-pointer rounded border border-rule-2 bg-white p-0.5" bind:value={design.fg} />
						<input class="input num" type="text" aria-label="Ink hex" bind:value={design.fg} maxlength="7" />
					</div>
				</div>
				<div class="field">
					<label for="bg">Paper</label>
					<div class="flex items-center gap-2">
						<input id="bg" type="color" class="h-9 w-12 cursor-pointer rounded border border-rule-2 bg-white p-0.5" bind:value={design.bg} disabled={design.transparentBg} />
						<input class="input num" type="text" aria-label="Paper hex" bind:value={design.bg} maxlength="7" disabled={design.transparentBg} />
					</div>
				</div>
			</div>
			<div class="flex flex-wrap items-center justify-between gap-2 text-sm">
				{#if advanced}
					<label class="flex items-center gap-2"><input type="checkbox" bind:checked={design.transparentBg} /> Transparent background</label>
				{:else}
					<span></span>
				{/if}
				{#if contrast !== null}
					<span class="num text-ink-3" title="Contrast ratio, WCAG formula">Contrast {contrast.toFixed(1)}:1 {contrast >= 4 ? '' : '· too low'}</span>
				{/if}
			</div>

			<div class="field">
				<span class="label">Modules</span>
				<div class="seg flex-wrap" role="group" aria-label="Module shape">
					{#each dots as d (d.id)}
						<button type="button" aria-pressed={design.dot === d.id} onclick={() => (design.dot = d.id)}>{d.label}</button>
					{/each}
				</div>
			</div>

			{#if advanced}
				<div class="grid grid-cols-2 gap-3">
					<div class="field">
						<span class="label">Corner frames</span>
						<div class="seg flex-wrap" role="group" aria-label="Corner square shape">
							{#each cornerSquares as c (c.id)}
								<button type="button" aria-pressed={design.cornerSquare === c.id} onclick={() => (design.cornerSquare = c.id)}>{c.label}</button>
							{/each}
						</div>
					</div>
					<div class="field">
						<span class="label">Corner dots</span>
						<div class="seg flex-wrap" role="group" aria-label="Corner dot shape">
							{#each cornerDots as c (c.id)}
								<button type="button" aria-pressed={design.cornerDot === c.id} onclick={() => (design.cornerDot = c.id)}>{c.label}</button>
							{/each}
						</div>
					</div>
				</div>

				<div class="field">
					<span class="label">Gradient</span>
					<div class="flex flex-wrap items-center gap-3">
						<div class="seg" role="group" aria-label="Gradient">
							<button type="button" aria-pressed={design.gradient === 'none'} onclick={() => (design.gradient = 'none')}>None</button>
							<button type="button" aria-pressed={design.gradient === 'linear'} onclick={() => (design.gradient = 'linear')}>Linear</button>
							<button type="button" aria-pressed={design.gradient === 'radial'} onclick={() => (design.gradient = 'radial')}>Radial</button>
						</div>
						{#if design.gradient !== 'none'}
							<input type="color" aria-label="Gradient end colour" class="h-9 w-12 cursor-pointer rounded border border-rule-2 bg-white p-0.5" bind:value={design.gradientTo} />
							{#if design.gradient === 'linear'}
								<label class="flex items-center gap-2 text-sm">Angle <input type="range" min="0" max="360" step="15" bind:value={design.gradientAngleDeg} /> <span class="num w-10">{design.gradientAngleDeg}°</span></label>
							{/if}
						{/if}
					</div>
					{#if design.gradient !== 'none'}
						<p class="hint">Gradients print as RGB. Keep both ends dark so every module keeps contrast with the paper.</p>
					{/if}
				</div>
			{/if}

			<div class="field">
				<span class="label">Logo</span>
				{#if design.logo}
					<div class="flex items-center gap-3">
						<img src={design.logo} alt="" class="h-12 w-12 rounded border border-rule bg-white object-contain" />
						<div class="min-w-0 flex-1 text-sm">
							<p class="truncate">{design.logoName}</p>
							<button type="button" class="text-ink-3 underline" onclick={clearLogo}>Remove</button>
						</div>
					</div>
					<label class="mt-2 flex items-center gap-3 text-sm">
						Size
						<input type="range" min="0.15" max="0.5" step="0.01" bind:value={design.logoSize} aria-label="Logo size" />
						<span class="num w-14 {design.logoAreaRatio > LOGO_BLOCK_RATIO ? 'text-block' : design.logoAreaRatio > LOGO_WARN_RATIO ? 'text-warn' : ''}">{logoPct}% area</span>
					</label>
					<label class="flex items-center gap-2 text-sm"><input type="checkbox" bind:checked={design.logoKnockout} /> White space behind the logo</label>
					<label class="flex items-center gap-3 text-sm">Margin <input type="range" min="0" max="3" step="1" bind:value={design.logoMargin} aria-label="Logo margin in modules" /> <span class="num w-14">{design.logoMargin} mod</span></label>
					<p class="hint">Error correction is set to H while a logo is present. Keep the logo under 20% of the area for print.</p>
				{:else}
					<input type="file" accept="image/png,image/jpeg,image/webp" class="block w-full text-sm file:mr-3 file:rounded file:border file:border-rule-2 file:bg-white file:px-3 file:py-1.5 file:text-sm" onchange={onLogo} aria-label="Upload a logo" />
					<p class="hint">PNG, JPEG, or WebP. The image stays in your browser.</p>
				{/if}
				{#if logoError}<p class="notice notice-block">{logoError}</p>{/if}
			</div>

			<div class="field">
				<label class="flex items-center gap-2 !text-sm !normal-case !tracking-normal !font-sans !text-ink"><input type="checkbox" bind:checked={design.frameEnabled} /> Frame with a call to action</label>
				{#if design.frameEnabled}
					<div class="grid gap-3">
						<input class="input" type="text" aria-label="Frame text" bind:value={design.frameText} maxlength={FRAME.maxChars} list="cta-list" />
						<datalist id="cta-list">{#each ctas as c (c)}<option value={c}></option>{/each}</datalist>
						<div class="flex flex-wrap gap-1.5">
							{#each ctas as c (c)}
								<button type="button" class="rounded border border-rule-2 bg-white px-2 py-0.5 text-xs hover:border-ink-3" onclick={() => (design.frameText = c)}>{c}</button>
							{/each}
						</div>
						<div class="flex items-center gap-4 text-sm">
							<label class="flex items-center gap-2">Frame <input type="color" class="h-8 w-10 rounded border border-rule-2 bg-white p-0.5" bind:value={design.frameColor} /></label>
							<label class="flex items-center gap-2">Text <input type="color" class="h-8 w-10 rounded border border-rule-2 bg-white p-0.5" bind:value={design.frameTextColor} /></label>
						</div>
						<p class="hint">Specific wording ("Scan for the menu") gets more scans than "Scan me". The frame sits outside the code, so the print width stays the width of the code itself.</p>
					</div>
				{/if}
			</div>
		</fieldset>
	</div>
</details>
