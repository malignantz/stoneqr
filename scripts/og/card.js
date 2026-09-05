/**
 * Draws one 1200x630 Open Graph card on a 2D canvas, in the site's own palette and fonts.
 * Runs in the browser (see generate.mjs); the matrix is handed over by the server so the
 * engine stays the single source of QR truth.
 */
export const CARD = { width: 1200, height: 630 };

/** Where the code sits. Exported so tests can crop it back out and decode it. */
export const CODE_BOX = { x: 700, y: 90, side: 450 };

/** The headline and sub live between the wordmark and the hairline rule. */
const BLOCK = { top: 190, height: 305 };
const HEADLINE_SIZES = [
	{ size: 52, leading: 64 },
	{ size: 46, leading: 57 },
	{ size: 40, leading: 50 }
];

const PAPER = '#f4f0e8';
const INK = '#1b1917';
const INK_2 = '#4a4641';
const INK_3 = '#67625b';
const RULE = '#d6cfc2';
const ACCENT = '#1f6f63';

const DISPLAY = 'OG Display';
const SANS = 'OG Sans';
const MONO = 'OG Mono';

/**
 * @typedef {{ headline: string; sub: string; kicker: string; matrix: boolean[][]; size: number }} Card
 */

/**
 * Break `text` into lines that fit `maxWidth` at the current ctx.font.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text
 * @param {number} maxWidth
 * @returns {string[]}
 */
function wrap(ctx, text, maxWidth) {
	const lines = [];
	let line = '';
	for (const word of text.split(' ')) {
		const next = line ? `${line} ${word}` : word;
		if (line && ctx.measureText(next).width > maxWidth) {
			lines.push(line);
			line = word;
		} else {
			line = next;
		}
	}
	if (line) lines.push(line);
	return lines;
}

/**
 * The cutting-mat grid from app.css: 10 mm at 96 dpi, faint.
 * @param {CanvasRenderingContext2D} ctx
 */
function drawGrid(ctx) {
	ctx.save();
	ctx.strokeStyle = RULE;
	ctx.globalAlpha = 0.55;
	ctx.lineWidth = 1;
	for (let x = 37.8; x < CARD.width; x += 37.8) {
		ctx.beginPath();
		ctx.moveTo(Math.round(x) + 0.5, 0);
		ctx.lineTo(Math.round(x) + 0.5, CARD.height);
		ctx.stroke();
	}
	for (let y = 37.8; y < CARD.height; y += 37.8) {
		ctx.beginPath();
		ctx.moveTo(0, Math.round(y) + 0.5);
		ctx.lineTo(CARD.width, Math.round(y) + 0.5);
		ctx.stroke();
	}
	ctx.restore();
}

/**
 * The code itself, on its own paper card with a 4-module quiet zone.
 * @param {CanvasRenderingContext2D} ctx
 * @param {boolean[][]} matrix
 * @param {number} size
 * @param {{ x: number; y: number; side: number }} box
 */
function drawCode(ctx, matrix, size, box) {
	ctx.save();
	ctx.fillStyle = '#ffffff';
	ctx.fillRect(box.x, box.y, box.side, box.side);
	ctx.strokeStyle = RULE;
	ctx.lineWidth = 1;
	ctx.strokeRect(box.x + 0.5, box.y + 0.5, box.side - 1, box.side - 1);

	const quiet = 4;
	const module = Math.floor(box.side / (size + 2 * quiet));
	const drawn = module * size;
	const left = Math.round(box.x + (box.side - drawn) / 2);
	const top = Math.round(box.y + (box.side - drawn) / 2);
	ctx.fillStyle = INK;
	for (let y = 0; y < size; y++) {
		const row = matrix[y];
		if (!row) continue;
		let x = 0;
		while (x < size) {
			if (!row[x]) {
				x++;
				continue;
			}
			let run = 1;
			while (x + run < size && row[x + run]) run++;
			ctx.fillRect(left + x * module, top + y * module, run * module, module);
			x += run;
		}
	}
	ctx.restore();
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {Card} card
 */
export function drawCard(ctx, card) {
	ctx.fillStyle = PAPER;
	ctx.fillRect(0, 0, CARD.width, CARD.height);
	drawGrid(ctx);
	drawCode(ctx, card.matrix, card.size, CODE_BOX);

	const left = 88;
	const column = 540;
	ctx.textBaseline = 'alphabetic';

	// Wordmark, with the accent on QR exactly as the site sets it.
	ctx.font = `500 42px "${DISPLAY}"`;
	ctx.fillStyle = INK;
	ctx.fillText('Stone', left, 138);
	const stoneWidth = ctx.measureText('Stone').width;
	ctx.fillStyle = ACCENT;
	ctx.fillText('QR', left + stoneWidth, 138);

	// Headline and sub are one block, centred between the wordmark and the rule, so a
	// one-line headline like "Two paragraphs." does not leave the card bottom-heavy.
	// Long copy steps the headline down a size rather than running into the rule.
	ctx.font = `400 24px "${SANS}"`;
	const sub = wrap(ctx, card.sub, column);
	const subHeight = 20 + sub.length * 34;
	/** @type {string[]} */
	let headline = [];
	let display = HEADLINE_SIZES[HEADLINE_SIZES.length - 1];
	for (const step of HEADLINE_SIZES) {
		ctx.font = `500 ${step.size}px "${DISPLAY}"`;
		headline = wrap(ctx, card.headline, column);
		display = step;
		if (headline.length * step.leading + subHeight <= BLOCK.height) break;
	}
	const blockHeight = headline.length * display.leading + subHeight;
	let y = BLOCK.top + Math.max(0, (BLOCK.height - blockHeight) / 2) + display.size * 0.84;

	ctx.font = `500 ${display.size}px "${DISPLAY}"`;
	ctx.fillStyle = INK;
	for (const line of headline) {
		ctx.fillText(line, left, y);
		y += display.leading;
	}

	ctx.font = `400 24px "${SANS}"`;
	ctx.fillStyle = INK_2;
	y += 20;
	for (const line of sub) {
		ctx.fillText(line, left, y);
		y += 34;
	}

	ctx.strokeStyle = RULE;
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.moveTo(left, 524.5);
	ctx.lineTo(left + column, 524.5);
	ctx.stroke();

	ctx.font = `500 17px "${MONO}"`;
	ctx.letterSpacing = '2px';
	ctx.fillStyle = INK_3;
	ctx.fillText(card.kicker, left, 562);
	ctx.letterSpacing = '0px';
}
