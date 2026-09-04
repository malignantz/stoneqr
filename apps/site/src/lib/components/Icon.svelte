<script lang="ts">
	import { ICONS, type IconName } from '$lib/icons';

	let {
		name,
		size = 16,
		width = 1.4,
		class: klass = ''
	}: { name: IconName; size?: number; width?: number; class?: string } = $props();
</script>

<svg
	{width}
	height={size}
	viewBox="0 0 16 16"
	fill="none"
	stroke="currentColor"
	stroke-width={width}
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
	class="shrink-0 {klass}"
	style="width: {size}px; height: {size}px"
>
	{@html ICONS[name]}
</svg>
