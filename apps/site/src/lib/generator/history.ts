/**
 * Undo and redo for the working design.
 *
 * `History` is a plain list with a cursor and knows nothing about Svelte or about designs, so it
 * is tested in Node. What Generator keeps in it is a `DesignEntry`: the persisted record plus the
 * two pictures held by reference, so a hundred entries cost one copy of each picture, not a hundred.
 *
 * A push that equals the entry under the cursor is folded into it and changes nothing, redo
 * included. That is what lets applying an entry (which changes the design, which schedules a push)
 * leave the redo stack alone without any bookkeeping about who caused the change.
 */
import type { Saved } from './persist';

export class History<T> {
	private entries: T[] = [];
	/** Index of the entry the design is at; -1 while empty. */
	private at = -1;

	constructor(
		private readonly cap = 100,
		private readonly equals: (a: T, b: T) => boolean = (a, b) => JSON.stringify(a) === JSON.stringify(b)
	) {}

	/** True when the entry was added; false when it equalled the current one and was folded into it. */
	push(entry: T): boolean {
		if (this.at >= 0 && this.equals(this.entries[this.at], entry)) return false;
		this.entries.length = this.at + 1;
		this.entries.push(entry);
		this.at++;
		if (this.entries.length > this.cap) {
			this.entries.shift();
			this.at--;
		}
		return true;
	}

	/** The previous entry, or null at the start. */
	undo(): T | null {
		return this.canUndo ? this.entries[--this.at] : null;
	}

	/** The next entry, or null at the end. */
	redo(): T | null {
		return this.canRedo ? this.entries[++this.at] : null;
	}

	get canUndo(): boolean {
		return this.at > 0;
	}

	get canRedo(): boolean {
		return this.at >= 0 && this.at < this.entries.length - 1;
	}

	get size(): number {
		return this.entries.length;
	}
}

/** What one step of history holds. The picture names ride inside `saved` (`logoName`, `halftoneImageName`). */
export type DesignEntry = { saved: Saved; logo?: string; halftoneImage?: string };

/** Pictures compare by reference (they are strings that never change in place); the record by JSON, which is small. */
export function sameEntry(a: DesignEntry, b: DesignEntry): boolean {
	return a.logo === b.logo && a.halftoneImage === b.halftoneImage && JSON.stringify(a.saved) === JSON.stringify(b.saved);
}

/** Whether to show ⌘Z rather than Ctrl+Z. `platform` is `navigator.userAgentData?.platform ?? navigator.platform`. */
export function isApplePlatform(platform: string): boolean {
	return /mac|iphone|ipad|ipod/i.test(platform);
}

/** The labels the menu and the notice show. */
export function shortcuts(apple: boolean) {
	return apple
		? { undo: '⌘Z', redo: '⇧⌘Z', save: '⌘S' }
		: { undo: 'Ctrl+Z', redo: 'Ctrl+Y', save: 'Ctrl+S' };
}

export type Keystroke = { key: string; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean };

/**
 * What a key press asks of the history, or null. Shift+Z redoes on either platform; Ctrl+Y also
 * does (the Windows habit), but Cmd+Y is left alone because browsers use it for their history.
 * Alt anywhere means something else and is left alone.
 */
export function keyAction(e: Keystroke): 'undo' | 'redo' | 'save' | null {
	if (e.altKey) return null;
	const k = e.key.toLowerCase();
	const mod = e.metaKey || e.ctrlKey;
	if (mod && k === 'z') return e.shiftKey ? 'redo' : 'undo';
	if (e.ctrlKey && !e.metaKey && !e.shiftKey && k === 'y') return 'redo';
	if (mod && !e.shiftKey && k === 's') return 'save';
	return null;
}

/** Input types with no text of their own to undo, so the design's undo may take the key. */
const NON_TEXT = new Set(['range', 'checkbox', 'radio', 'button', 'submit', 'reset', 'color', 'file', 'image']);

/** True when the browser's own undo has a claim on the key: a text field, a select, or editable content. */
export function ownsUndo(el: Element | null): boolean {
	if (!el) return false;
	const tag = el.tagName;
	if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
	if (tag === 'INPUT') return !NON_TEXT.has((el as HTMLInputElement).type);
	return (el as HTMLElement).isContentEditable === true;
}
