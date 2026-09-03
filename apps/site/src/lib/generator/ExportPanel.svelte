<script lang="ts">
	import { renderSvg, exportPng, exportEps, setPngDpi, fromMm, formatMm, minWidthMmForDistance, maxScanDistanceM, type Ecc, type LengthUnit } from '@stoneqr/engine';
	import { downloadText, downloadBytes, copyPngToClipboard, slug } from '$lib/download';
	import { svgToCanvas, canvasToPngBlob } from '$lib/svg-raster';
	import { SITE } from '$lib/site';
	import { describe, type Design } from './state.svelte';

	let { design }: { design: Design } = $props();

	const canExport = $derived(!!design.encoded && design.verify === 'ok' && !design.logoBlocked && design.status !== 'blocked');
	const svgText = $derived(design.styled ? design.styledSvg : design.plainSvg);
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

	const halftoneOnly = 'Halftone exports as PNG or SVG';

	let busy = $state('');
	let copied = $state(false);
	let advanced = $state(false);

	async function run(label: string, fn: () => Promise<void>) {
		busy = label;
		try {
			await fn();
		} catch (e) {
			alert(`Export failed: ${e instanceof Error ? e.message : String(e)}`);
		} finally {
			busy = '';
		}
	}

	const svg = () =>
		run('svg', async () => {
			if (design.halftoneActive && design.encoded && design.halftoneImage) {
				const { halftoneToSvg } = await import('$lib/halftone');
				const text = halftoneToSvg(design.encoded, design.halftoneRaster, design.halftoneImage, halftoneOpts(), design.widthMm);
				downloadText(text, `${name}.svg`, 'image/svg+xml');
				return;
			}
			downloadText(svgText, `${name}.svg`, 'image/svg+xml');
		});

	/** The option set the preview verified, so the export is the code that actually decoded. */
	const halftoneOpts = () => ({ ...(design.halftoneOpts ?? {}), quietZone: design.quietZone });

	const png = () =>
		run('png', async () => {
			if (!design.encoded) return;
			if (design.halftoneActive && design.halftoneImage) {
				const { renderHalftone } = await import('@stoneqr/engine');
				const { loadImageRaster, rasterToPngBlob } = await import('$lib/halftone');
				const total = design.encoded.size + 2 * design.quietZone;
				// Cap the raster at 8192 px per side: past that browsers refuse to allocate the canvas.
				const pxPerModule = Math.min(
					Math.max(2, Math.floor(8192 / total)),
					Math.max(2, Math.round(((design.widthMm / 25.4) * design.dpi) / total))
				);
				const raster = renderHalftone(design.encoded, await loadImageRaster(design.halftoneImage), {
					...halftoneOpts(),
					pxPerModule
				});
				const bytes = new Uint8Array(await (await rasterToPngBlob(raster)).arrayBuffer());
				downloadBytes(setPngDpi(bytes, design.dpi), `${name}-${design.dpi}dpi.png`, 'image/png');
				return;
			}
			if (!design.styled) {
				const r = exportPng(design.encoded, { widthMm: design.widthMm, dpi: design.dpi, quietZone: design.quietZone, fg: design.fg, bg: design.transparentBg ? '#ffffff' : design.bg });
				downloadBytes(r.png, `${name}-${design.dpi}dpi.png`, 'image/png');
			} else {
				const px = Math.round((design.widthMm / 25.4) * design.dpi);
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
				downloadBytes(await styledPdf(svgText, design.widthMm, { title, bg: design.transparentBg ? undefined : design.bg }), `${name}.pdf`, 'application/pdf');
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
				downloadBytes(await styledTestSheet(svgText, { label, bg: design.transparentBg ? undefined : design.bg, moduleCount: design.encoded.size + 2 * design.quietZone }), `${name}-test-sheet.pdf`, 'application/pdf');
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
			<button type="button" class="rounded border border-rule-2 bg-white px-2 py-0.5 text-xs hover:border-ink-3" onclick={() => { design.unit = 'mm'; design.width = p.mm; }}>{p.label} mm</button>
		{/each}
	</div>
	<div class="field">
		<label for="dist">Read from (metres, optional)</label>
		<input id="dist" class="input num" type="number" min="0.1" step="0.1" placeholder="e.g. 2 for a lobby sign" value={design.scanDistanceM ?? ''} oninput={(e) => { const v = e.currentTarget.value; design.scanDistanceM = v === '' ? null : Number(v); }} />
	</div>

	{#if design.encoded}
		<ul class="grid gap-2">
			{#each design.warnings as w (w.code + w.level + w.message)}
				<li class="notice notice-{w.level}">{w.message}</li>
			{/each}
		</ul>
		{#if design.scanDistanceM}
			<p class="hint">For {design.scanDistanceM} m, print at least <strong class="num">{formatMm(fromMm(minWidthMmForDistance(design.scanDistanceM), design.unit))} {design.unit}</strong>. At the current size it reads to about <span class="num">{maxScanDistanceM(design.widthMm).toFixed(1)} m</span>.</p>
		{/if}
	{/if}

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

	<button type="button" class="ticket text-left underline" onclick={() => (advanced = !advanced)}>{advanced ? 'Hide' : 'Show'} advanced encoding</button>
	{#if advanced}
		<div class="grid grid-cols-3 gap-3">
			<div class="field">
				<label for="quiet">Quiet zone</label>
				<input id="quiet" class="input num" type="number" min="0" max="10" step="1" bind:value={design.quietZone} />
			</div>
			<div class="field">
				<label for="minv">Min version</label>
				<input id="minv" class="input num" type="number" min="1" max="40" step="1" bind:value={design.minVersion} disabled={design.halftoneActive} title={design.halftoneActive ? 'Halftone sets its own minimum version' : ''} />
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
		<div class="grid grid-cols-2 gap-2">
			<button type="button" class="btn btn-accent" disabled={!canExport || busy === 'svg'} onclick={svg}>SVG <span class="ticket text-paper/70">vector</span></button>
			<button type="button" class="btn" disabled={!canExport || busy === 'pdf' || design.halftoneActive} title={design.halftoneActive ? halftoneOnly : ''} onclick={pdf}>PDF <span class="ticket text-paper/70">{design.styled ? 'raster' : 'CMYK'}</span></button>
			<button type="button" class="btn btn-secondary" disabled={!canExport || busy === 'png'} onclick={png}>PNG <span class="ticket">{design.dpi} dpi</span></button>
			<button type="button" class="btn btn-secondary" disabled={!canExport || design.styled || design.halftoneActive} title={design.halftoneActive ? halftoneOnly : design.styled ? 'EPS is available for the plain square style' : ''} onclick={eps}>EPS</button>
		</div>
		<div class="grid grid-cols-2 gap-2">
			<button type="button" class="btn btn-secondary btn-sm" disabled={!canExport || busy === 'copy'} onclick={copy}>{copied ? 'Copied' : 'Copy PNG'}</button>
			<button type="button" class="btn btn-secondary btn-sm" disabled={!canExport || busy === 'sheet' || design.halftoneActive} title={design.halftoneActive ? halftoneOnly : ''} onclick={testSheet}>Print test sheet</button>
		</div>
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
