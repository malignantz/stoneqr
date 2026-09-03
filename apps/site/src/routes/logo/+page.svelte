<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';
	import Generator from '$lib/generator/Generator.svelte';
</script>

<Seo title="QR code with logo" description="Add a logo to a QR code for free, with the error correction raised automatically, a size cap, and a decode check so the printed code still scans." />

<Generator preset="url" styleOpen={true}>
	{#snippet hero()}
	<h1 class="reveal">A logo in the middle, and it still scans.</h1>
	<p class="reveal reveal-2 mt-2 max-w-2xl text-lg text-ink-2">Error correction goes to H automatically, the logo is capped at a quarter of the area, and the download unlocks only after the code decodes.</p>
	{/snippet}
</Generator>

<section class="mx-auto max-w-7xl px-4 sm:px-6">
	<div class="prose">
		<h2>Why logos work at all</h2>
		<p>QR codes carry error correction: at level H, up to 30 percent of the modules can be covered or damaged and the code still reads. A centred logo uses some of that budget. This page raises the level to H when you add an image, keeps the corner finder patterns clear, and stops you at 25 percent of the area, because 30 percent is a theoretical limit that print, glare, and cheap phone lenses eat into.</p>
		<h3>Get the most from a logo</h3>
		<ul>
			<li>Keep the logo under 20 percent of the area. The slider turns amber above that.</li>
			<li>Leave the white space behind the logo on. It gives the scanner a clean edge to work with.</li>
			<li>Watch the badge: the code is decoded on your device every time you change something. If it says "did not decode", shrink the logo or add a module of margin.</li>
			<li>Higher error correction makes the code denser, so check the print size panel again after adding the logo.</li>
		</ul>
	</div>
</section>
