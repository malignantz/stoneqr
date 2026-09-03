/**
 * Styled rendering behind a lazy import of @liquid-js/qr-code-styling (browser only).
 * The library re-encodes internally; we pass the same ECC and force the same version so
 * the module count matches the engine's sizing math, then read the real count back.
 */
import type { Ecc } from '@stoneqr/engine';

export type DotStyle = 'square' | 'rounded' | 'dots' | 'classy' | 'extra-rounded';
export type CornerSquareStyle = 'square' | 'extra-rounded' | 'dot' | 'classy';
export type CornerDotStyle = 'square' | 'dot' | 'classy';
export type GradientKind = 'none' | 'linear' | 'radial';

export interface StyleOptions {
	payload: string;
	ecc: Ecc;
	version: number;
	quietZone: number;
	fg: string;
	bg: string; // '#rrggbb' or 'transparent'
	dot: DotStyle;
	cornerSquare: CornerSquareStyle;
	cornerDot: CornerDotStyle;
	gradient: GradientKind;
	gradientTo: string;
	gradientAngleDeg: number;
	logo?: string; // data URL (raster), stays in the browser
	logoSize: number; // fraction of code width, 0..0.5 (library semantics)
	logoKnockout: boolean;
	logoMargin: number; // modules
	frame: { enabled: boolean; text: string; color: string; textColor: string };
}

export interface StyledResult {
	svg: string;
	/** Modules per side that the library actually produced. */
	size: number;
}

const DOT_MAP: Record<DotStyle, string> = {
	square: 'square',
	rounded: 'rounded',
	dots: 'dot',
	classy: 'classy',
	'extra-rounded': 'extra-rounded'
};

const ECC_MAP: Record<Ecc, string> = { L: 'L', M: 'M', Q: 'Q', H: 'H' };

let libPromise: Promise<typeof import('@liquid-js/qr-code-styling')> | undefined;
let borderPromise: Promise<typeof import('@liquid-js/qr-code-styling/border-plugin')> | undefined;

export function preloadStyled(): void {
	libPromise ??= import('@liquid-js/qr-code-styling');
}

/**
 * Render a styled SVG. The output keeps the library's pixel viewBox; we rewrite width/height to mm
 * so the file opens at physical size in Illustrator, Inkscape, and print RIPs.
 */
export async function renderStyled(opts: StyleOptions, widthMm: number): Promise<StyledResult> {
	libPromise ??= import('@liquid-js/qr-code-styling');
	const lib = await libPromise;
	const plugins: unknown[] = [];
	if (opts.frame.enabled) {
		borderPromise ??= import('@liquid-js/qr-code-styling/border-plugin');
		const { default: BorderPlugin } = await borderPromise;
		plugins.push(
			new BorderPlugin({
				proportional: true,
				size: 0.03,
				round: 0.05,
				color: opts.frame.color,
				margin: 0.02,
				text: {
					bottom: {
						content: opts.frame.text || 'Scan me',
						color: opts.frame.textColor,
						font: 'Helvetica, Arial, sans-serif',
						fontWeight: 'bold'
					}
				}
			})
		);
	}

	const gradient =
		opts.gradient === 'none'
			? undefined
			: {
					type: opts.gradient,
					rotation: (opts.gradientAngleDeg * Math.PI) / 180,
					colorStops: [
						{ offset: 0, color: opts.fg },
						{ offset: 1, color: opts.gradientTo }
					]
				};

	const qr = new lib.QRCodeStyling({
		data: opts.payload,
		shape: 'square',
		qrOptions: {
			typeNumber: opts.version as never,
			errorCorrectionLevel: ECC_MAP[opts.ecc] as never
		},
		dotsOptions: { type: DOT_MAP[opts.dot] as never, color: opts.fg, gradient: gradient as never },
		cornersSquareOptions: { type: opts.cornerSquare as never, color: opts.fg, gradient: gradient as never },
		cornersDotOptions: { type: opts.cornerDot as never, color: opts.fg, gradient: gradient as never },
		// The library's only quiet-zone control is backgroundOptions.margin, so a transparent
		// background keeps the margin and makes the fill invisible instead of disabling the block.
		backgroundOptions: { color: opts.bg === 'transparent' ? 'rgba(0,0,0,0)' : opts.bg, margin: opts.quietZone },
		image: opts.logo,
		imageOptions: {
			mode: 'center',
			imageSize: opts.logoSize,
			margin: opts.logoMargin,
			fill: { color: opts.logoKnockout ? (opts.bg === 'transparent' ? '#ffffff' : opts.bg) : 'rgba(0,0,0,0)' }
		},
		plugins: plugins as never
	});

	let svg = (await qr.serialize()) ?? '';
	if (!svg) throw new Error('Styled renderer produced no output');
	svg = setPhysicalSize(svg, widthMm);
	return { svg, size: countModules(svg, opts.version) };
}

function setPhysicalSize(svg: string, widthMm: number): string {
	// Ensure a viewBox exists, then set width/height in mm (keeping aspect from viewBox).
	const vb = svg.match(/viewBox="([^"]+)"/);
	const w = svg.match(/\swidth="([\d.]+)"/);
	const h = svg.match(/\sheight="([\d.]+)"/);
	let out = svg;
	if (!vb && w && h) {
		out = out.replace('<svg', `<svg viewBox="0 0 ${w[1]} ${h[1]}"`);
	}
	const parts = (out.match(/viewBox="([^"]+)"/)?.[1] ?? '0 0 1 1').split(/\s+/).map(Number);
	const ratio = (parts[3] ?? 1) / (parts[2] ?? 1);
	const mm = Number(widthMm.toFixed(3));
	const hmm = Number((widthMm * ratio).toFixed(3));
	out = out.replace(/\swidth="[^"]*"/, ` width="${mm}mm"`).replace(/\sheight="[^"]*"/, ` height="${hmm}mm"`);
	if (!/\swidth="/.test(out)) out = out.replace('<svg', `<svg width="${mm}mm" height="${hmm}mm"`);
	return out;
}

function countModules(_svg: string, version: number): number {
	// We force typeNumber, so the count is fixed by version. Kept as a function in case the
	// library ever ignores typeNumber; then parse the viewBox against dotsOptions.size.
	return 17 + 4 * version;
}
