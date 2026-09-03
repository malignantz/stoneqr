/** Error-correction level. L≈7%, M≈15%, Q≈25%, H≈30% recoverable damage. */
export type Ecc = 'L' | 'M' | 'Q' | 'H';

/** What a module is used for. Function patterns must never be covered by logos or halftone images. */
export type ModuleType = 'data' | 'finder' | 'timing' | 'alignment' | 'format';

export interface EncodeOptions {
	/** Default 'M'. */
	ecc?: Ecc;
	/** 1..40, default 1. */
	minVersion?: number;
	/** 1..40, default 40. */
	maxVersion?: number;
	/** 0..7, or 'auto' (default). */
	mask?: number | 'auto';
}

export interface EncodedQr {
	/** Row-major, `matrix[y][x]`, `true` = dark. No quiet zone. */
	matrix: boolean[][];
	/** Modules per side (17 + 4 * version). */
	size: number;
	/** 1..40 */
	version: number;
	ecc: Ecc;
	/** Mask pattern actually used, 0..7. */
	mask: number;
	/** `true` where the module belongs to a function pattern (finder, separator, timing, alignment, format/version info, dark module). */
	functionMask: boolean[][];
	/** Per-module classification. */
	moduleTypes: ModuleType[][];
	/** Number of data modules (the ones a halftone image may show through). */
	dataModuleCount: number;
}

/** A severity-tagged, plain-language message for the UI. */
export interface Warning {
	level: 'info' | 'warn' | 'block';
	code: string;
	message: string;
}

/** A raw RGB or RGBA raster, the shape the decoder accepts. */
export interface RasterImage {
	width: number;
	height: number;
	data: Uint8Array | Uint8ClampedArray;
}
