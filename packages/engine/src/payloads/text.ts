/**
 * Plain text payload: the scanner shows the string and offers to copy or search it.
 * ZXing treats anything it cannot parse as text, so there is nothing to escape.
 * https://github.com/zxing/zxing/wiki/Barcode-Contents
 *
 * Leading whitespace is kept (it may be deliberate, e.g. ASCII art); trailing
 * whitespace is dropped because it only makes the code bigger.
 */
export function text(t: string): string {
	return t.replace(/\s+$/, '');
}
