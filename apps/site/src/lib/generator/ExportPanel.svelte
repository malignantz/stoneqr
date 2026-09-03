<script lang="ts">
	import { exportPng, exportEps, setPngDpi, fromMm, formatMm, minWidthMmForDistance, maxScanDistanceM, type Ecc } from '@stoneqr/engine';
	import { downloadText, downloadBytes, copyPngToClipboard, slug } from '$lib/download';
	import { svgToCanvas, canvasToPngBlob } from '$lib/svg-raster';
	import { SITE } from '$lib/site';
	import { describe, type Design } from './state.svelte';
	import { SIZE_TIERS, tierFor, tierFit, tierDistance, formatIn } from './sizes';

	let { design, advanced = false }: { design: Design; advanced?: boolean } = $props();

	const canExport = $derived(!!design.encoded && design.verify === 'ok' && !design.logoBlocked && design.status !== 'blocked');
	const svgText = $derived(design.styled ? design.styledSvg : design.plainSvg);
	/** Physical width of the styled artwork: the code width plus the frame when there is one. */
	const artWidthMm = $derived(design.widthMm * (design.styled ? design.styledScale : 1));

	// Basic mode: four named sizes instead of a width field. A width set by hand in Advanced
	// shows up as a fifth, "Custom" row so nothing is silently in force.
	const tier = $derived(tierFor(design.widthMm));
	const fitOf = (mm: number) => (design.encoded ? tierFit(mm, design.encoded.size, design.quietZone) : 'good');
	const fitLabel = { good: '', tight: 'Tight for this content', small: 'Too small for this content' } as const;
	function pickTier(mm: number) {
		design.unit = 'mm';
		design.width = mm;
	}
	/**
	 * Basic hides the two informational sizing lines (module size, reads-to distance) because the
	 * size list already says the same thing in plain words. Warnings and blocks always show.
	 */
	const visibleWarnings = $derived(
		advanced ? design.warnings : design.warnings.filter((w) => !(w.level === 'info' && (w.code === 'scan-distance' || w.code === 'module-size')))
	);
	const name = $derived(`stoneqr-${slug(design.type === 'url' ? design.fields.url.url : describe(design.type))}`);
	const badgeClass = $derived(
		design.status === 'print-safe' ? 'badge-ok' : design.status === 'scannable' ? 'badge-muted' : design.status === 'risky' ? 'badge-warn' : 'badge-block'
	);
	const eccs: Ecc[] = ['L', 'M', 'Q', 'H'];
	const presets: { label: string; mm: number }[] = [
		{ label: 'Sticker 20', mm: 20 },
		{ label: 'Card 30', mm: 30 },
		{ label: 'Flyer 50', mm: 50 },
		{ label: 'Poster 120', mm: 120 },
		{ label: 'Sign 250', mm: 250 }
	];

	const halftoneOnly = 'Photo QR downloads as PNG or SVG';
	const HALFTONE_MAX_SIDE = 4096;

	/**
	 * Pixels per module for a halftone PNG. Capped at 4096 px per side (about 17 megapixels): the
	 * picture is at most 1024 px to begin with, so more pixels add nothing, and past this PNG
	 * encoding alone takes seconds on a laptop.
	 */
	const halftonePxPerModule = $derived.by(() => {
		if (!design.encoded) return 0;
		const total = design.encoded.size + 2 * design.quietZone;
		return Math.min(Math.max(2, Math.floor(HALFTONE_MAX_SIDE / total)), Math.max(2, Math.round(((design.widthMm / 25.4) * design.dpi) / total)));
	});
	/** Side of the PNG the button will produce, so Basic can show it instead of a dpi figure. */
	const pngPx = $derived(
		design.encoded && design.halftoneActive
			? halftonePxPerModule * (design.encoded.size + 2 * design.quietZone)
			: Math.round((artWidthMm / 25.4) * design.dpi)
	);

	let busy = $state('');
	let copied = $state(false);
	/** Live label for the PNG button while a halftone export renders off the main thread. */
	let pngProgress = $state('');

	/**
	 * Every export loads its heavy half lazily, and a hashed chunk stops being served the moment a
	 * new version is published, so a tab left open across a deploy asks for a file that is gone.
	 * The browser records that failure in its module map, which means a retry cannot fix it: only
	 * a reload can. Say that in words rather than showing the module URL.
	 */
	const isStaleChunk = (e: unknown) =>
		/dynamically imported module|Importing a module script failed|module script failed/i.test(
			e instanceof Error ? e.message : String(e)
		);

	async function run(label: string, fn: () => Promise<void>) {
		busy = label;
		try {
			await fn();
		} catch (e) {
			if (isStaleChunk(e)) {
				alert(
					'StoneQR was updated while this page was open, so the part that makes this file is no longer on the server. Reload the page and download again. Nothing you typed is saved, so you will need to set the code up once more.'
				);
			} else {
				alert(`Export failed: ${e instanceof Error ? e.message : String(e)}`);
			}
		} finally {
			busy = '';
			pngProgress = '';
		}
	}

	const svg = () =>
		run('svg', async () => {
			if (design.halftoneActive && design.encoded && design.halftoneImage) {
				const { halftoneToSvg, loadImageRaster } = await import('$lib/halftone');
				const source = await loadImageRaster(design.halftoneImage);
				const text = halftoneToSvg(design.encoded, source, design.halftoneImage, halftoneOpts(), design.widthMm);
				downloadText(text, `${name}.svg`, 'image/svg+xml');
				return;
			}
			downloadText(svgText, `${name}.svg`, 'image/svg+xml');
		});

	/**
	 * The option set the preview verified, so the export is the code that actually decoded.
	 * Snapshotted: the stored object is a reactive proxy, which cannot be posted to a worker.
	 */
	const halftoneOpts = () => ({ ...($state.snapshot(design.halftoneOpts) ?? {}), quietZone: design.quietZone });

	const png = () =>
		run('png', async () => {
			if (!design.encoded) return;
			if (design.halftoneActive && design.halftoneImage) {
				const { halftonePng } = await import('$lib/halftone-export');
				const { loadImageRaster } = await import('$lib/halftone');
				// Rendered and encoded in a Web Worker so a poster-size raster never freezes the page.
				pngProgress = 'Preparing…';
				const bytes = await halftonePng(
					design.encoded,
					await loadImageRaster(design.halftoneImage),
					{ ...halftoneOpts(), pxPerModule: halftonePxPerModule },
					design.dpi,
					(p) => {
						pngProgress = p.phase === 'render' ? `Rendering ${Math.round(p.fraction * 100)}%` : 'Encoding…';
					}
				);
				downloadBytes(bytes, `${name}-${design.dpi}dpi.png`, 'image/png');
				return;
			}
			if (!design.styled) {
				const r = exportPng(design.encoded, { widthMm: design.widthMm, dpi: design.dpi, quietZone: design.quietZone, fg: design.fg, bg: design.transparentBg ? '#ffffff' : design.bg });
				downloadBytes(r.png, `${name}-${design.dpi}dpi.png`, 'image/png');
			} else {
				const px = Math.round((artWidthMm / 25.4) * design.dpi);
				const canvas = await svgToCanvas(svgText, px);
				const bytes = new Uint8Array(await (await canvasToPngBlob(canvas)).arrayBuffer());
				downloadBytes(setPngDpi(bytes, design.dpi), `${name}-${design.dpi}dpi.png`, 'image/png');
			}
		});

	const pdf = () =>
		run('pdf', async () => {
			if (!design.encoded) return;
			const title = `QR code: ${describe(design.type)}`;
			if (!design.styled) {
				const { exportPdf } = await import('@stoneqr/engine/export/pdf');
				const bytes = await exportPdf(design.encoded, { widthMm: design.widthMm, quietZone: design.quietZone, fg: design.fg, bg: design.bgColor, title, cmyk: true });
				downloadBytes(bytes, `${name}.pdf`, 'application/pdf');
			} else {
				const { styledPdf } = await import('$lib/styled-pdf');
				downloadBytes(await styledPdf(svgText, artWidthMm, { title, bg: design.transparentBg ? undefined : design.bg }), `${name}.pdf`, 'application/pdf');
			}
		});

	const eps = () => {
		if (!design.encoded) return;
		downloadText(exportEps(design.encoded, { widthMm: design.widthMm, quietZone: design.quietZone, fg: design.fg, bg: design.bgColor }), `${name}.eps`, 'application/postscript');
	};

	const testSheet = () =>
		run('sheet', async () => {
			if (!design.encoded) return;
			const label = `Encodes a ${describe(design.type)} · ECC ${design.ecc} · version ${design.encoded.version}`;
			if (!design.styled) {
				const { exportTestSheet } = await import('@stoneqr/engine/export/pdf');
				downloadBytes(await exportTestSheet(design.encoded, { quietZone: design.quietZone, fg: design.fg, bg: design.bgColor, label }), `${name}-test-sheet.pdf`, 'application/pdf');
			} else {
				const { styledTestSheet } = await import('$lib/styled-pdf');
				downloadBytes(
					await styledTestSheet(svgText, {
						label,
						bg: design.transparentBg ? undefined : design.bg,
						moduleCount: design.encoded.size + 2 * design.quietZone,
						scale: design.styledScale
					}),
					`${name}-test-sheet.pdf`,
					'application/pdf'
				);
			}
		});

	const copy = () =>
		run('copy', async () => {
			const px = 1024;
			let blob: Blob;
			if (design.halftoneActive && design.halftoneRaster) {
				const { rasterToPngBlob } = await import('$lib/halftone');
				blob = await rasterToPngBlob(design.halftoneRaster);
			} else {
				blob = await canvasToPngBlob(await svgToCanvas(svgText, px, design.transparentBg ? undefined : design.bg));
			}
			const ok = await copyPngToClipboard(blob);
			if (!ok) throw new Error('Clipboard images are not supported in this browser. Download the PNG instead.');
			copied = true;
			setTimeout(() => (copied = false), 1600);
		});

	// Dynamic hand-off contract (plan §9). No token, nothing stored.
	const dynamicHref = $derived.by(() => {
		if (typeof window === 'undefined') return '#';
		const ret = `${window.location.origin}${window.location.pathname}`;
		return `${SITE.signupcity}/links/new?from=stoneqr&kind=qr&dest=${encodeURIComponent(design.payload)}&return=${encodeURIComponent(ret)}`;
	});
