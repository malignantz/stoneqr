/**
 * Arrow keys inside a `role="tablist"`, after `radioKeys`: Tab lands on the selected tab (the
 * roving tabindex, set by the component), Left and Right step through the list and wrap, Home and
 * End jump to the ends. Activation is automatic: moving focus also selects, which is right for
 * this site because every panel stays mounted and showing one costs nothing.
 *
 * Up and Down are left alone. A tab list is a single row, and the arrows that would scroll the
 * page should keep doing so.
 */
export function tabKeys(node: HTMLElement) {
	function onKey(e: KeyboardEvent) {
		let step: number | 'first' | 'last';
		switch (e.key) {
			case 'ArrowLeft':
				step = -1;
				break;
			case 'ArrowRight':
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
		const items = [...node.querySelectorAll<HTMLElement>('[role="tab"]:not(:disabled)')];
		if (!items.length) return;
		const focused = items.indexOf(e.target as HTMLElement);
		const from = focused >= 0 ? focused : items.findIndex((el) => el.getAttribute('aria-selected') === 'true');
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
