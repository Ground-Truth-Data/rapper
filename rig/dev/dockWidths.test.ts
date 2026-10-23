// @vitest-environment happy-dom
// The frame's on-screen box lands on :root as px, the gutters either side of
// it as dock widths (never negative), and teardown leaves nothing behind.
import { describe, expect, it, vi } from "vitest";
import { publishDockWidths } from "./dockWidths";

describe("publishDockWidths", () => {
	it("publishes the frame box and gutter widths, re-measures on resize, and clears on stop", () => {
		const observed: Element[] = [];
		vi.stubGlobal("ResizeObserver", class {
			observe(el: Element) { observed.push(el); }
			disconnect() {}
		});
		Object.defineProperty(window, "innerWidth", { configurable: true, value: 1200 });
		const frame = document.createElement("div");
		let left = 400;
		frame.getBoundingClientRect = () => ({ left, top: 20, width: 390.4, height: 844, right: left + 390.4, bottom: 864, x: left, y: 20, toJSON: () => ({}) });
		const onMeasure = vi.fn();
		const stop = publishDockWidths(frame, onMeasure);
		const root = document.documentElement.style;
		expect(root.getPropertyValue("--dock-width-left")).toBe("373px");
		expect(root.getPropertyValue("--dock-width-right")).toBe("383px");
		expect(root.getPropertyValue("--phone-frame-width")).toBe("390px");
		expect(observed).toEqual([frame, document.documentElement]);
		left = 5;
		window.dispatchEvent(new Event("resize"));
		expect(onMeasure).toHaveBeenLastCalledWith(expect.objectContaining({ left: 0, frameLeft: 5 }));
		stop();
		expect(root.getPropertyValue("--phone-frame-top")).toBe("");
		vi.unstubAllGlobals();
	});
});
