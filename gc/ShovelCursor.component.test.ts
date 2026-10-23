// @vitest-environment happy-dom
// The drawn pointer: hidden until moved, gold on a press, open then fist on a
// drag, and a map hold floats the loupe with its coordinate chip.
import { cleanup, render } from "@testing-library/svelte";
import { flushSync } from "svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ShovelCursor, { HOTSPOT_X, HOTSPOT_Y } from "./ShovelCursor.svelte";

const ptr = (type: string, init: Record<string, unknown>) => window.dispatchEvent(Object.assign(new Event(type), { isPrimary: true, pointerType: "mouse", button: 0, buttons: 0, ...init }));
const press = (detail: Record<string, unknown>) => window.dispatchEvent(new CustomEvent("gc-press", { detail }));
const hand = (c: HTMLElement) => c.querySelector<HTMLElement>(".fake-cursor")!;

beforeEach(() => {
	vi.useFakeTimers();
	vi.stubGlobal("requestAnimationFrame", () => 0);
	vi.stubGlobal("cancelAnimationFrame", () => {});
	HTMLCanvasElement.prototype.getContext = (() => null) as never;
});
afterEach(() => {
	cleanup();
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe("ShovelCursor with a mouse", () => {
	it("hides the OS cursor, follows the pointer at its fingertip, and hides on leaving the page", async () => {
		const { container, unmount } = render(ShovelCursor);
		expect(document.body.classList.contains("shovel-cursor")).toBe(true);
		expect(hand(container).style.visibility).toBe("hidden");
		ptr("pointermove", { clientX: 100, clientY: 50 });
		expect(hand(container).style.transform).toBe(`translate3d(${100 - HOTSPOT_X}px, ${50 - HOTSPOT_Y}px, 0)`);
		expect(hand(container).style.visibility).toBe("visible");
		expect(container.querySelectorAll(".fake-cursor img")).toHaveLength(4);
		document.dispatchEvent(new Event("mouseleave"));
		expect(hand(container).style.visibility).toBe("hidden");
		unmount();
		expect(document.body.classList.contains("shovel-cursor")).toBe(false);
	});

	it("a click goes gold with a splash and back; a drag past the slop grabs open then fist, and lets go", async () => {
		const { container } = render(ShovelCursor);
		window.dispatchEvent(new MouseEvent("mousedown", { clientX: 10, clientY: 10, button: 0 }));
		flushSync();
		expect(hand(container).dataset.frame).toBe("gold");
		const splash = document.querySelector<HTMLElement>(".click-splash")!;
		expect(splash.style.left).toBe("10px");
		splash.dispatchEvent(new Event("animationend"));
		expect(document.querySelector(".click-splash")).toBeNull();
		ptr("pointerup", {});
		flushSync();
		expect(hand(container).dataset.frame).toBe("point");

		window.dispatchEvent(new MouseEvent("mousedown", { clientX: 10, clientY: 10, button: 0 }));
		ptr("pointermove", { clientX: 30, clientY: 10, buttons: 1 });
		flushSync();
		expect(hand(container).dataset.frame).toBe("open");
		vi.advanceTimersByTime(100);
		flushSync();
		expect(hand(container).dataset.frame).toBe("fist");
		ptr("pointerup", { button: 2 });
		ptr("pointerup", {});
		flushSync();
		expect(hand(container).dataset.frame).toBe("open");
		vi.advanceTimersByTime(250);
		flushSync();
		expect(hand(container).dataset.frame).toBe("point");
		window.dispatchEvent(new MouseEvent("mousedown", { clientX: 1, clientY: 1, button: 2 }));
		flushSync();
		expect(hand(container).dataset.frame).toBe("point");
	});
});

describe("ShovelCursor on a map press", () => {
	function canvas() {
		const c = document.createElement("canvas");
		c.getBoundingClientRect = () => ({ left: 20, top: 30, width: 390, height: 844, right: 410, bottom: 874, x: 20, y: 30, toJSON: () => ({}) });
		return c;
	}

	it("arms gold, floats the loupe and chip under the top bar on aim, and lingers paused when lifted early", async () => {
		document.documentElement.style.setProperty("--top-bar-h", "44");
		const { container } = render(ShovelCursor);
		press({ phase: "arm", x: 50, y: 60 });
		flushSync();
		expect(document.body.classList.contains("gc-map-pressing")).toBe(true);
		expect(hand(container).dataset.frame).toBe("gold");
		press({ phase: "aim", x: 50, y: 60, canvas: canvas(), label: "50.1, -119.2", since: 0 });
		flushSync();
		const chip = container.querySelector<HTMLElement>(".coord-chip")!;
		expect(chip.textContent).toBe("50.1, -119.2");
		expect([chip.style.left, chip.style.top]).toEqual(["34px", "82px"]);
		expect(container.querySelector(".touch-halo")).not.toBeNull();
		press({ phase: "end", x: 50, y: 60 });
		flushSync();
		expect(container.querySelector(".touch-halo")).toBeNull();
		expect(container.querySelector(".lw")).not.toBeNull();
		vi.advanceTimersByTime(700);
		flushSync();
		expect(container.querySelector(".coord-chip")).toBeNull();
		vi.advanceTimersByTime(200);
		flushSync();
		expect(container.querySelector(".lw")).toBeNull();
		expect(document.body.classList.contains("gc-map-pressing")).toBe(false);
	});

	it("a locked lift leaves at once; a drag grabs; a second finger or a drop clears everything; veiled shows no press", async () => {
		const { container } = render(ShovelCursor);
		press({ phase: "arm", x: 5, y: 5, veiled: true });
		flushSync();
		expect(document.body.classList.contains("gc-map-pressing")).toBe(false);
		press({ phase: "aim", x: 5, y: 5, canvas: canvas() });
		press({ phase: "end", x: 5, y: 5, locked: true });
		flushSync();
		expect(container.querySelector(".lw.out")).not.toBeNull();
		vi.advanceTimersByTime(200);
		flushSync();
		expect(container.querySelector(".lw")).toBeNull();

		press({ phase: "arm", x: 5, y: 5 });
		press({ phase: "drag", x: 9, y: 9 });
		flushSync();
		expect(hand(container).dataset.frame).toBe("open");
		press({ phase: "aim", x: 5, y: 5, canvas: canvas() });
		ptr("pointerdown", { isPrimary: false, pointerType: "touch" });
		flushSync();
		expect(container.querySelector(".lw")).toBeNull();
		ptr("pointerdown", { isPrimary: true });
		press({ phase: "arm", x: 5, y: 5 });
		press({ phase: "aim", x: 5, y: 5, canvas: canvas() });
		press({ phase: "drop", x: 5, y: 5 });
		flushSync();
		expect(container.querySelector(".lw")).toBeNull();
		expect(hand(container).dataset.frame).toBe("point");
		ptr("pointermove", { pointerType: "touch", clientX: 1, clientY: 1 });
		expect(hand(container).style.transform).toBe(`translate3d(${5 - HOTSPOT_X}px, ${5 - HOTSPOT_Y}px, 0)`);
	});
});
