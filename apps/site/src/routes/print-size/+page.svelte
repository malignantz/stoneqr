<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import SectionHeader from '$lib/components/SectionHeader.svelte';
	import Slider from '$lib/components/Slider.svelte';
	import {
		encode,
		moduleMm,
		maxScanDistanceM,
		minWidthMmForDistance,
		minWidthMmForModule,
		toMm,
		fromMm,
		assess,
		summary,
		formatMm,
		type Ecc,
		type LengthUnit
	} from '@stoneqr/engine';

	let content = $state('https://stoneqr.app/example-page');
	let ecc = $state<Ecc>('M');
	let width = $state(40);
	let unit = $state<LengthUnit>('mm');
	let distance = $state(0.3);

	const qr = $derived.by(() => {
		try {
			return encode(content || ' ', { ecc });
		} catch {
			return null;
		}
	});
	const widthMm = $derived(toMm(width, unit));
	const size = $derived(qr?.size ?? 25);
	const mod = $derived(moduleMm(widthMm, size));
	const warnings = $derived(assess({ widthMm, size, ecc, scanDistanceM: distance }));
	const status = $derived(summary({ widthMm, size, ecc, scanDistanceM: distance }));
	const badgeClass = $derived(
		status === 'print-safe' ? 'badge-ok' : status === 'scannable' ? 'badge-muted' : status === 'risky' ? 'badge-warn' : 'badge-block'
	);
	const eccRows = $derived.by(() =>
		(['L', 'M', 'Q', 'H'] as Ecc[]).map((e) => {
			try {
				const s = encode(content || ' ', { ecc: e }).size;
				return { ecc: e, size: s, version: (s - 17) / 4, minMm: minWidthMmForModule(s, 4, 0.5) };
			} catch {
				return { ecc: e, size: 0, version: 0, minMm: 0 };
			}
		})
	);
	function show(mm: number) {
		return `${formatMm(fromMm(mm, unit))} ${unit}`;
	}
</script>

<Seo
	title="QR code size calculator"
	description="How big should a QR code be? Enter the print width or the scan distance and get the module size, the minimum recommended width, and plain-language warnings."
/>