</script>

<section class="grid gap-5" aria-labelledby="export-heading">
	<div class="flex items-center justify-between gap-3">
		<h2 id="export-heading" class="text-xl">Size and download</h2>
		{#if design.encoded}<span class="badge {badgeClass}">{design.status.replace('-', ' ')}</span>{/if}
	</div>

	{#if advanced}
		<div class="grid grid-cols-[1fr_auto] gap-3">
			<div class="field">
				<label for="width">Print width</label>
				<input id="width" class="input num" type="number" min="5" step="1" bind:value={design.width} />
			</div>
			<div class="field">
				<label for="unit">Unit</label>
				<select id="unit" class="select" bind:value={design.unit}>
					<option value="mm">mm</option><option value="cm">cm</option><option value="in">in</option>
				</select>
			</div>
		</div>
		<div class="flex flex-wrap gap-1.5">
			{#each presets as p (p.mm)}
				<button type="button" class="rounded border border-rule-2 bg-white px-2 py-0.5 text-xs hover:border-ink-3" onclick={() => pickTier(p.mm)}>{p.label} mm</button>
			{/each}
		</div>
	{:else}
		<fieldset class="m-0 grid gap-2 border-0 p-0">
			<legend class="ticket mb-2">How big will it be printed?</legend>
			{#each SIZE_TIERS as t (t.id)}
				{@const fit = fitOf(t.mm)}
				{@const on = tier?.id === t.id}
				<label class="tier" data-on={on}>
					<input type="radio" name="size-tier" class="sr-only" value={t.id} checked={on} onchange={() => pickTier(t.mm)} />
					<span class="tier-dot" aria-hidden="true"></span>
					<span class="grid min-w-0 gap-0.5">
						<span class="flex flex-wrap items-baseline justify-between gap-x-3">
							<span class="font-medium">{t.name}</span>
							<span class="num text-xs text-ink-3">{t.mm} mm · {formatIn(t.mm)} in</span>
						</span>
						<span class="text-sm text-ink-2">{t.uses}</span>
						<span class="text-xs text-ink-3">{tierDistance(t)}.</span>
						{#if fit !== 'good'}
							<span class="text-xs font-medium {fit === 'small' ? 'text-block' : 'text-warn'}">{fitLabel[fit]}</span>
						{/if}
					</span>
				</label>
			{/each}
			{#if !tier}
				{@const fit = fitOf(design.widthMm)}
				<label class="tier" data-on={true}>
					<input type="radio" name="size-tier" class="sr-only" value="custom" checked />
					<span class="tier-dot" aria-hidden="true"></span>
					<span class="grid min-w-0 gap-0.5">
						<span class="flex flex-wrap items-baseline justify-between gap-x-3">
							<span class="font-medium">Custom</span>
							<span class="num text-xs text-ink-3">{formatMm(design.widthMm)} mm · {formatIn(design.widthMm, true)} in</span>
						</span>
						<span class="text-sm text-ink-2">Set in Advanced. Pick a size above to replace it.</span>
						{#if fit !== 'good'}
							<span class="text-xs font-medium {fit === 'small' ? 'text-block' : 'text-warn'}">{fitLabel[fit]}</span>
						{/if}
					</span>
				</label>
			{/if}
		</fieldset>
	{/if}
	{#if design.styled && design.styledScale > 1}
		<p class="hint">With the frame the whole artwork is <span class="num">{formatMm(fromMm(artWidthMm, design.unit))} {design.unit}</span> wide; the code inside stays {design.width} {design.unit}.</p>
	{/if}
	{#if advanced}
		<div class="field">
			<label for="dist">Read from (metres, optional)</label>
			<input id="dist" class="input num" type="number" min="0.1" step="0.1" placeholder="e.g. 2 for a lobby sign" value={design.scanDistanceM ?? ''} oninput={(e) => { const v = e.currentTarget.value; design.scanDistanceM = v === '' ? null : Number(v); }} />
		</div>
	{/if}

	{#if design.encoded}
		<ul class="grid gap-2">
			{#each visibleWarnings as w (w.code + w.level + w.message)}
				<li class="notice notice-{w.level}">{w.message}</li>
			{/each}
		</ul>
		{#if design.scanDistanceM}
			<p class="hint">For {design.scanDistanceM} m, print at least <strong class="num">{formatMm(fromMm(minWidthMmForDistance(design.scanDistanceM), design.unit))} {design.unit}</strong>. At the current size it reads to about <span class="num">{maxScanDistanceM(design.widthMm).toFixed(1)} m</span>.</p>
		{/if}
	{/if}

	{#if advanced}
		<div class="field">
			<span class="label">Error correction</span>
			<div class="flex flex-wrap items-center gap-3">
				<div class="seg" role="group" aria-label="Error correction">
					{#each eccs as e (e)}
						<button type="button" aria-pressed={design.ecc === e} disabled={!!design.logo || design.halftoneActive} onclick={() => (design.eccChoice = e)}>{e}</button>
					{/each}
				</div>
				<span class="hint">{design.halftoneActive ? 'Forced to H while a picture is blended in.' : design.logo ? 'Forced to H while a logo is present.' : { L: 'Survives 7% damage. Smallest code.', M: 'Survives 15%. The sensible default.', Q: 'Survives 25%.', H: 'Survives 30%. Needed for logos.' }[design.ecc]}</span>
			</div>
		</div>

		<div class="grid grid-cols-3 gap-3">
			<div class="field">
				<label for="quiet">Quiet zone</label>
				<input id="quiet" class="input num" type="number" min="0" max="10" step="1" bind:value={design.quietZone} />
			</div>
			<div class="field">
				<label for="minv">Min version</label>
				<input id="minv" class="input num" type="number" min="1" max="40" step="1" bind:value={design.minVersion} disabled={design.halftoneActive} title={design.halftoneActive ? 'Photo QR sets its own minimum version' : ''} />
			</div>
			<div class="field">
				<label for="mask">Mask</label>
				<select id="mask" class="select" value={String(design.mask)} onchange={(e) => { const v = e.currentTarget.value; design.mask = v === 'auto' ? 'auto' : Number(v); }}>
					<option value="auto">Auto</option>
					{#each [0, 1, 2, 3, 4, 5, 6, 7] as m (m)}<option value={String(m)}>{m}</option>{/each}
				</select>
			</div>
			<div class="field col-span-3">
				<label for="dpi">PNG resolution</label>
				<select id="dpi" class="select" bind:value={design.dpi}>
					<option value={150}>150 dpi (screen)</option>
					<option value={300}>300 dpi (print)</option>
					<option value={600}>600 dpi (fine print)</option>
				</select>
			</div>
		</div>
	{/if}

	<hr class="rule" />

	<div class="grid gap-2">
		{#if advanced}
			<div class="grid grid-cols-2 gap-2">
				<button type="button" class="btn btn-accent" disabled={!canExport || busy === 'svg'} onclick={svg}>SVG <span class="ticket text-paper/70">vector</span></button>
				<button type="button" class="btn" disabled={!canExport || busy === 'pdf' || design.halftoneActive} title={design.halftoneActive ? halftoneOnly : ''} onclick={pdf}>PDF <span class="ticket text-paper/70">{design.styled ? 'raster' : 'CMYK'}</span></button>
				<button type="button" class="btn btn-secondary" disabled={!canExport || busy === 'png'} onclick={png} aria-live="polite">
					{#if busy === 'png' && pngProgress}{pngProgress}{:else}PNG <span class="ticket">{design.dpi} dpi</span>{/if}
				</button>
				<button type="button" class="btn btn-secondary" disabled={!canExport || design.styled || design.halftoneActive} title={design.halftoneActive ? halftoneOnly : design.styled ? 'EPS is available for the plain square style' : ''} onclick={eps}>EPS</button>
			</div>
			<div class="grid grid-cols-2 gap-2">
				<button type="button" class="btn btn-secondary btn-sm" disabled={!canExport || busy === 'copy'} onclick={copy}>{copied ? 'Copied' : 'Copy PNG'}</button>
				<button type="button" class="btn btn-secondary btn-sm" disabled={!canExport || busy === 'sheet' || design.halftoneActive} title={design.halftoneActive ? halftoneOnly : ''} onclick={testSheet}>Print test sheet</button>
			</div>
		{:else}
			<!-- Basic: one obvious download, two for specialists, each saying who it is for. -->
			<button type="button" class="btn btn-accent w-full" disabled={!canExport || busy === 'png'} onclick={png} aria-live="polite">
				{#if busy === 'png' && pngProgress}{pngProgress}{:else}Download PNG <span class="ticket text-paper/70 num">{pngPx} px</span>{/if}
			</button>
			<div class="grid grid-cols-2 gap-2">
				<button type="button" class="btn btn-secondary" disabled={!canExport || busy === 'pdf' || design.halftoneActive} title={design.halftoneActive ? halftoneOnly : ''} onclick={pdf}>PDF <span class="ticket whitespace-nowrap">print</span></button>
				<button type="button" class="btn btn-secondary" disabled={!canExport || busy === 'svg'} onclick={svg}>SVG <span class="ticket whitespace-nowrap">vector</span></button>
			</div>
			<button type="button" class="btn btn-secondary btn-sm" disabled={!canExport || busy === 'copy'} onclick={copy}>{copied ? 'Copied' : 'Copy to clipboard'}</button>
			<p class="hint text-center">PNG for documents, slides, and the web. PDF for print shops. SVG for designers.</p>
		{/if}
		{#if design.encoded && !canExport}
			<p class="hint">
				{#if design.verify === 'checking'}Checking that the code decodes…{:else if design.verify === 'fail'}Downloads unlock once the code decodes on your device.{:else if design.logoBlocked}Shrink the logo below 25% of the area to download.{:else}Fix the blocking issue above to download.{/if}
			</p>
		{/if}
		<p class="text-center text-xs text-ink-3">{SITE.promise}</p>
	</div>

	<hr class="rule" />

	<div class="grid gap-2">
		<p class="ticket">Need to change it after printing?</p>
		<a href={design.payload ? dynamicHref : '#'} class="btn btn-secondary" aria-disabled={!design.payload} rel="noopener">Make it editable and trackable</a>
		<p class="hint">Creates a short link in a free SignUpCity account and brings you back here with it. StoneQR stores nothing. SignUpCity's links carry a published no-deactivation policy.</p>
	</div>
</section>
