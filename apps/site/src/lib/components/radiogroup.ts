/**
 * Arrow keys inside a group of `role="radio"` buttons, so a drawn choice behaves like the native
 * radio group it claims to be: Tab lands on the chosen tile, the arrows move the choice, Home
 * and End jump to the ends. Each tile carries `tabindex` 0 when chosen and -1 otherwise (the
 * roving tabindex); this action only handles the keys.
 *
 * All four arrows step through the group in reading order, as the ARIA radio-group pattern
 * asks, rather than trying to move by row in a grid: the groups here are one or two rows and a
 * predictable step beats a clever one.
 */
export function radioKeys(node: HTMLElement) {
	function onKey(e: KeyboardEvent) {
		let step: number | 'first' | 'last';
		switch (e.key) {
			case 'ArrowLeft':
			case 'ArrowUp':
				step = -1;
				break;
			case 'ArrowRight':
			case 'ArrowDown':
				step = 1;
				break;
			case 'Home':
				step = 'first';
				break;
			case 'End':
				step = 'last';
				break;
			default:
				return;
		}
		const items = [...node.querySelectorAll<HTMLElement>('[role="radio"]:not(:disabled)')];
		if (!items.length) return;
		const focused = items.indexOf(e.target as HTMLElement);
		const from = focused >= 0 ? focused : items.findIndex((el) => el.getAttribute('aria-checked') === 'true');
		const to =
			step === 'first' ? 0 : step === 'last' ? items.length - 1 : (from + step + items.length) % items.length;
		e.preventDefault();
		items[to].focus();
		items[to].click();
	}
	node.addEventListener('keydown', onKey);
	return {
		destroy() {
			node.removeEventListener('keydown', onKey);
		}
	};
}
