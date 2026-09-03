/**
 * Location payload: `geo:37.786971,-122.399677` (RFC 5870), with an optional
 * `?q=` label that Android's Maps honours and iOS ignores.
 * Six decimals is about 11 cm, well past what any pin needs, and keeps the code small.
 * https://github.com/zxing/zxing/wiki/Barcode-Contents
 */
import { PayloadError } from './errors.js';

export interface GeoFields {
	lat: number;
	lng: number;
	/** Optional place label. */
	query?: string;
}

function coord(n: number, name: string, limit: number): string {
	if (typeof n !== 'number' || !Number.isFinite(n)) throw new PayloadError(`Enter a number for the ${name}.`, name);
	if (n < -limit || n > limit)
		throw new PayloadError(`The ${name} must be between -${limit} and ${limit}; got ${n}.`, name);
	return Number(n.toFixed(6)).toString();
}

export function geo(fields: GeoFields): string {
	const lat = coord(fields.lat, 'latitude', 90);
	const lng = coord(fields.lng, 'longitude', 180);
	const q = (fields.query ?? '').trim();
	return `geo:${lat},${lng}` + (q ? `?q=${encodeURIComponent(q)}` : '');
}
