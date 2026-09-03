import { encode as uqrEncode, QrCodeDataType } from 'uqr';
import type { Ecc, EncodeOptions, EncodedQr, ModuleType } from './types.js';

export class EncodeError extends Error {
	constructor(message: string, public readonly cause?: unknown) {
		super(message);
		this.name = 'EncodeError';
	}
}

/**
 * Encode a payload string (UTF-8) into a QR matrix.
 * Wraps `uqr` (a port of Nayuki's reference encoder) and exposes the function-pattern mask.
 * Throws `EncodeError` when the payload does not fit in the allowed version range.
 */
export function encode(payload: string, opts: EncodeOptions = {}): EncodedQr {
	const ecc: Ecc = opts.ecc ?? 'M';
	const minVersion = clampVersion(opts.minVersion ?? 1);
	const maxVersion = clampVersion(opts.maxVersion ?? 40);
	if (minVersion > maxVersion) throw new EncodeError('minVersion is greater than maxVersion');
	const mask = opts.mask === undefined || opts.mask === 'auto' ? -1 : opts.mask;
	if (mask !== -1 && (mask < 0 || mask > 7 || !Number.isInteger(mask)))
		throw new EncodeError('mask must be 0..7 or "auto"');

	let res;
	try {
		res = uqrEncode(payload, {
			ecc,
			minVersion,
			maxVersion,
			maskPattern: mask,
			boostEcc: false,
			border: 0
		});
	} catch (e) {
		throw new EncodeError(
			'Content is too long for a QR code at this error-correction level. Shorten it or lower the error correction.',
			e
		);
	}

	const size = res.size;
	const matrix: boolean[][] = [];
	const functionMask: boolean[][] = [];
	const moduleTypes: ModuleType[][] = [];
	let dataModuleCount = 0;
	for (let y = 0; y < size; y++) {
		const dataRow = res.data[y]!;
		const typeRow = res.types[y]!;
		const mrow: boolean[] = new Array(size);
		const frow: boolean[] = new Array(size);
		const trow: ModuleType[] = new Array(size);
		for (let x = 0; x < size; x++) {
			mrow[x] = !!dataRow[x];
			const t = mapType(typeRow[x]!);
			trow[x] = t;
			frow[x] = t !== 'data';
			if (t === 'data') dataModuleCount++;
		}
		matrix.push(mrow);
		functionMask.push(frow);
		moduleTypes.push(trow);
	}

	return {
		matrix,
		size,
		version: res.version,
		ecc,
		mask: res.maskPattern,
		functionMask,
		moduleTypes,
		dataModuleCount
	};
}

function mapType(t: QrCodeDataType): ModuleType {
	switch (t) {
		case QrCodeDataType.Position:
			return 'finder';
		case QrCodeDataType.Timing:
			return 'timing';
		case QrCodeDataType.Alignment:
			return 'alignment';
		case QrCodeDataType.Function:
			return 'format';
		default:
			return 'data';
	}
}

function clampVersion(v: number): number {
	if (!Number.isInteger(v) || v < 1 || v > 40) throw new EncodeError('version must be an integer 1..40');
	return v;
}

/** Modules per side for a version. */
export function sizeForVersion(version: number): number {
	return 17 + 4 * version;
}

/**
 * Smallest version that fits the payload at the given ECC, or `null` if it never fits.
 * Cheap enough to call live in the UI to show "raising ECC to H needs version N".
 */
export function minimumVersion(payload: string, ecc: Ecc): number | null {
	try {
		return encode(payload, { ecc }).version;
	} catch {
		return null;
	}
}
