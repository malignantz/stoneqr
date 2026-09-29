<script lang="ts">
	/**
	 * The picture inside a style swatch: a patch of data modules, or a finder pattern with one of
	 * its two parts drawn in the style being chosen and the other left plain, so the tile shows
	 * exactly the piece the control changes.
	 */
	import { TEMPLATE_ART, cornerDotPath, cornerFramePath, modulePatchPath } from '$lib/shape-art';
	import { LOOKS, type LookId } from '$lib/looks';
	import type { Template } from '$lib/templates';
	import type { CornerDotStyle, CornerSquareStyle, DotStyle } from '$lib/styled';

	/**
	 * Held as one object rather than destructured: TypeScript narrows a discriminated union
	 * through `props.kind`, but loses the link the moment `kind` and `style` become separate
	 * variables, which would make every style id assignable to every drawing function.
	 */
	let props:
		| { kind: 'modules'; style: DotStyle }
		| { kind: 'frame'; style: CornerSquareStyle }
		| { kind: 'dot'; style: CornerDotStyle }
		| { kind: 'look'; style: LookId }
		| { kind: 'template'; template: Template } = $props();

	/** A look tile is the corner of a code: the finder pattern with a patch of data beside it. */
	const look = $derived(props.kind === 'look' ? LOOKS.find((l) => l.id === props.style) : undefined);
	/** A template tile is that same corner on a piece of paper, in the template's own colours, framed if it has a frame. */
	const tpl = $derived(props.kind === 'template' ? props.template : undefined);
	const tplLook = $derived(tpl ? LOOKS.find((l) => l.id === tpl.look) : undefined);
</script>

{#if tpl && tplLook}
	{@const art = tpl.frameEnabled ? TEMPLATE_ART.framed : TEMPLATE_ART.plain}
	{@const ink = tpl.cornerColor ?? tpl.fg}
	<svg viewBox="0 0 16 16" aria-hidden="true">
		{#if tpl.frameEnabled}
			{@const f = TEMPLATE_ART.framed}
			<rect x={f.outer.x} y={f.outer.y} width={f.outer.w} height={f.outer.h} rx={f.outer.r} fill={tpl.frameColor} />
			<rect x={f.paper.x} y={f.paper.y} width={f.paper.w} height={f.paper.h} fill={tpl.bg} />
			<rect x={f.bar.x} y={f.bar.y} width={f.bar.w} height={f.bar.h} rx={f.bar.r} fill={tpl.frameTextColor} />
		{:else}
			{@const p = TEMPLATE_ART.plain.paper}
			<!-- A hairline, because pale paper on a limestone tile would otherwise have no edge. -->
			<rect x={p.x} y={p.y} width={p.w} height={p.h} rx={p.r} fill={tpl.bg} stroke="rgb(0 0 0 / 0.22)" stroke-width="0.35" />
		{/if}
		<g transform="translate({art.content.x} {art.content.y}) scale({art.content.scale})">
			<path d={cornerFramePath(tplLook.cornerSquare)} fill="none" stroke={ink} stroke-width="1" />
			<path d={cornerDotPath(tplLook.cornerDot)} fill={ink} />
			<path d={modulePatchPath(tplLook.dot)} fill={tpl.fg} transform="translate(7.6 7.6)" />
			<path d={modulePatchPath(tplLook.dot)} fill={tpl.fg} transform="translate(7.6 0) scale(1 0.9)" opacity="0.55" />
		</g>
	</svg>
{:else if look}
	<svg viewBox="-0.3 -0.3 12.3 12.3" aria-hidden="true">
		<path d={cornerFramePath(look.cornerSquare)} fill="none" stroke="currentColor" stroke-width="1" />
		<path d={cornerDotPath(look.cornerDot)} fill="currentColor" />
		<path d={modulePatchPath(look.dot)} fill="currentColor" transform="translate(7.6 7.6)" />
		<path d={modulePatchPath(look.dot)} fill="currentColor" transform="translate(7.6 0) scale(1 0.9)" opacity="0.55" />
	</svg>
{:else if props.kind === 'modules'}
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
