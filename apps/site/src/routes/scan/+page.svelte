<script lang="ts">
	import { goto } from '$app/navigation';
	import Seo from '$lib/components/Seo.svelte';
	import DropTile from '$lib/components/DropTile.svelte';
	import RedirectNote from '$lib/components/RedirectNote.svelte';
	import { redirectorFor } from '$lib/redirectors';
	import { readPicture, MAX_BYTES } from '$lib/scan/read';
	import { classify, fieldRows, toGenerator, type Scanned } from '$lib/scan/classify';

	// What is kept: the answer, as text. The picture itself is read into a canvas, decoded, and
	// dropped inside `readPicture`; nothing here holds a copy of it, so there is nothing to show
	// back as a thumbnail either.
	let result = $state<Scanned | null>(null);
	let problem = $state<'no-code' | 'unreadable' | 'too-big' | null>(null);
	let busy = $state(false);
	let copied = $state(false);
	/** A newer picture supersedes an older one still being read. */
	let ticket = 0;

	async function read(file: Blob) {
		const mine = ++ticket;
		busy = true;
		result = null;
		problem = null;
		copied = false;
		const found = await readPicture(file);
		if (mine !== ticket) return;
		busy = false;
		if (found.ok) result = classify(found.text);
		else problem = found.reason;
	}

	/** Paste works anywhere on the page: the first picture on the clipboard is read. Text is left alone. */
	function paste(e: ClipboardEvent) {
		for (const item of e.clipboardData?.items ?? []) {
			if (item.kind === 'file' && item.type.startsWith('image/')) {
				const file = item.getAsFile();
				if (file) {
					e.preventDefault();
					void read(file);
					return;
				}
			}
		}
	}

	// Warm the generator's code once there is something to hand over, so the button is instant.
	$effect(() => {
		if (result) void import('$lib/generator/Generator.svelte');
	});

	async function remake() {
		if (!result) return;
		const { openInGenerator } = await import('$lib/generator/Generator.svelte');
		openInGenerator(toGenerator(result));
		await goto('/');
	}

	async function copy() {
		if (!result) return;
		try {
			await navigator.clipboard.writeText(result.text);
			copied = true;
		} catch {
			/* clipboard blocked: the text is selectable on the page */
		}
	}

	function again() {
		ticket++;
		result = null;
		problem = null;
		busy = false;
		copied = false;
	}

	const kind = $derived(
		result?.kind === 'detected' ? `This is ${result.detected.label}.` : result?.kind === 'link' ? 'This is a web address.' : result ? 'This is plain text.' : ''
	);
	const rows = $derived(result?.kind === 'detected' ? fieldRows(result.detected) : []);
	const redirector = $derived(result?.kind === 'link' ? redirectorFor(result.link.text) : null);
	const bytes = $derived(result ? new TextEncoder().encode(result.text).length : 0);
	const megabytes = MAX_BYTES / 1024 / 1024;
</script>

<Seo
	title="Read a QR code"
	description="Read a QR code from a picture on your device. See the exact text and where it leads without opening it, and whether the address goes through a redirect service."
/>

<svelte:window onpaste={paste} />

