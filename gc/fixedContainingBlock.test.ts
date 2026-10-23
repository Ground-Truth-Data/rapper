// @vitest-environment happy-dom
// A transformed (or filtered, contained…) ancestor captures position: fixed;
// screen px convert into its local px through its scale and border.
import { afterEach, describe, expect, it, vi } from "vitest";
import { fixedContainingBlock, localFrom } from "./fixedContainingBlock";

afterEach(() => {
	document.body.innerHTML = "";
	vi.restoreAllMocks();
});

const nest = (style: string) => {
	document.body.innerHTML = `<div id="cb" style="${style}"><div><span id="el"></span></div></div>`;
	return { cb: document.getElementById("cb")!, el: document.getElementById("el")! };
};

describe("fixedContainingBlock", () => {
	it("finds the nearest capturing ancestor, or the viewport", () => {
		for (const s of ["transform: scale(2)", "filter: blur(1px)", "will-change: transform", "contain: paint", "perspective: 10px"]) {
			const { cb, el } = nest(s);
			expect(fixedContainingBlock(el)).toBe(cb);
		}
		expect(fixedContainingBlock(nest("color: red").el)).toBeNull();
	});
});

describe("localFrom", () => {
	it("is identity at the viewport size when nothing captures", () => {
		const l = localFrom(nest("").el);
		expect(l.k).toBe(1);
		expect(l.origin).toBeNull();
		expect(l.point(5, 6)).toEqual({ x: 5, y: 6 });
		expect([l.x(3), l.y(4), l.width]).toEqual([3, 4, window.innerWidth]);
	});

	it("divides by the frame's scale and removes its rect corner and border", () => {
		const { cb, el } = nest("transform: scale(2); border-left-width: 3px; border-top-width: 4px; border-style: solid");
		cb.getBoundingClientRect = () => ({ left: 100, top: 50, width: 800, height: 1600, right: 900, bottom: 1650, x: 100, y: 50, toJSON: () => ({}) });
		const l = localFrom(el);
		expect(l.origin).toBe(cb);
		expect(l.k).toBeCloseTo(2, 6);
		expect(l.x(300)).toBeCloseTo(97, 6);
		expect(l.y(250)).toBeCloseTo(96, 6);
		const p = l.point(300, 250);
		expect(p.x).toBeCloseTo(97, 6);
		expect(p.y).toBeCloseTo(96, 6);
	});

	it("divides by CSS zoom too, which no transform matrix shows", () => {
		const { cb, el } = nest("transform: scale(2); zoom: 1.5");
		cb.getBoundingClientRect = () => ({ left: 100, top: 50, width: 900, height: 1800, right: 1000, bottom: 1850, x: 100, y: 50, toJSON: () => ({}) });
		const l = localFrom(el);
		expect(l.k).toBeCloseTo(3, 6);
		expect(l.point(400, 350).x).toBeCloseTo(100, 6);
		expect(l.point(400, 350).y).toBeCloseTo(100, 6);
		expect(localFrom(nest("zoom: 2").el).point(10, 20)).toEqual({ x: 5, y: 10 });
	});

	it("without DOMMatrix, reads the scale from rect over offsetWidth", () => {
		vi.stubGlobal("DOMMatrixReadOnly", undefined);
		const { cb, el } = nest("filter: blur(1px)");
		Object.defineProperty(cb, "offsetWidth", { value: 400 });
		cb.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 400, right: 200, bottom: 400, x: 0, y: 0, toJSON: () => ({}) });
		const l = localFrom(el);
		expect(l.k).toBe(0.5);
		expect(l.point(50, 10)).toEqual({ x: 100, y: 20 });
		vi.unstubAllGlobals();
	});
});
