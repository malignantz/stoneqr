<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';
</script>

<Seo
	title="QR codes that never expire"
	description="Why StoneQR codes cannot expire or be deactivated: they are generated in your browser and never sent to a server. The story of the expiring-code trap and how static codes work."
/>

<article class="mx-auto max-w-7xl px-4 py-12 sm:px-6">
	<p class="ticket reveal">Policy · How static codes work</p>
	<h1 class="reveal reveal-2 mt-3 max-w-3xl">A QR code we never had cannot be switched off.</h1>
	<p class="reveal reveal-3 mt-5 max-w-2xl text-lg text-ink-2">
		Every static code on this site is computed on your device. The text you type becomes a pattern
		of squares in your browser's memory, you download the file, and that is the end of it. There is
		no account, no database row, no timer.
	</p>

	<div class="prose mt-12">
		<h2>The trap this site exists to avoid</h2>
		<p>
			Search for "free QR code generator" and the top results issue codes that work for a trial
			period, then stop scanning unless you subscribe. The codes were never yours: they pointed at a
			redirect on the vendor's server, and the vendor turned the redirect off. People find out when a
			printed menu, a wedding invitation, or a lobby sign stops working weeks after it was ordered.
		</p>
		<p>
			The largest of these sites has thousands of one-star reviews describing exactly this. The
			complaint is so common that search engines autocomplete "that doesn't expire" and "no sign up"
			after the phrase "free QR code generator".
		</p>

		<h2>Static versus dynamic, in one paragraph</h2>
		<p>
			A <strong>static</strong> code contains the destination itself: the URL, the WiFi password, the
			contact card. Anyone with a camera can read it forever, because the information is in the
			ink. A <strong>dynamic</strong> code contains a short link to someone else's server, which then
			forwards the phone to the real destination. Dynamic codes can be edited and counted, which is
			genuinely useful, but they work only as long as that server chooses to forward.
		</p>

		<h2>What StoneQR does</h2>
		<ul>
			<li>Static codes are the default and they never leave your browser. Read the <a href="/open-source">source</a> to verify it.</li>
			<li>Every download is decoded again on your device before the button turns on, so what you print is what a phone will read.</li>
			<li>The <a href="/print-size">sizing panel</a> tells you when a code is too small for the distance it will be scanned from.</li>
			<li>Vector exports (SVG, PDF, EPS) with real millimetre dimensions, so a print shop can use them directly.</li>
		</ul>

		<h2>If you need an editable code</h2>
		<p>
			Sometimes the destination has to change after printing. The honest way to do that is a
			short link on a domain you control, or on a service whose terms you have read, encoded as a
			plain URL here. The code itself is then permanent; only the link behind it changes. A
			built-in hand-off to a link service is planned, but StoneQR ships without one for now.
		</p>

		<h2>The short version</h2>
		<p>
			If a generator asks for your email before it gives you the SVG, or if its "free" code is a
			link to its own domain, the code can be taken away. StoneQR's cannot, because we never had
			it.
		</p>
	</div>

	<p class="mt-12">
		<a href="/" class="btn btn-accent">Make a code that never expires</a>
	</p>
</article>
