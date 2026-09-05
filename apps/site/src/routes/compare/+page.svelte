<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';

	// Keep this table factual and easy to verify. Statements about other products describe
	// their free tier as documented on their own sites and in public reviews as of September 2026.
	// See docs/claims.md in the repo for the sources behind each row.
	const rows = [
		{ feature: 'Free codes keep working forever', stoneqr: 'Yes, they are generated on your device', trial: 'No, trial codes stop after the trial', monkey: 'Yes for static codes' },
		{ feature: 'Account or email required', stoneqr: 'Never', trial: 'Yes', monkey: 'No for static codes' },
		{ feature: 'SVG, PDF, and EPS with physical dimensions', stoneqr: 'Yes, free', trial: 'Paid tiers', monkey: 'SVG, PDF, EPS' },
		{ feature: 'Error-correction control', stoneqr: 'L, M, Q, H, with a live size preview', trial: 'Limited', monkey: 'No' },
		{ feature: 'Print-size and scan-distance calculator', stoneqr: 'Built in', trial: 'No', monkey: 'No' },
		{ feature: 'Decode check before every download', stoneqr: 'Yes', trial: 'No', monkey: 'No' },
		{ feature: 'Your content sent to a server', stoneqr: 'No', trial: 'Yes', monkey: 'Yes, rendered server-side' },
		{ feature: 'Ads or upsells to third parties', stoneqr: 'None', trial: 'Subscription upsell', monkey: 'Upsell to a dynamic-code vendor' },
		{ feature: 'Source code', stoneqr: 'Open, MIT licence', trial: 'Closed', monkey: 'Closed' }
	];
</script>

<Seo
	title="Compare QR code generators"
	description="A factual comparison of StoneQR with trial-based QR generators and QRCode Monkey: expiry, sign-up, vector export, error correction, and where your data goes."
/>

<article class="mx-auto max-w-7xl px-4 py-12 sm:px-6">
	<p class="ticket reveal">Comparison</p>
	<h1 class="reveal reveal-2 mt-3 max-w-3xl">What the free tier actually gives you.</h1>
	<p class="reveal reveal-3 mt-5 max-w-2xl text-lg text-ink-2">
		Three kinds of generator: sites that issue trial codes, the classic free static designer, and
		StoneQR. The differences that matter are whether the code can be switched off, what you have to
		hand over, and what file you get.
	</p>

	<div class="prose mt-10 max-w-none overflow-x-auto">
		<table>
			<thead>
				<tr>
					<th>Feature</th>
					<th>StoneQR</th>
					<th>Trial-code sites</th>
					<th>QRCode Monkey</th>
				</tr>
			</thead>
			<tbody>
				{#each rows as r (r.feature)}
					<tr>
						<td class="font-medium">{r.feature}</td>
						<td>{r.stoneqr}</td>
						<td>{r.trial}</td>
						<td>{r.monkey}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<div class="prose mt-10">
		<h2>Notes</h2>
		<ul>
			<li>"Trial-code sites" describes generators whose free codes are dynamic links on the vendor's domain that stop resolving when the trial ends. Their own pricing pages describe this behaviour.</li>
			<li>QRCode Monkey is a capable static designer. Its codes are rendered on its servers, and its upgrade path leads to a dynamic-code vendor. The comparison is about free static output.</li>
			<li>StoneQR has no paid tier and no dynamic codes. If you need an editable, tracked code, encode a short link from a service you trust as a plain URL.</li>
			<li>Found an error in this table? <a href="https://github.com/malignantz/stoneqr/issues" rel="noopener">Open an issue</a> and it will be corrected.</li>
		</ul>
	</div>
</article>
