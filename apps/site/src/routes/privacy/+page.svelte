<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';
</script>

<Seo
	title="Privacy"
	description="StoneQR's privacy policy in two paragraphs: what you type never leaves your browser, and the only analytics are cookie-free page counts."
/>

<article class="mx-auto max-w-7xl px-4 py-12 sm:px-6">
	<p class="ticket reveal">Privacy</p>
	<h1 class="reveal reveal-2 mt-3 max-w-3xl">Two paragraphs.</h1>

	<div class="prose mt-8 text-lg">
		<p>
			Everything you type into StoneQR, including URLs, WiFi passwords, contact details, and
			uploaded logos, stays in your browser. The site has no server that receives it, no account
			system, and no database. Downloads are produced on your device. If you choose the optional
			"make it editable" hand-off, you are taken to SignUpCity, a separate product with its own
			<a href="https://signupcity.app/privacy" rel="noopener">privacy policy</a>; StoneQR passes the
			destination in the link you click and keeps no copy.
		</p>
		<p>
			The only measurement is Cloudflare Web Analytics, which counts page views without cookies and
			without reading page content. When you generate a code, the site records a single anonymous
			"generated" event with no payload data, so we can say how many codes were made. That is all.
		</p>
	</div>
</article>
