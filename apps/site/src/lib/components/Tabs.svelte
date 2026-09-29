<script lang="ts" generics="T extends string">
	/**
	 * A row of tabs over panels that all stay mounted; the parent owns the panels and hides the
	 * ones that are not showing. Dumb on purpose: it draws the list, keeps `value`, and wires the
	 * ARIA ends that it owns.
	 *
	 * The parent's panels carry `id="{idBase}-tab-{id}"` (what a tab's aria-controls points at) and
	 * `aria-labelledby="{idBase}-tabbutton-{id}"` (the tab's own id). Both are derived here from
	 * `idBase`, so the two sides agree by construction rather than by copying strings.
	 *
	 * Two states ride on a tab without changing whether it can be chosen:
	 *  - `on`: something is set inside, shown as a small accent dot, so a hidden panel never hides
	 *    a setting that is in force.
	 *  - `off`: the group is switched off by something else (Artistic QR replaces Style and Logo),
	 *    shown as struck-through text. It stays selectable, because its controls still hold values
	 *    that come back when the picture goes.
	 * Both are also put into words for a screen reader, which cannot see a dot or a strikethrough.
	 */
	import { tabKeys } from './tabs';

	type Tab = { id: T; label: string; on?: boolean; off?: boolean };

	let {
		tabs,
		value = $bindable(),
		ariaLabel,
		idBase = 'design',
		offNote = 'off while Artistic QR is on',
		onselect
	}: {
		tabs: Tab[];
		value: T;
		ariaLabel: string;
		idBase?: string;
		/** Spoken after the label of an `off` tab. */
		offNote?: string;
		/** Called when a tab is chosen by mouse or key, not when `value` is set from outside. */
		onselect?: (id: T) => void;
	} = $props();

	function choose(id: T) {
		value = id;
		onselect?.(id);
	}
</script>

<div class="tabs" role="tablist" aria-label={ariaLabel} use:tabKeys>
	{#each tabs as tab (tab.id)}
		<button
			type="button"
			role="tab"
			id="{idBase}-tabbutton-{tab.id}"
			class="tab"
			class:tab-off={tab.off}
			aria-selected={value === tab.id}
			aria-controls="{idBase}-tab-{tab.id}"
			tabindex={value === tab.id ? 0 : -1}
			onclick={() => choose(tab.id)}
		>
			<span class="tab-label">{tab.label}</span>
			{#if tab.on}<span class="tab-dot" aria-hidden="true"></span>{/if}
			{#if tab.on || tab.off}
				<span class="sr-only">{tab.on ? ', has settings' : ''}{tab.off ? `, ${offNote}` : ''}</span>
			{/if}
		</button>
	{/each}
</div>
