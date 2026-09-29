<script lang="ts" module>
	/** Whether More has been opened this session, so a form rebuilt by a page change opens it again. */
	let moreOpened = false;
	/** The paste-and-go reader, fetched the first time something worth reading is typed and then kept for the page. */
	let detectLoad: Promise<typeof import('./detect')> | undefined;
</script>

<script lang="ts">
	import { untrack } from 'svelte';
	import { halftoneVersionFor } from '@stoneqr/engine';
	import { PAYLOAD_TYPES, payloads, type PayloadType } from '@stoneqr/engine/payloads';
	import Icon from '$lib/components/Icon.svelte';
	import RedirectNote from '$lib/components/RedirectNote.svelte';
	import SectionHeader from '$lib/components/SectionHeader.svelte';
	import { radioKeys } from '$lib/components/radiogroup';
	import type { IconName } from '$lib/icons';
	import { logoIconByName } from '$lib/logo-icons';
	import DesignMenu, { type Shared } from './DesignMenu.svelte';
	import { campaignCost, costWords, hasCampaign } from './campaign';
	import type { Detected } from './detect';
	import { defaultFields, type Design } from './state.svelte';

	let {
		design,
		pristine = true,
		onstartover,
		savedCount = 0,
		onsaved,
		advanced = false
	}: { design: Design; pristine?: boolean; onstartover?: () => void; savedCount?: number; onsaved?: () => void; advanced?: boolean } = $props();

	/**
	 * Six tiles to begin with, then the rest behind More. Every word fits its tile beside the icon,
	 * so nothing is abbreviated except "Calendar event" and "WhatsApp chat", whose full names stay on
	 * the tile's accessible name and title. "WhatsApp" itself is too wide for a tile in the 18rem
	 * column (it clips to "WHATSA…"), and the bubble-and-handset icon says what "Chat" means. A label
	 * that outgrows its tile is clipped by `.type-name`, so check new words in a 1100 px window
	 * (app.css, the type-tile block).
	 *
	 * The tile says "Link" but the field under it says "Web address", and the engine id stays `url`.
	 * Contact is the vCard tile and stays chosen for a MeCard design: the format is Advanced's.
	 */
	type Tile = { id: PayloadType; name: string; label: string; icon: IconName };
	const MAIN: Tile[] = [
		{ id: 'url', name: 'Link', label: 'Link', icon: 'url' },
		{ id: 'text', name: 'Text', label: 'Text', icon: 'text' },
		{ id: 'wifi', name: 'WiFi', label: 'WiFi', icon: 'wifi' },
		{ id: 'vcard', name: 'Contact', label: 'Contact', icon: 'vcard' },
		{ id: 'email', name: 'Email', label: 'Email', icon: 'email' }
	];
	const EXTRA: Tile[] = [
		{ id: 'sms', name: 'SMS', label: 'SMS', icon: 'sms' },
		{ id: 'tel', name: 'Phone', label: 'Phone', icon: 'tel' },
		{ id: 'geo', name: 'Location', label: 'Location', icon: 'geo' },
		{ id: 'event', name: 'Event', label: 'Calendar event', icon: 'event' },
		{ id: 'whatsapp', name: 'Chat', label: 'WhatsApp chat', icon: 'whatsapp' }
	];
	const contactTypes: PayloadType[] = ['vcard', 'mecard'];
	const isExtra = (t: PayloadType) => EXTRA.some((x) => x.id === t);

	const chosen = (t: Tile) => (t.id === 'vcard' ? contactTypes.includes(design.type) : design.type === t.id);
	function pick(t: Tile) {
		// Contact while a contact is already showing, in either format, changes nothing.
		if (t.id === 'vcard' && contactTypes.includes(design.type)) return;
		design.reset(t.id);
	}

	const description = $derived(
		contactTypes.includes(design.type) ? 'Save a contact.' : PAYLOAD_TYPES.find((t) => t.id === design.type)!.description
	);

	/**
	 * More opens rows of three under the first six. It starts open when the chosen type is one of
	 * them, and a type chosen from elsewhere (a landing page, a design opened from a file) opens it
	 * too. Closing it while one of them is chosen leaves that one tile showing, so the choice is
	 * never hidden and the group always has a tab stop.
	 */
	let moreOpen = $state(moreOpened || isExtra(untrack(() => design.type)));
	$effect(() => {
		if (isExtra(design.type)) {
			moreOpen = true;
			moreOpened = true;
		}
	});
	function toggleMore() {
		moreOpen = !moreOpen;
		moreOpened = moreOpen;
	}
	const extras = $derived(moreOpen ? EXTRA : EXTRA.filter((t) => t.id === design.type));
	const typeRows = $derived(2 + Math.ceil(extras.length / 3));

	// ---- Contact format (Advanced) -------------------------------------------------------------

	/** Switching format carries what was typed across; a job title has no home in MeCard, so it stays in the vCard record. */
	function setFormat(next: 'vcard' | 'mecard') {
		if (design.type === next) return;
		if (next === 'mecard') design.fields.mecard = { ...design.fields.vcard, title: '' };
		else design.fields.vcard = { ...design.fields.mecard, title: design.fields.vcard.title };
		design.type = next;
	}

	// ---- Paste and go --------------------------------------------------------------------------

	/** Only the Link and Text forms offer it: those are where a payload string gets pasted by mistake. */
	const pasted = $derived(
		design.shortUrl ? '' : design.type === 'url' ? design.fields.url.url : design.type === 'text' ? design.fields.text.text : ''
	);
	/**
	 * The reader is its own chunk (about 2.5 KB gzipped) because only someone who has typed
	 * something needs it, and a web address, which is nearly everything typed in Link, never does.
	 * A failed fetch (a stale chunk after a deploy) leaves no offer and no error: this is a convenience.
	 */
	let detect = $state<((text: string) => Detected | null) | null>(null);
	$effect(() => {
		const text = pasted.trim();
		if (detect || !text || /^https?:\/\//i.test(text)) return;
		(detectLoad ??= import('./detect')).then(
			(m) => (detect = m.detect),
			() => (detectLoad = undefined)
		);
	});
	/** Worked out from the text as it is now, so a result for text that has since changed cannot show. */
	const offer = $derived<Detected | null>(detect && pasted ? detect(pasted) : null);
	const MAKE: Record<Detected['type'], string> = {
		wifi: 'Make a WiFi code',
		vcard: 'Make a contact code',
		mecard: 'Make a contact code',
		email: 'Make an email code',
		sms: 'Make a text message code',
		tel: 'Make a phone code',
		geo: 'Make a location code',
		event: 'Make an event code',
		// Never offered, because a web address is not reinterpreted, but the map is exhaustive.
		whatsapp: 'Make a WhatsApp code'
	};
	function accept(d: Detected) {
		// Clear the box it came from first, so going back to Link or Text does not offer it again.
		if (design.type === 'url') design.fields.url.url = '';
		else if (design.type === 'text') design.fields.text.text = '';
		(design.fields as unknown as Record<string, object>)[d.type] = { ...defaultFields()[d.type], ...d.fields };
		design.reset(d.type);
	}

	// ---- Campaign tags (Advanced) --------------------------------------------------------------

	/** Open from the start when a tag is set, so a design that has some never hides them. */
	let campaignOpen = $state(untrack(() => hasCampaign(design.fields.url)));
	const campaignSummary = $derived(
		[design.fields.url.utmSource, design.fields.url.utmMedium, design.fields.url.utmCampaign].map((t) => t.trim()).filter(Boolean).join(' · ')
	);
	/** What the tags cost the code, worked out from the address as it is now. */
	const campaignNote = $derived.by(() => {
		const f = design.fields.url;
		if (design.type !== 'url' || design.shortUrl || !design.payload || !hasCampaign(f)) return '';
		try {
			const cost = campaignCost(payloads.url(f.url), design.payload, design.ecc, (p) => (design.halftoneActive ? halftoneVersionFor(p) : design.minVersion));
			return cost ? costWords(cost) : '';
		} catch {
			return '';
		}
	});

	// ---- Share notice --------------------------------------------------------------------------

	/**
	 * What the design menu reports after "Copy a link to this design". The clauses are fixed at the
	 * moment of copying, so the notice describes the link that is on the clipboard, not whatever
	 * the design has become in the eight seconds since.
	 */
	let shared = $state<(Shared & { wifi: boolean; pictures: boolean }) | null>(null);
	let sharedTimer: ReturnType<typeof setTimeout> | undefined;
	function onshared(r: Shared) {
		clearTimeout(sharedTimer);
		shared = {
			...r,
			wifi: design.type === 'wifi',
			// A built-in logo icon travels in the link by name; anything uploaded does not.
			pictures: !!design.halftoneImage || (!!design.logo && !logoIconByName(design.logoName))
		};
		if (r.copied) sharedTimer = setTimeout(() => (shared = null), 8000);
	}
	function dismissShared() {
		clearTimeout(sharedTimer);
		shared = null;
	}
	$effect(() => () => clearTimeout(sharedTimer));
</script>

{#snippet offerNotice()}
	{#if offer}
		<div class="notice notice-info" role="status">
			<span>That looks like {offer.label}.</span>
			<button type="button" class="btn btn-secondary btn-sm justify-self-start" onclick={() => accept(offer)}>{MAKE[offer.type]}</button>
		</div>
	{/if}
{/snippet}

<section class="grid gap-5" aria-labelledby="content-heading">
	<SectionHeader title="Content" id="content-heading">
		{#snippet badge()}
			<span class="flex items-center gap-3">
				{#if design.shortUrl}
					<button type="button" class="text-sm underline" onclick={() => (design.shortUrl = null)}>Clear dynamic link</button>
				{/if}
				<DesignMenu {design} {pristine} {savedCount} {onsaved} {onstartover} {onshared} />
			</span>
		{/snippet}
	</SectionHeader>

	{#if shared}
		<div class="notice notice-info" role="status">
			<div class="flex items-start justify-between gap-3">
				<p>
					{#if !shared.link}
						Could not make a link for this design.
					{:else}
						{shared.copied ? 'Link copied.' : 'Copy the link below.'} It carries these settings and everything typed here{shared.wifi ? ', the WiFi password too' : ''}.{#if shared.pictures}{' '}Pictures are not included.{/if}
						It is not sent to StoneQR.
					{/if}
				</p>
				<button type="button" class="-m-1 shrink-0 p-1 text-ink-3 hover:text-ink" aria-label="Dismiss" onclick={dismissShared}>
					<Icon name="close" size={14} />
				</button>
			</div>
			{#if shared.link && !shared.copied}
				<input class="input num text-xs" type="text" readonly aria-label="Share link" value={shared.link} onfocus={(e) => e.currentTarget.select()} />
			{/if}
		</div>
	{/if}

	<div class="field">
		<div class="type-grid">
			<div class="type-radios" role="radiogroup" aria-label="Content type" style="--type-rows: {typeRows}" use:radioKeys>
				{#each [...MAIN, ...extras] as t, i (t.id)}
					<button
						type="button"
						role="radio"
						id="type-{t.id}"
						aria-checked={chosen(t)}
						tabindex={chosen(t) ? 0 : -1}
						aria-label={t.label}
						title={t.label}
						class="type-tile {i === MAIN.length ? 'type-extra-first' : ''}"
						data-on={chosen(t)}
						onclick={() => pick(t)}
					>
						<Icon name={t.icon} size={16} />
						<span class="type-name">{t.name}</span>
					</button>
				{/each}
			</div>
			<!-- A disclosure, not a choice, so it sits beside the radiogroup rather than in it; CSS sets it in the sixth cell. -->
			<button
				type="button"
				class="type-tile type-tile-more"
				aria-expanded={moreOpen}
				aria-controls={EXTRA.map((t) => `type-${t.id}`).join(' ')}
				onclick={toggleMore}
			>
				<Icon name="chevron" size={16} />
				<span class="type-name">More</span>
			</button>
		</div>
		<p class="hint">{description}</p>
	</div>

	{#if design.shortUrl}
		<div class="notice notice-info">
			This code is editable and tracked in your SignUpCity account. It encodes
			<span class="num break-all">{design.shortUrl}</span>.
		</div>
	{:else if design.type === 'url'}
		<div class="field">
			<label for="f-url">Web address</label>
			<input id="f-url" class="input" type="url" inputmode="url" autocomplete="url" placeholder="https://example.com/menu" bind:value={design.fields.url.url} />
			<p class="hint">Shorter addresses make smaller, easier-to-scan codes.</p>
			<RedirectNote url={design.fields.url.url} />
		</div>
		{#if advanced}
			<div class="grid gap-3">
				<SectionHeader title="Campaign tags" level={3} collapsible bind:open={campaignOpen} summary={campaignSummary} controls="campaign-tags" />
				{#if campaignOpen}
					<div id="campaign-tags" class="grid gap-3">
						<p class="hint">
							Words added to the end of the address so the site it opens can tell which poster or flyer a visit came from. StoneQR does not see them or count anything.
						</p>
						<div class="grid grid-cols-3 gap-3">
							<div class="field"><label for="f-utm-source">Source</label><input id="f-utm-source" class="input" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="poster" bind:value={design.fields.url.utmSource} /></div>
							<div class="field"><label for="f-utm-medium">Medium</label><input id="f-utm-medium" class="input" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="print" bind:value={design.fields.url.utmMedium} /></div>
							<div class="field"><label for="f-utm-campaign">Campaign</label><input id="f-utm-campaign" class="input" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="spring-sale" bind:value={design.fields.url.utmCampaign} /></div>
						</div>
						{#if campaignNote}<p class="hint num">{campaignNote}</p>{/if}
					</div>
				{/if}
			</div>
		{/if}
		{@render offerNotice()}
	{:else if design.type === 'text'}
		<div class="field">
			<label for="f-text">Text</label>
			<textarea id="f-text" class="textarea" rows="4" placeholder="Anything a phone should display" bind:value={design.fields.text.text}></textarea>
		</div>
		{@render offerNotice()}
	{:else if design.type === 'wifi'}
		<div class="field">
			<label for="f-ssid">Network name (SSID)</label>
			<input id="f-ssid" class="input" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" bind:value={design.fields.wifi.ssid} />
		</div>
		<div class="field">
			<span class="label">Security</span>
			<div class="seg" role="group" aria-label="Security">
				<button type="button" aria-pressed={design.fields.wifi.auth === 'WPA'} onclick={() => (design.fields.wifi.auth = 'WPA')}>WPA / WPA2 / WPA3</button>
				<button type="button" aria-pressed={design.fields.wifi.auth === 'WEP'} onclick={() => (design.fields.wifi.auth = 'WEP')}>WEP</button>
				<button type="button" aria-pressed={design.fields.wifi.auth === 'nopass'} onclick={() => (design.fields.wifi.auth = 'nopass')}>Open</button>
			</div>
		</div>
		{#if design.fields.wifi.auth !== 'nopass'}
			<div class="field">
				<label for="f-pass">Password</label>
				<input id="f-pass" class="input mono" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" bind:value={design.fields.wifi.password} />
				<p class="hint">Stays in your browser. Shown in plain text so you can check it.</p>
			</div>
		{/if}
		<label class="flex items-center gap-2 text-sm">
			<input type="checkbox" bind:checked={design.fields.wifi.hidden} />
			Hidden network
		</label>
	{:else if contactTypes.includes(design.type)}
		{@const c = design.type === 'vcard' ? design.fields.vcard : design.fields.mecard}
		{#if advanced}
			<div class="field">
				<span class="label">Format</span>
				<div class="seg" role="group" aria-label="Contact format">
					<button type="button" aria-pressed={design.type === 'vcard'} onclick={() => setFormat('vcard')}>vCard · more fields</button>
					<button type="button" aria-pressed={design.type === 'mecard'} onclick={() => setFormat('mecard')}>MeCard · smaller code</button>
				</div>
			</div>
		{/if}
		<div class="grid grid-cols-2 gap-3">
			<div class="field"><label for="f-first">First name</label><input id="f-first" class="input" autocomplete="given-name" bind:value={c.firstName} /></div>
			<div class="field"><label for="f-last">Last name</label><input id="f-last" class="input" autocomplete="family-name" bind:value={c.lastName} /></div>
		</div>
		<div class="grid grid-cols-2 gap-3">
			<div class="field"><label for="f-org">Organisation</label><input id="f-org" class="input" autocomplete="organization" bind:value={c.org} /></div>
			{#if design.type === 'vcard'}
				<div class="field"><label for="f-title">Job title</label><input id="f-title" class="input" autocomplete="organization-title" bind:value={c.title} /></div>
			{/if}
		</div>
		<div class="grid grid-cols-2 gap-3">
			<div class="field"><label for="f-mobile">Mobile</label><input id="f-mobile" class="input num" type="tel" autocomplete="tel" bind:value={c.mobile} /></div>
			<div class="field"><label for="f-work">Work phone</label><input id="f-work" class="input num" type="tel" bind:value={c.work} /></div>
		</div>
		<div class="field"><label for="f-email">Email</label><input id="f-email" class="input" type="email" autocomplete="email" bind:value={c.email} /></div>
		<div class="field"><label for="f-curl">Website</label><input id="f-curl" class="input" type="url" bind:value={c.url} /></div>
		<details class="group">
			<summary class="ticket cursor-pointer select-none">Address and note</summary>
			<div class="mt-3 grid gap-3">
				<div class="field"><label for="f-street">Street</label><input id="f-street" class="input" autocomplete="street-address" bind:value={c.street} /></div>
				<div class="grid grid-cols-2 gap-3">
					<div class="field"><label for="f-city">City</label><input id="f-city" class="input" bind:value={c.city} /></div>
					<div class="field"><label for="f-region">State / region</label><input id="f-region" class="input" bind:value={c.region} /></div>
				</div>
				<div class="grid grid-cols-2 gap-3">
					<div class="field"><label for="f-postal">Postal code</label><input id="f-postal" class="input" autocomplete="postal-code" bind:value={c.postal} /></div>
					<div class="field"><label for="f-country">Country</label><input id="f-country" class="input" autocomplete="country-name" bind:value={c.country} /></div>
				</div>
				<div class="field"><label for="f-note">Note</label><input id="f-note" class="input" bind:value={c.note} /></div>
			</div>
		</details>
		<p class="hint">
			{design.type === 'vcard'
				? 'vCard 3.0, the format phones read most reliably. No photo: it would make the code enormous.'
				: 'MeCard is about a third smaller than vCard and holds fewer fields.'}
		</p>
	{:else if design.type === 'email'}
		<div class="field"><label for="f-to">To</label><input id="f-to" class="input" type="email" autocomplete="off" placeholder="rsvp@example.com" bind:value={design.fields.email.to} /></div>
		<div class="field"><label for="f-subject">Subject</label><input id="f-subject" class="input" bind:value={design.fields.email.subject} /></div>
		<div class="field"><label for="f-body">Body</label><textarea id="f-body" class="textarea" rows="3" bind:value={design.fields.email.body}></textarea></div>
		{#if advanced}
			<div class="grid grid-cols-2 gap-3">
				<div class="field"><label for="f-cc">Cc</label><input id="f-cc" class="input" type="email" multiple autocomplete="off" placeholder="team@example.com" bind:value={design.fields.email.cc} /></div>
				<div class="field"><label for="f-bcc">Bcc</label><input id="f-bcc" class="input" type="email" multiple autocomplete="off" bind:value={design.fields.email.bcc} /></div>
			</div>
			<p class="hint">Separate several addresses with commas. Anyone who scans the code sees the Cc and Bcc addresses, so a Bcc is not private.</p>
		{/if}
	{:else if design.type === 'sms'}
		<div class="field"><label for="f-smsto">Phone number</label><input id="f-smsto" class="input num" type="tel" placeholder="+1 555 555 0100" bind:value={design.fields.sms.to} /></div>
		<div class="field"><label for="f-smsbody">Message</label><textarea id="f-smsbody" class="textarea" rows="3" bind:value={design.fields.sms.body}></textarea></div>
		<div class="field">
			<span class="label">Format</span>
			<div class="seg" role="group" aria-label="SMS format">
				<button type="button" aria-pressed={design.fields.sms.scheme === 'sms'} onclick={() => (design.fields.sms.scheme = 'sms')}>sms: (iPhone, most Android)</button>
				<button type="button" aria-pressed={design.fields.sms.scheme === 'smsto'} onclick={() => (design.fields.sms.scheme = 'smsto')}>SMSTO: (older readers)</button>
			</div>
		</div>
	{:else if design.type === 'tel'}
		<div class="field">
			<label for="f-tel">Phone number</label>
			<input id="f-tel" class="input num" type="tel" placeholder="+1 555 555 0100" bind:value={design.fields.tel.number} />
			<p class="hint">Include the country code so it dials from abroad.</p>
		</div>
	{:else if design.type === 'geo'}
		<div class="grid grid-cols-2 gap-3">
			<div class="field"><label for="f-lat">Latitude</label><input id="f-lat" class="input num" inputmode="decimal" placeholder="39.7392" bind:value={design.fields.geo.lat} /></div>
			<div class="field"><label for="f-lng">Longitude</label><input id="f-lng" class="input num" inputmode="decimal" placeholder="-104.9903" bind:value={design.fields.geo.lng} /></div>
		</div>
		<div class="field"><label for="f-q">Label (optional)</label><input id="f-q" class="input" placeholder="Main entrance" bind:value={design.fields.geo.query} /></div>
	{:else if design.type === 'event'}
		<div class="field"><label for="f-summary">Title</label><input id="f-summary" class="input" bind:value={design.fields.event.summary} /></div>
		<label class="flex items-center gap-2 text-sm">
			<input type="checkbox" bind:checked={design.fields.event.allDay} />
			All day
		</label>
		<div class="grid grid-cols-2 gap-3">
			<div class="field">
				<label for="f-start">Starts</label>
				{#if design.fields.event.allDay}
					<input id="f-start" class="input num" type="date" value={design.fields.event.start.slice(0, 10)} oninput={(e) => (design.fields.event.start = e.currentTarget.value)} />
				{:else}
					<input id="f-start" class="input num" type="datetime-local" bind:value={design.fields.event.start} />
				{/if}
			</div>
			<div class="field">
				<label for="f-end">Ends</label>
				{#if design.fields.event.allDay}
					<input id="f-end" class="input num" type="date" value={design.fields.event.end.slice(0, 10)} oninput={(e) => (design.fields.event.end = e.currentTarget.value)} />
				{:else}
					<input id="f-end" class="input num" type="datetime-local" bind:value={design.fields.event.end} />
				{/if}
			</div>
		</div>
		<div class="field"><label for="f-loc">Location</label><input id="f-loc" class="input" bind:value={design.fields.event.location} /></div>
		<div class="field"><label for="f-desc">Description</label><textarea id="f-desc" class="textarea" rows="2" bind:value={design.fields.event.description}></textarea></div>
		<p class="hint">Times are converted to UTC inside the code, so they show correctly in any time zone.</p>
	{:else if design.type === 'whatsapp'}
		<div class="field">
			<label for="f-wa">Phone number (with country code)</label>
			<input id="f-wa" class="input num" type="tel" inputmode="tel" autocomplete="off" placeholder="+44 7700 900123" bind:value={design.fields.whatsapp.number} />
			<p class="hint">Scanning opens a chat with this number in WhatsApp on the phone.</p>
		</div>
		<div class="field">
			<label for="f-watext">Message (optional)</label>
			<textarea id="f-watext" class="textarea" rows="3" placeholder="Hi, I would like to book a table" bind:value={design.fields.whatsapp.text}></textarea>
			<p class="hint">Ready to send in the chat. The person scanning can change it first.</p>
		</div>
	{/if}

	{#if design.payloadError}
		<p class="notice notice-block" role="alert">{design.payloadError}</p>
	{/if}
</section>
