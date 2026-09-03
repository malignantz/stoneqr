/**
 * Lazy handle on the engine's label-sheet module.
 *
 * `@stoneqr/engine/labels` pulls in pdf-lib, which is far too big to sit in the bundle every
 * visitor downloads, so it is imported only when someone actually opens the label panel. The
 * loader lives here rather than in the page because `typeof import(...)` does not survive
 * svelte2tsx, and because a second click while the first import is still in flight should wait
 * on the same promise rather than start another one.
 */
export type LabelsModule = typeof import('@stoneqr/engine/labels');

let pending: Promise<LabelsModule> | null = null;

export function loadLabels(): Promise<LabelsModule> {
	pending ??= import('@stoneqr/engine/labels');
	return pending;
}
