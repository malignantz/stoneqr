<script lang="ts">
	/**
	 * The picture inside a style swatch: a patch of data modules, or a finder pattern with one of
	 * its two parts drawn in the style being chosen and the other left plain, so the tile shows
	 * exactly the piece the control changes.
	 */
	import { cornerDotPath, cornerFramePath, modulePatchPath } from '$lib/shape-art';
	import type { CornerDotStyle, CornerSquareStyle, DotStyle } from '$lib/styled';

	/**
	 * Held as one object rather than destructured: TypeScript narrows a discriminated union
	 * through `props.kind`, but loses the link the moment `kind` and `style` become separate
	 * variables, which would make every style id assignable to every drawing function.
	 */
	let props: { kind: 'modules'; style: DotStyle } | { kind: 'frame'; style: CornerSquareStyle } | { kind: 'dot'; style: CornerDotStyle } =
		$props();
</script>

{#if props.kind === 'modules'}
	<svg viewBox="-0.25 -0.25 4.5 4.5" fill="currentColor" aria-hidden="true">
		<path d={modulePatchPath(props.style)} />
	</svg>
{:else}
	<svg viewBox="-0.3 -0.3 7.6 7.6" aria-hidden="true">
		<path
			d={cornerFramePath(props.kind === 'frame' ? props.style : 'square')}
			fill="none"
			stroke="currentColor"
			stroke-width="1"
			opacity={props.kind === 'frame' ? 1 : 0.3}
		/>
		<path
			d={cornerDotPath(props.kind === 'dot' ? props.style : 'square')}
			fill="currentColor"
			opacity={props.kind === 'dot' ? 1 : 0.3}
		/>
	</svg>
{/if}
