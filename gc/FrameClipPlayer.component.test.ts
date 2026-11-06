// @vitest-environment happy-dom
// One <img> stepping a clip's frames at its fps: a range plays then holds and
// reports done; a loop wraps to its first frame.
import { cleanup, render } from "@testing-library/svelte";
import { flushSync } from "svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FrameClipPlayer from "./FrameClipPlayer.svelte";

const facts = { section: "hands", frameCount: 5, fps: 10, widthRem: 4, note: "" };
const src = (c: HTMLElement) => c.querySelector("img")!.getAttribute("src");

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

describe("FrameClipPlayer", () => {
	it("plays a range at the clip's fps, reports each frame, then holds and says done", () => {
		const onFrame = vi.fn();
		const onDone = vi.fn();
		const { container } = render(FrameClipPlayer, { root: "/f", clip: "wave", facts, from: 2, to: 4, onFrame, onDone });
		expect(src(container)).toBe("/f/hands/wave/wave_002.webp");
		expect(container.querySelector("img")!.style.width).toBe("4rem");
		vi.advanceTimersByTime(100);
		flushSync();
		expect(src(container)).toBe("/f/hands/wave/wave_003.webp");
		vi.advanceTimersByTime(200);
		flushSync();
		expect(src(container)).toBe("/f/hands/wave/wave_004.webp");
		expect(onFrame.mock.calls.map((c) => c[0])).toEqual([2, 3, 4]);
		expect(onDone).toHaveBeenCalledOnce();
		vi.advanceTimersByTime(1000);
		flushSync();
		expect(src(container)).toBe("/f/hands/wave/wave_004.webp");
		expect(onDone).toHaveBeenCalledOnce();
	});

	it("a loop wraps back to its first frame and never finishes", () => {
		const onDone = vi.fn();
		const { container, unmount } = render(FrameClipPlayer, { root: "/f", clip: "spin", facts, loop: true, onDone });
		vi.advanceTimersByTime(500);
		flushSync();
		expect(src(container)).toBe("/f/hands/spin/spin_001.webp");
		vi.advanceTimersByTime(100);
		flushSync();
		expect(src(container)).toBe("/f/hands/spin/spin_002.webp");
		expect(onDone).not.toHaveBeenCalled();
		unmount();
		expect(vi.getTimerCount()).toBe(0);
	});

	it("a counted loop plays that many times, then holds its last frame and says done", () => {
		const onDone = vi.fn();
		const { container } = render(FrameClipPlayer, { root: "/f", clip: "pant", facts, loop: 3, onDone });
		vi.advanceTimersByTime(1400);
		flushSync();
		expect(src(container)).toBe("/f/hands/pant/pant_005.webp");
		expect(onDone).not.toHaveBeenCalled();
		vi.advanceTimersByTime(100);
		flushSync();
		expect(src(container)).toBe("/f/hands/pant/pant_005.webp");
		expect(onDone).toHaveBeenCalledOnce();
		expect(vi.getTimerCount()).toBe(0);
	});

	it("plays an exposure sheet, skipping the write when a frame repeats", async () => {
		const onFrame = vi.fn();
		const onDone = vi.fn();
		const { container } = render(FrameClipPlayer, { root: "/f", clip: "wave", facts, frames: [1, 1, 3, 3, 5], onFrame, onDone });
		const writes = watchSrc(container);
		for (let t = 0; t < 4; t++) {
			vi.advanceTimersByTime(100);
			flushSync();
		}
		await Promise.resolve();
		expect(src(container)).toBe("/f/hands/wave/wave_005.webp");
		expect(onFrame.mock.calls.map((c) => c[0])).toEqual([1, 1, 3, 3, 5]);
		expect(writes()).toEqual(["/f/hands/wave/wave_003.webp", "/f/hands/wave/wave_005.webp"]);
		expect(onDone).not.toHaveBeenCalled();
		vi.advanceTimersByTime(100);
		expect(onDone).toHaveBeenCalledOnce();
	});
});

const clipFacts = (frameCount: number) => ({ section: "dog", frameCount, fps: 24, widthRem: 4, note: "" });

// Every src the <img> is given after mount, null for a removal: each record's
// new value is the next record's old one, the last record's is the live attribute.
function watchSrc(c: HTMLElement) {
	const img = c.querySelector("img")!;
	const before: (string | null)[] = [];
	const take = (records: MutationRecord[]) => {
		for (const r of records) before.push(r.oldValue);
	};
	const mo = new MutationObserver(take);
	mo.observe(img, { attributes: true, attributeFilter: ["src"], attributeOldValue: true });
	return () => {
		take(mo.takeRecords());
		return before.length ? [...before.slice(1), img.getAttribute("src")] : [];
	};
}

