// @vitest-environment happy-dom
// The lens copies the map under the finger every frame; its ring ticks light
// as the hold runs, lock with a buzz when full, and freeze when paused.
import { cleanup, render } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Loupe, { HOLD_MS, LOUPE_W, TICKS } from "./Loupe.svelte";

let frames: FrameRequestCallback[] = [];
let now = 0;
const step = (ms: number) => {
	now += ms;
	const due = frames;
	frames = [];
	for (const f of due) f(now);
};
const drawn = vi.fn();

function mapCanvas() {
	const c = document.createElement("canvas");
	c.width = 780;
	c.height = 1688;
	c.getBoundingClientRect = () => ({ left: 0, top: 0, width: 390, height: 844, right: 390, bottom: 844, x: 0, y: 0, toJSON: () => ({}) });
	return c;
}

beforeEach(() => {
	frames = [];
	now = 1000;
	vi.stubGlobal("requestAnimationFrame", (f: FrameRequestCallback) => frames.push(f));
	vi.stubGlobal("cancelAnimationFrame", vi.fn());
	vi.spyOn(performance, "now").mockImplementation(() => now);
	HTMLCanvasElement.prototype.getContext = (() => ({ clearRect: vi.fn(), drawImage: drawn })) as never;
	Object.defineProperty(navigator, "vibrate", { configurable: true, value: vi.fn() });
});
afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe("Loupe", () => {
	it("copies the map, lights the ticks as the hold runs, and locks once full", async () => {
		const { container } = render(Loupe, { src: mapCanvas(), x: 200, y: 400, since: 1000 });
		await Promise.resolve();
		const [lens] = container.querySelectorAll("canvas");
		expect(lens!.width).toBe(LOUPE_W * window.devicePixelRatio);
		expect(drawn).toHaveBeenCalled();
		step(HOLD_MS / 2);
		await Promise.resolve();
		const lit = () => container.querySelectorAll("line.lit").length;
		expect(lit()).toBe(TICKS / 2);
		expect(container.querySelector(".lw")!.classList.contains("on")).toBe(true);
		step(HOLD_MS);
		await Promise.resolve();
		expect(lit()).toBe(TICKS);
		expect(container.querySelector(".lw")!.classList.contains("locked")).toBe(true);
		expect(navigator.vibrate).toHaveBeenCalledWith(12);
	});

	it("with no clock the ring stays dark; paused, it holds its count; out, it shrinks away", async () => {
		const dark = render(Loupe, { src: mapCanvas(), x: 10, y: 10 }).container;
		step(5000);
		await Promise.resolve();
		expect(dark.querySelectorAll("line.lit")).toHaveLength(0);
		cleanup();
		const { container } = render(Loupe, { src: mapCanvas(), x: 200, y: 400, since: now - HOLD_MS / 4, paused: true, out: true });
		await Promise.resolve();
		step(HOLD_MS);
		await Promise.resolve();
		expect(container.querySelectorAll("line.lit")).toHaveLength(TICKS / 4);
		expect(container.querySelector(".lw")!.className).toMatch(/\bout\b/);
	});
});
