import { describe, expect, it } from 'vitest';
import { imagePlacement } from '@stoneqr/engine';
import { cropRect, offsetsFor, zoomForBox } from '$lib/crop';

/**
 * The crop box must be the exact inverse of the engine's placement, or the box would show one
 * region and the code another. Every case here runs the engine forwards and the box backwards.
 */
const cases = [
	{ iw: 800, ih: 600, zoom: 1, dx: 0, dy: 0 },
	{ iw: 600, ih: 800, zoom: 1, dx: 0, dy: 0 },
	{ iw: 1024, ih: 1024, zoom: 2, dx: 0.25, dy: -0.1 },
	{ iw: 1024, ih: 400, zoom: 0.5, dx: -0.3, dy: 0.2 },
	{ iw: 300, ih: 900, zoom: 3, dx: 0.5, dy: 0.5 }
];

describe('cropRect', () => {
	it('is the data area in picture coordinates, matching the engine placement', () => {
		const area = 1000;
		for (const c of cases) {
			const p = imagePlacement(c.iw, c.ih, area, { imageZoom: c.zoom, imageOffsetX: c.dx, imageOffsetY: c.dy });
			const r = cropRect(c.iw / c.ih, c.zoom, c.dx, c.dy);
			expect(r.u).toBeCloseTo(-p.x / p.width, 9);
			expect(r.v).toBeCloseTo(-p.y / p.height, 9);
			expect(r.w).toBeCloseTo(area / p.width, 9);
			expect(r.h).toBeCloseTo(area / p.height, 9);
		}
	});

	it('covers the whole short side at zoom 1 with no offset', () => {
		const r = cropRect(2, 1, 0, 0);
		expect(r.h).toBeCloseTo(1);
		expect(r.w).toBeCloseTo(0.5);
		expect(r.u).toBeCloseTo(0.25);
		expect(r.v).toBeCloseTo(0);
	});
});

describe('offsetsFor', () => {
	it('recovers the offsets from the box corner', () => {
		for (const c of cases) {
			const r = cropRect(c.iw / c.ih, c.zoom, c.dx, c.dy);
			const o = offsetsFor(c.iw / c.ih, c.zoom, r.u, r.v);
			expect(o.offsetX).toBeCloseTo(c.dx, 9);
			expect(o.offsetY).toBeCloseTo(c.dy, 9);
		}
	});

	it('clamps to what the engine accepts', () => {
		const o = offsetsFor(1, 1, 5, -5);
		expect(o.offsetX).toBe(-0.5);
		expect(o.offsetY).toBe(0.5);
	});
});

describe('zoomForBox', () => {
	it('inverts the box size on either axis', () => {
		for (const c of cases) {
			const r = cropRect(c.iw / c.ih, c.zoom, c.dx, c.dy);
			expect(zoomForBox(c.iw / c.ih, r.w, 'w')).toBeCloseTo(c.zoom, 9);
			expect(zoomForBox(c.iw / c.ih, r.h, 'h')).toBeCloseTo(c.zoom, 9);
		}
	});

	it('clamps to the engine range', () => {
		expect(zoomForBox(1, 10, 'w')).toBe(0.5);
		expect(zoomForBox(1, 0.01, 'w')).toBe(3);
	});
});