// rerender is never awaited: it applies props in flushSync, then awaits Svelte's tick(), which in
// async mode waits on rAF/setTimeout — faked here, so it never settles.
describe("FrameClipPlayer switching clips in place", () => {
	it("never removes src or shows the old frame index in the new clip", async () => {
		const { container, rerender } = render(FrameClipPlayer, { root: "/f", clip: "turn", facts: clipFacts(71) });
		vi.advanceTimersByTime((70 * 1000) / 24 + 1);
		flushSync();
		expect(src(container)).toBe("/f/dog/turn/turn_071.webp");
		const writes = watchSrc(container);
		rerender({ clip: "pant", facts: clipFacts(8), from: 1 });
		flushSync();
		await Promise.resolve();
		expect(writes()).toEqual(["/f/dog/pant/pant_001.webp"]);
	});

	it("starts a longer clip at its first frame, never at the old clip's index", async () => {
		const { container, rerender } = render(FrameClipPlayer, { root: "/f", clip: "entrance", facts: clipFacts(49), from: 49 });
		const writes = watchSrc(container);
		rerender({ clip: "turn", facts: clipFacts(71), from: 1 });
		flushSync();
		await Promise.resolve();
		expect(writes()).toEqual(["/f/dog/turn/turn_001.webp"]);
	});

	it("writes nothing when only `from` changes to the frame already up", async () => {
		const { container, rerender } = render(FrameClipPlayer, { root: "/f", clip: "turn", facts: clipFacts(8) });
		vi.advanceTimersByTime((7 * 1000) / 24 + 1);
		flushSync();
		expect(src(container)).toBe("/f/dog/turn/turn_008.webp");
		const writes = watchSrc(container);
		rerender({ from: 8 });
		flushSync();
		await Promise.resolve();
		expect(writes()).toEqual([]);
	});

	it("with decodeFirst keeps the old frame up until the next clip's first frame decodes", async () => {
		let decoded = () => {};
		const decode = vi
			.spyOn(HTMLImageElement.prototype, "decode")
			.mockImplementation(() => new Promise<void>((r) => (decoded = r)));
		const { container, rerender } = render(FrameClipPlayer, { root: "/f", clip: "a", facts: clipFacts(4), from: 4, decodeFirst: true });
		decoded();
		await vi.advanceTimersByTimeAsync(0);
		flushSync();
		expect(src(container)).toBe("/f/dog/a/a_004.webp");
		rerender({ clip: "b", facts: clipFacts(4), from: 1 });
		flushSync();
		expect(src(container)).toBe("/f/dog/a/a_004.webp");
		decoded();
		await vi.advanceTimersByTimeAsync(0);
		flushSync();
		expect(src(container)).toBe("/f/dog/b/b_001.webp");
		decode.mockRestore();
	});

	it("with decodeFirst skips a frame inside a clip that has not decoded, keeping the one up", async () => {
		const pending = new Set<string>(["/f/dog/w/w_003.webp"]);
		const decode = vi.spyOn(HTMLImageElement.prototype, "decode").mockImplementation(function (this: HTMLImageElement) {
			return pending.has(this.getAttribute("src") ?? "") ? new Promise<void>(() => {}) : Promise.resolve();
		});
		const onFrame = vi.fn();
		const { container } = render(FrameClipPlayer, { root: "/f", clip: "w", facts: clipFacts(4), decodeFirst: true, onFrame });
		await vi.advanceTimersByTimeAsync(0);
		flushSync();
		const writes = watchSrc(container);
		await vi.advanceTimersByTimeAsync(3 * (1000 / 24) + 5);
		flushSync();
		expect(onFrame.mock.calls.map((c) => c[0])).toEqual([1, 2, 4]);
		expect(src(container)).toBe("/f/dog/w/w_004.webp");
		expect(writes()).not.toContain("/f/dog/w/w_003.webp");
		decode.mockRestore();
	});

	it("on the elapsed clock a late tick skips ahead and the clip ends on time", () => {
		const tick = 1000 / 24;
		const start = Date.now();
		let stalled = 0;
		const clock = vi.spyOn(performance, "now").mockImplementation(() => Date.now() - start + stalled);
		const onFrame = vi.fn();
		const onDone = vi.fn();
		const { container } = render(FrameClipPlayer, { root: "/f", clip: "walk", facts: clipFacts(6), clock: "elapsed", onFrame, onDone });
		stalled = 2 * tick;
		vi.advanceTimersByTime(tick + 1);
		flushSync();
		expect(src(container)).toBe("/f/dog/walk/walk_004.webp");
		vi.advanceTimersByTime(2 * tick);
		expect(onDone).not.toHaveBeenCalled();
		vi.advanceTimersByTime(tick + 5);
		expect(onFrame.mock.calls.map((c) => c[0])).toEqual([1, 4, 5, 6]);
		expect(onDone).toHaveBeenCalledOnce();
		clock.mockRestore();
	});
});
