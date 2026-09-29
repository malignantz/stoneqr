import { isApplePlatform } from './history';

/**
 * What the design menu needs to know about undo, without ContentForm carrying it there.
 *
 * Generator owns the history and writes this on mount; DesignMenu reads it. Module scope, like the
 * design itself, so both see the same object whichever page mounted them. The callbacks are
 * replaced by no-ops when the mounted Generator goes away.
 */
export const undoBar = $state({
	canUndo: false,
	canRedo: false,
	undo: () => {},
	redo: () => {}
});

/** Browser only: the menu and the notice call it from an effect or a mount, so the prerendered page never disagrees with the client. */
export function platformIsApple(): boolean {
	const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
	return isApplePlatform(nav.userAgentData?.platform || navigator.platform || '');
}