<div class="mx-auto max-w-7xl px-4 py-12 sm:px-6">
	<p class="ticket reveal">QR code reader</p>
	<h1 class="reveal reveal-2 mt-3 max-w-3xl">See what a QR code holds before you open it.</h1>
	<p class="reveal reveal-3 mt-5 max-w-2xl text-lg text-ink-2">
		Choose a picture of a code, drop one here, or paste it. It is read on this device, and the picture goes nowhere.
	</p>

	<div class="mt-10 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
		<section class="sheet grid gap-5 p-5 sm:p-6" aria-labelledby="reader-title">
			<h2 id="reader-title" class="sr-only">Reader</h2>
			<DropTile
				accept="image/*"
				ariaLabel="Choose a picture of a QR code"
				label="Drop a picture of a code here, or choose a file"
				hint="A screenshot or a photo. You can also paste one: copy it, then press Ctrl+V or Cmd+V on this page."
				disabled={busy}
				onfile={read}
			/>

			<div aria-live="polite" class="grid grid-cols-1 gap-5">
				{#if busy}
					<p class="text-sm text-ink-2">Reading the picture…</p>
				{/if}

				{#if problem === 'no-code'}
					<div class="notice notice-warn">
						<p><strong>No code found in that picture.</strong> A few things to try:</p>
						<ul class="ml-5 list-disc text-ink-2">
							<li>Crop closer to the code, but keep its white border in the picture.</li>
							<li>Use a sharper picture: hold the phone steady and let it focus first.</li>
							<li>Add more light, and avoid glare across the code.</li>
							<li>Make sure the whole code is in the picture, all three corner squares included.</li>
						</ul>
					</div>
				{:else if problem === 'unreadable'}
					<p class="notice notice-warn">
						That file could not be opened as a picture. Try a PNG or a JPEG, or take a screenshot of the code and choose that.
					</p>
				{:else if problem === 'too-big'}
					<p class="notice notice-warn">
						That picture is very large (over {megabytes} MB). Crop it or save a smaller copy, then try again.
					</p>
				{/if}

				{#if result}
					<div class="grid grid-cols-1 gap-5">
						<p class="ticket">{kind}</p>

						{#if result.kind === 'link'}
							<!-- Plain text on purpose, never an <a>: a reader must not be a way to get phished. -->
							<p class="font-mono text-base leading-snug [overflow-wrap:anywhere]" data-testid="scan-link">
								<span class="text-ink-3">{result.link.scheme}</span><strong class="text-lg font-bold text-ink">{result.link.host}</strong><span class="text-ink-3">{result.link.rest}</span>
							</p>
							{#if result.link.userinfo}
								<p class="notice notice-warn">
									Everything before the @ is a name, not the site. This address goes to <strong class="font-mono">{result.link.host}</strong>.
								</p>
							{/if}
							{#if result.link.nonLatin}
								<p class="notice notice-warn">
									This site name uses characters beyond plain a to z, and some of those look just like ordinary letters. Check it letter by letter before you trust it.
								</p>
							{/if}
							<RedirectNote url={result.link.text} />
						{:else if rows.length}
							<dl class="grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 gap-y-3">
								{#each rows as row (row.label)}
									<dt class="ticket pt-1">{row.label}</dt>
									<dd class="whitespace-pre-wrap [overflow-wrap:anywhere]">{row.value}</dd>
								{/each}
							</dl>
						{/if}

						<div class="grid grid-cols-1 gap-1.5">
							<p class="ticket">Exactly what the code holds</p>
							<p class="rounded-md border border-rule bg-field p-3 font-mono text-sm whitespace-pre-wrap [overflow-wrap:anywhere]" data-testid="scan-text">{result.text}</p>
							<p class="hint num">{bytes} {bytes === 1 ? 'byte' : 'bytes'}</p>
						</div>

						<!-- Said before the button, not after: what the new code will hold, redirect and all. -->
						<p class="hint">
							{#if redirector}
								The new code will hold this same address, so it will still go through {redirector.name}. To cut that out, put the page's own address in the Web address box instead.
							{:else}
								The new code holds exactly this, made in your browser: no account, and no service in between that could switch it off.
							{/if}
						</p>
						<div class="flex flex-wrap gap-2">
							<button type="button" class="btn btn-accent" onclick={remake}>Make this a StoneQR code</button>
							<button type="button" class="btn btn-secondary" onclick={copy}>{copied ? 'Copied' : 'Copy the text'}</button>
							<button type="button" class="btn btn-secondary" onclick={again}>Read another</button>
						</div>

					</div>
				{/if}
			</div>
		</section>

		<div class="prose">
			<h2>How the reader works</h2>
			<p>
				Choose a picture of a QR code, drop one on the tile, or paste one from the clipboard. The
				same decoders that check every download on this site read it here, on your device. Nothing
				is uploaded, and once the answer is on screen the picture is let go.
			</p>
			<h2>Why a link is shown, not opened</h2>
			<p>
				A QR code is only a way of writing text down, and the text is often a web address. Anyone
				can print a code and stick it over another, so a code is worth reading before it is
				followed. This page sets the address in plain type with the name of the site in heavy
				letters, and it is never a link you can tap. Read the name, decide whether it is the one you
				expected, and then open it yourself or leave it.
			</p>
			<h2>What a redirect service is</h2>
			<p>
				Some codes do not hold the address you end up at. They hold a short address on a redirect
				service, a link shortener or a QR code service, which keeps the real destination on its own
				server. When the code is scanned, the phone asks that service where to go and is sent on.
				That is how such a code can be edited after it is printed. It is also why the code depends
				on the service: whoever runs it decides where the link leads, and can change it or switch it
				off. When an address is on a service this page knows, it says so. The list is short, so an
				address that is not on it may still be a redirect.
			</p>
			<h2>Make this a StoneQR code</h2>
			<p>
				The button hands what the code holds to the generator with the form already filled in: a
				WiFi network, a contact, an event, a link. The new code holds exactly what the old one did,
				computed in your browser, with no account and no server of ours in between. If the old code
				holds a redirect address, the new one still does; to get a code that holds the page itself,
				put that page's address in the Web address box. Then no redirect service stands between the
				code and the page.
			</p>
			<h2>When a picture will not read</h2>
			<p>
				Crop closer to the code but keep its white border, use a sharper picture, add more light,
				and make sure the whole code is in view. A screenshot of a code on a screen usually reads
				better than a photo of a code on paper.
			</p>
			<p>
				<a href="/print-size">Sizing a code for print</a> or <a href="/">making one of your own</a>.
			</p>
		</div>
	</div>
</div>
