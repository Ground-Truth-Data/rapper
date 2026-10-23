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
});
