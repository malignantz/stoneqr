<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';
	import Generator from '$lib/generator/Generator.svelte';
</script>

<Seo title="Calendar event QR code" description="Make a QR code that adds an event to the calendar. Free, no sign-up, generated in your browser, with honest notes about which phones support it." />

<Generator preset="event" styleOpen={false}>
	{#snippet hero()}
	<h1 class="reveal">Add an event to the calendar with one scan.</h1>
	<p class="reveal reveal-2 mt-2 max-w-2xl text-lg text-ink-2">Encoded as a standard calendar entry with times converted to UTC so they show correctly in any time zone.</p>
	{/snippet}
</Generator>

<section class="mx-auto max-w-7xl px-4 sm:px-6">
	<div class="prose">
		<h2>What to expect from phones</h2>
		<p>The code contains a standard iCalendar event (<code>VEVENT</code>). iPhone Camera and Google Lens recognise it and offer to add the event. Some Android camera apps show the raw text instead, and a few older readers ignore it. This is a limitation of the format, not of this generator, and it is why the page says so instead of promising it works everywhere.</p>
		<h3>The reliable alternative</h3>
		<p>If the event matters, link to an event page instead: a normal URL that opens on every phone, shows the details, and offers an "add to calendar" button. That is a URL code, which every camera handles, and it can carry an RSVP form. The <a href="/">URL generator</a> makes that code; a hosted event page with RSVPs is what <a href="https://signupcity.app" rel="noopener">SignUpCity</a> is for.</p>
	</div>
</section>
