/**
 * What a fresh design carries, read once. Share links leave these values out, and "Start over"
 * puts them back. Built lazily and only in the browser: constructing a Design runs its runes.
 */
import { Design, defaultFields } from './state.svelte';
import { snapshot, type Saved } from './persist';

let cache: Saved | undefined;

export function defaults(): Saved {
	cache ??= snapshot(new Design());
	// The event fields default to the next whole hour, so they are read fresh each time.
	return { ...cache, fields: defaultFields() };
}
