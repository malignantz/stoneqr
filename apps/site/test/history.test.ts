import { describe, expect, it } from 'vitest';
import { History, sameEntry, keyAction, isApplePlatform, shortcuts, ownsUndo, type DesignEntry } from '$lib/generator/history';

describe('History', () => {
	it('starts empty: nothing to undo or redo', () => {
		const h = new History<number>();
		expect(h.canUndo).toBe(false);
		expect(h.canRedo).toBe(false);
		expect(h.undo()).toBeNull();
		expect(h.redo()).toBeNull();
	});

	it('one entry is the starting point: it cannot be undone past', () => {
		const h = new History<number>();
		h.push(1);
		expect(h.canUndo).toBe(false);
		expect(h.undo()).toBeNull();
	});

	it('steps back and forward in the order the entries were pushed', () => {
		const h = new History<string>();
		['a', 'b', 'c'].forEach((e) => h.push(e));
		expect(h.undo()).toBe('b');
		expect(h.undo()).toBe('a');
		expect(h.undo()).toBeNull();
		expect(h.redo()).toBe('b');
		expect(h.redo()).toBe('c');
		expect(h.redo()).toBeNull();
		expect(h.canRedo).toBe(false);
		expect(h.canUndo).toBe(true);
	});

	it('a new push after an undo drops what could have been redone', () => {
		const h = new History<string>();
		['a', 'b', 'c'].forEach((e) => h.push(e));
		h.undo();
		h.undo();
		expect(h.canRedo).toBe(true);
		expect(h.push('x')).toBe(true);
		expect(h.canRedo).toBe(false);
		expect(h.undo()).toBe('a');
		expect(h.redo()).toBe('x');
		expect(h.redo()).toBeNull();
	});

	it('folds an equal neighbour into one entry', () => {
		const h = new History<{ n: number }>();
		expect(h.push({ n: 1 })).toBe(true);
		expect(h.push({ n: 1 })).toBe(false);
		expect(h.size).toBe(1);
		h.push({ n: 2 });
		expect(h.push({ n: 2 })).toBe(false);
		expect(h.size).toBe(2);
		// Equal to an earlier entry but not to its neighbour: kept.
		expect(h.push({ n: 1 })).toBe(true);
		expect(h.size).toBe(3);
	});

	it('an entry equal to the current one leaves the redo stack alone', () => {
		const h = new History<string>();
		['a', 'b', 'c'].forEach((e) => h.push(e));
		h.undo();
		expect(h.push('b')).toBe(false);
		expect(h.canRedo).toBe(true);
		expect(h.redo()).toBe('c');
	});

	it('keeps at most the cap, dropping the oldest, and the cursor stays on the newest', () => {
		const h = new History<number>(3);
		for (let i = 1; i <= 5; i++) h.push(i);
		expect(h.size).toBe(3);
		expect(h.undo()).toBe(4);
		expect(h.undo()).toBe(3);
		expect(h.undo()).toBeNull();
		expect(h.redo()).toBe(4);
		expect(h.redo()).toBe(5);
	});

	it('the default cap is 100', () => {
		const h = new History<number>();
		for (let i = 0; i < 150; i++) h.push(i);
		expect(h.size).toBe(100);
		let last = -1;
		for (let e = h.undo(); e !== null; e = h.undo()) last = e;
		expect(last).toBe(50);
	});

	it('takes its own idea of equal', () => {
		const h = new History<{ id: number; noise: number }>(100, (a, b) => a.id === b.id);
		h.push({ id: 1, noise: 1 });
		expect(h.push({ id: 1, noise: 2 })).toBe(false);
		expect(h.push({ id: 2, noise: 2 })).toBe(true);
	});
});

describe('sameEntry', () => {
	const rec = (fg: string) => ({ v: 1 as const, fg });
	it('compares the record by value and the pictures by reference', () => {
		const logo = 'data:image/png;base64,AAAA';
		const a: DesignEntry = { saved: rec('#000000'), logo };
		expect(sameEntry(a, { saved: rec('#000000'), logo })).toBe(true);
		expect(sameEntry(a, { saved: rec('#111111'), logo })).toBe(false);
		expect(sameEntry(a, { saved: rec('#000000') })).toBe(false);
		expect(sameEntry(a, { saved: rec('#000000'), logo, halftoneImage: 'data:x' })).toBe(false);
		expect(sameEntry({ saved: rec('#000000') }, { saved: rec('#000000') })).toBe(true);
	});
});

describe('keys', () => {
	const key = (key: string, mods: Partial<Record<'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey', boolean>> = {}) =>
		keyAction({ key, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, ...mods });

	it('undo on Cmd+Z or Ctrl+Z, redo with Shift added', () => {
		expect(key('z', { metaKey: true })).toBe('undo');
		expect(key('z', { ctrlKey: true })).toBe('undo');
		expect(key('Z', { metaKey: true, shiftKey: true })).toBe('redo');
		expect(key('Z', { ctrlKey: true, shiftKey: true })).toBe('redo');
	});

	it('Ctrl+Y redoes, Cmd+Y does not', () => {
		expect(key('y', { ctrlKey: true })).toBe('redo');
		expect(key('y', { metaKey: true })).toBeNull();
	});

	it('Cmd or Ctrl+S saves', () => {
		expect(key('s', { metaKey: true })).toBe('save');
		expect(key('S', { ctrlKey: true })).toBe('save');
		expect(key('s', { metaKey: true, shiftKey: true })).toBeNull();
	});

	it('ignores plain letters and anything with Alt', () => {
		expect(key('z')).toBeNull();
		expect(key('s')).toBeNull();
		expect(key('z', { metaKey: true, altKey: true })).toBeNull();
	});
});

describe('platform', () => {
	it('spots Apple platforms', () => {
		expect(isApplePlatform('MacIntel')).toBe(true);
		expect(isApplePlatform('macOS')).toBe(true);
		expect(isApplePlatform('iPhone')).toBe(true);
		expect(isApplePlatform('Win32')).toBe(false);
		expect(isApplePlatform('Linux x86_64')).toBe(false);
		expect(isApplePlatform('')).toBe(false);
	});

	it('labels each platform in its own way', () => {
		expect(shortcuts(true)).toEqual({ undo: '⌘Z', redo: '⇧⌘Z', save: '⌘S' });
		expect(shortcuts(false)).toEqual({ undo: 'Ctrl+Z', redo: 'Ctrl+Y', save: 'Ctrl+S' });
	});
});

describe('ownsUndo', () => {
	const el = (tagName: string, extra: Record<string, unknown> = {}) => ({ tagName, ...extra }) as unknown as Element;
	it('leaves text fields, selects, and editable content to the browser', () => {
		expect(ownsUndo(el('INPUT', { type: 'text' }))).toBe(true);
		expect(ownsUndo(el('INPUT', { type: 'url' }))).toBe(true);
		expect(ownsUndo(el('INPUT', { type: 'password' }))).toBe(true);
		expect(ownsUndo(el('TEXTAREA'))).toBe(true);
		expect(ownsUndo(el('SELECT'))).toBe(true);
		expect(ownsUndo(el('DIV', { isContentEditable: true }))).toBe(true);
	});

	it('takes the key from controls that have no text to undo', () => {
		expect(ownsUndo(el('INPUT', { type: 'range' }))).toBe(false);
		expect(ownsUndo(el('INPUT', { type: 'checkbox' }))).toBe(false);
		expect(ownsUndo(el('BUTTON'))).toBe(false);
		expect(ownsUndo(el('DIV', { isContentEditable: false }))).toBe(false);
		expect(ownsUndo(null)).toBe(false);
	});
});
