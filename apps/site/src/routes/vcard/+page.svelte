<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';
	import Generator from '$lib/generator/Generator.svelte';
</script>

<Seo title="vCard QR code generator" description="Make a vCard or MeCard QR code for a business card, badge, or email signature. Free, no sign-up, generated in your browser." />

<Generator preset="vcard" lockType={false} styleOpen={false}>
	{#snippet hero()}
	<h1 class="reveal">A contact card people can save in one tap.</h1>
	<p class="reveal reveal-2 mt-2 max-w-2xl text-lg text-ink-2">Choose vCard for the full set of fields or MeCard for a smaller code. Nothing is uploaded.</p>
	{/snippet}
</Generator>

<section class="mx-auto max-w-7xl px-4 sm:px-6">
	<div class="prose">
		<h2>vCard or MeCard?</h2>
		<p>Both formats store a contact. vCard 3.0 carries more fields (title, work and mobile numbers, a full address, a note) and is what iPhone and Android cameras read most reliably. MeCard is a compact format from the early days of QR that holds a name, phone, email, address, and note in about two thirds of the space, which means bigger modules on a small business card.</p>
		<h3>Keep it scannable on a business card</h3>
		<ul>
			<li>Every field you fill in makes the code denser. Leave out what people can find on your website.</li>
			<li>A card usually has room for a 20 to 25 mm code. Watch the module size in the panel; below 0.4 mm it becomes unreliable.</li>
			<li>Photos are deliberately not supported: a small image would push the code past 100 modules a side.</li>
			<li>Use the same colours as the card, but keep the contrast above 4:1 and the code dark on light.</li>
		</ul>
	</div>
</section>
