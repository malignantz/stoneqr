<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { afterNavigate } from '$app/navigation';
	import Mark from '$lib/components/Mark.svelte';
	import { NAV, SITE } from '$lib/site';

	let { children } = $props();
	const current = $derived(page.url.pathname);

	// After the first client-side navigation the hero reveal animation is switched off (app.css),
	// so moving between pages feels like switching a tab rather than loading a new one.
	afterNavigate(({ type }) => {
		if (type !== 'enter') document.documentElement.dataset.navigated = '';
	});
</script>

<div class="flex min-h-dvh flex-col">
	<header class="border-b border-rule bg-paper/80 backdrop-blur-sm">
		<div class="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
			<a href="/" class="display flex items-center gap-2 text-xl text-ink no-underline" aria-label="StoneQR home">
				<Mark size={22} />
				<span>Stone<span class="text-accent">QR</span></span>
			</a>
			<!-- preload-code=eager fetches every nav route's chunk right after load, so a click needs no network. -->
			<nav
				aria-label="Primary"
				class="nav-scroll -mx-1 flex w-full min-w-0 items-center gap-x-1 overflow-x-auto px-1 text-sm md:w-auto md:flex-wrap md:overflow-visible"
				data-sveltekit-preload-code="eager"
			>
				{#each NAV as item (item.href)}
					<a
						href={item.href}
						aria-current={current === item.href ? 'page' : undefined}
						class="shrink-0 rounded px-2 py-1 text-ink-2 no-underline hover:bg-paper-2 hover:text-ink aria-[current=page]:bg-ink aria-[current=page]:text-paper"
					>
						{item.label}
					</a>
				{/each}
			</nav>
			<p class="ticket ml-auto hidden lg:block">Free · Open source · No account</p>
		</div>
	</header>

	<main class="flex-1">
		{@render children()}
	</main>

	<footer class="mt-16 border-t border-rule bg-paper-2/60">
		<div class="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-3">
			<div>
				<p class="display text-lg">Stone<span class="text-accent">QR</span></p>
				<p class="mt-1 text-sm text-ink-2">{SITE.tagline}</p>
				<p class="mt-3 text-sm text-ink-3">
					Static codes are generated on your device and never sent anywhere. We cannot deactivate
					them because we never had them.
				</p>
			</div>
			<div class="text-sm">
				<p class="ticket mb-2">Tools</p>
				<ul class="grid gap-1">
					<li><a href="/">QR code generator</a></li>
					<li><a href="/wifi">WiFi QR code</a></li>
					<li><a href="/vcard">vCard QR code</a></li>
					<li><a href="/event">Calendar event QR code</a></li>
					<li><a href="/logo">QR code with logo</a></li>
					<li><a href="/photo">Photo QR code</a></li>
					<li><a href="/print-size">Print size calculator</a></li>
					<li><a href="/bulk">Bulk and label sheets</a></li>
				</ul>
			</div>
			<div class="text-sm">
				<p class="ticket mb-2">About</p>
				<ul class="grid gap-1">
					<li><a href="/never-expires">Why these codes never expire</a></li>
					<li><a href="/compare">Compare generators</a></li>
					<li><a href="/open-source">Open source (MIT)</a></li>
					<li><a href="/privacy">Privacy</a></li>
					<li><a href={SITE.repo} rel="noopener">Source on GitHub</a></li>
				</ul>
				<p class="mt-4 text-ink-3">
					By the makers of <a href={SITE.signupcity} rel="noopener">SignUpCity</a>.
				</p>
			</div>
		</div>
	</footer>
</div>