<div class="mx-auto max-w-7xl px-4 py-12 sm:px-6">
	<p class="ticket reveal">Sizing calculator</p>
	<h1 class="reveal reveal-2 mt-3 max-w-3xl">How big should this QR code be?</h1>
	<p class="reveal reveal-3 mt-5 max-w-2xl text-lg text-ink-2">
		Paste what the code will contain, choose a print width or a scan distance, and read the answer.
		The same panel lives inside the <a href="/">generator</a>.
	</p>

	<div class="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
		<section class="sheet grid gap-5 p-5 sm:p-6">
			<div class="field">
				<label for="content">Content</label>
				<textarea id="content" class="textarea mono" bind:value={content} rows="3"></textarea>
				<p class="hint">Only used to count modules. It stays in your browser.</p>
			</div>
			<div class="field">
				<span class="label">Error correction</span>
				<div class="seg" role="group" aria-label="Error correction">
					{#each ['L', 'M', 'Q', 'H'] as const as e (e)}
						<button type="button" aria-pressed={ecc === e} onclick={() => (ecc = e)}>{e}</button>
					{/each}
				</div>
			</div>
			<div class="grid grid-cols-[1fr_auto] gap-3">
				<div class="field">
					<label for="width">Print width</label>
					<input id="width" class="input num" type="number" min="1" step="1" bind:value={width} />
				</div>
				<div class="field">
					<label for="unit">Unit</label>
					<select id="unit" class="select" bind:value={unit}>
						<option value="mm">mm</option>
						<option value="cm">cm</option>
						<option value="in">in</option>
					</select>
				</div>
			</div>
			<div class="field">
				<label for="distance">Scan distance (metres)</label>
				<input id="distance" class="input num" type="number" min="0.1" step="0.1" bind:value={distance} />
				<Slider
					label="Drag"
					bind:value={distance}
					min={0.1}
					max={10}
					step={0.1}
					reset={0.3}
					startLabel="In hand"
					endLabel="Across a room"
					format={(v) => `${v.toFixed(1)} m`}
				/>
				<p class="hint">Arm's length is about 0.3 m. A poster across a room is 2 to 3 m.</p>
			</div>
		</section>

		<section class="grid content-start gap-6">
			<div class="sheet p-5 sm:p-6">
				<SectionHeader title="Result" level={3}>
					{#snippet badge()}<span class="badge badge-fixed {badgeClass}">{status.replace('-', ' ')}</span>{/snippet}
				</SectionHeader>
				<dl class="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
					<div><dt class="ticket">Version</dt><dd class="num text-2xl">{qr ? qr.version : '–'}</dd></div>
					<div><dt class="ticket">Modules</dt><dd class="num text-2xl">{size}<span class="text-base text-ink-3">+8</span></dd></div>
					<div><dt class="ticket">Module size</dt><dd class="num text-2xl">{mod.toFixed(2)}<span class="text-base text-ink-3"> mm</span></dd></div>
					<div><dt class="ticket">Reads to</dt><dd class="num text-2xl">{maxScanDistanceM(widthMm).toFixed(1)}<span class="text-base text-ink-3"> m</span></dd></div>
				</dl>
				<ul class="mt-5 grid gap-2">
					{#each warnings as w (w.code + w.level)}
						<li class="notice notice-{w.level}">
							<Icon name={w.level === 'info' ? 'tick' : 'warning'} size={15} />
							<span>{w.message}</span>
						</li>
					{/each}
				</ul>
				<p class="mt-5 text-sm text-ink-2">
					For a scan distance of <span class="num">{distance} m</span>, print at least
					<strong class="num">{show(minWidthMmForDistance(distance))}</strong> wide.
					To keep modules at 0.5 mm, print at least <strong class="num">{show(minWidthMmForModule(size, 4, 0.5))}</strong>.
				</p>
			</div>

			<div class="sheet p-5 sm:p-6">
				<SectionHeader title="What error correction costs" level={3} />
				<table class="mt-3 w-full text-sm">
					<thead>
						<tr class="ticket text-left"><th class="py-1 font-medium">ECC</th><th class="py-1 font-medium">Version</th><th class="py-1 font-medium">Modules</th><th class="py-1 font-medium">Min width @0.5 mm</th></tr>
					</thead>
					<tbody>
						{#each eccRows as r (r.ecc)}
							<tr class="border-t border-rule" class:font-semibold={r.ecc === ecc}>
								<td class="num py-1.5">{r.ecc}</td>
								<td class="num py-1.5">{r.version || '–'}</td>
								<td class="num py-1.5">{r.size || '–'}</td>
								<td class="num py-1.5">{r.size ? show(r.minMm) : 'too long'}</td>
							</tr>
						{/each}
					</tbody>
				</table>
				<p class="hint mt-3">Higher error correction survives more damage and logos, but needs more modules, so it needs more paper for the same module size.</p>
			</div>
		</section>
	</div>

	<div class="prose mt-14">
		<h2>The rules behind the numbers</h2>
		<p>
			A QR code is a grid of square modules. Version 1 is 21 modules across; each version adds 4,
			up to 177 at version 40. Around the grid sits a quiet zone of 4 blank modules on every side,
			which scanners need to find the edges. The printed width is shared between all of those
			modules, so the more content you encode, the smaller each module gets at a given size.
		</p>
		<p>
			Phone cameras need each module to cover a few pixels at the distance they scan from. In
			practice, modules under about 0.4 mm are unreliable in print, and 0.5 mm or larger is
			comfortable. The other rule of thumb is that a code can be read from about ten times its own
			width: a 30 mm code from 0.3 m, a 250 mm sign from about 2 m, with a 25 percent margin for
			poor light and angles built into the recommendation above.
		</p>
		<p>
			If the calculator says your code is too small, you have three levers: print it larger, encode
			less (a shorter URL is the usual fix), or lower the error correction. Error correction is
			worth keeping at M or higher for anything that will live outdoors or wear a logo.
		</p>
	</div>
</div>
