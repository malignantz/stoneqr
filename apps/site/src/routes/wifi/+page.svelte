<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';
	import Generator from '$lib/generator/Generator.svelte';
</script>

<Seo title="WiFi QR code generator" description="Make a WiFi QR code that lets guests join your network by pointing their camera at it. Free, no sign-up, generated in your browser so the password is never uploaded." />

<div class="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
	<h1 class="reveal">Share your WiFi without spelling out the password.</h1>
	<p class="reveal reveal-2 mt-2 max-w-2xl text-lg text-ink-2">Guests point their camera, tap the prompt, and they are on. The password never leaves this page.</p>
</div>

<Generator preset="wifi" lockType={true} styleOpen={false} />

<section class="mx-auto max-w-7xl px-4 sm:px-6">
	<div class="prose">
		<h2>How WiFi QR codes work</h2>
		<p>The code contains the network name, the security type, and the password in a format both iPhone and Android cameras recognise (<code>WIFI:T:WPA;S:name;P:password;;</code>). The phone offers to join with one tap. Nothing is sent to us: the whole code is computed here in your browser, which matters more for a WiFi code than for most, because it contains a password.</p>
		<h3>Tips for a code that works first time</h3>
		<ul>
			<li>Choose WPA for any modern router; it also covers WPA2 and WPA3. WEP is obsolete and some phones refuse it.</li>
			<li>Type the network name exactly as the router broadcasts it, including capitals and spaces.</li>
			<li>Print it at 30 mm or larger for a table tent, and keep the plain black-on-white style for reliability.</li>
			<li>Print the test sheet and try it with one iPhone and one Android before laminating a stack.</li>
		</ul>
	</div>
</section>
