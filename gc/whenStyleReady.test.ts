import { describe, expect, it, vi } from "vitest";
import { isStyleReady, whenStyleReady } from "./whenStyleReady";

/**
 * A map whose style readiness and events are driven by the test — the real
 * failure is a TIMING race, so the point is to reproduce orderings a live map
 * produces by luck.
 */
function fakeMap(opts: { ready?: boolean } = {}) {
	let ready = opts.ready ?? false;
	const listeners = new Map<string, Set<() => void>>();
	return {
		isStyleLoaded: () => ready,
		on(type: string, fn: () => void) {
			if (!listeners.has(type)) listeners.set(type, new Set());
			listeners.get(type)?.add(fn);
		},
		off(type: string, fn: () => void) {
			listeners.get(type)?.delete(fn);
		},
		/** Emit as the renderer does, without changing readiness. */
		emit(type: string) {
			for (const fn of [...(listeners.get(type) ?? [])]) fn();
		},
		setReady(v: boolean) {
			ready = v;
		},
		count(type: string) {
			return listeners.get(type)?.size ?? 0;
		},
	};
}

describe("whenStyleReady", () => {
	it("runs immediately when the style is already loaded", () => {
		const map = fakeMap({ ready: true });
		const fn = vi.fn();
		whenStyleReady(map, fn);
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it("does NOT run while the style is still loading", () => {
		const map = fakeMap({ ready: false });
		const fn = vi.fn();
		whenStyleReady(map, fn);
		expect(fn).not.toHaveBeenCalled();
	});

	// THE BUG, reproduced: a tile lands mid-boot, the renderer emits, and the
	// unguarded code called addSource against a style that was not ready.
	it("defers until the style becomes ready, then runs", () => {
		const map = fakeMap({ ready: false });
		const fn = vi.fn();
		whenStyleReady(map, fn);

		map.emit("styledata"); // settling — still not ready
		expect(fn).not.toHaveBeenCalled();

		map.setReady(true);
		map.emit("styledata");
		expect(fn).toHaveBeenCalledTimes(1);
	});

	// Lesson 1: style.load fires BEFORE the style accepts a symbol layer, so a
	// guarded style.load callback returns early and never puts the layer back.
	// styledata keeps firing, so a later one lands on a ready style.
	it("survives a style.load that arrives too early", () => {
		const map = fakeMap({ ready: false });
		const fn = vi.fn();
		whenStyleReady(map, fn);

		map.emit("style.load"); // not subscribed — must not be the trigger
		expect(fn).not.toHaveBeenCalled();

		map.setReady(true);
		map.emit("styledata");
		expect(fn).toHaveBeenCalledTimes(1);
	});

	// Lesson 4: a basemap swap destroys custom layers; a one-shot subscription
	// loses them forever.
	it("re-runs after a basemap swap", () => {
		const map = fakeMap({ ready: true });
		const fn = vi.fn();
		whenStyleReady(map, fn);
		expect(fn).toHaveBeenCalledTimes(1);

		map.setReady(false); // swap begins, layers dropped
		map.emit("styledata");
		expect(fn).toHaveBeenCalledTimes(1);

		map.setReady(true); // new style settles
		map.emit("styledata");
		expect(fn).toHaveBeenCalledTimes(2);
	});

	it("stops after dispose and removes its listener", () => {
		const map = fakeMap({ ready: true });
		const fn = vi.fn();
		const dispose = whenStyleReady(map, fn);
		expect(fn).toHaveBeenCalledTimes(1);

		dispose();
		map.emit("styledata");
		expect(fn).toHaveBeenCalledTimes(1);
		expect(map.count("styledata")).toBe(0);

		dispose(); // idempotent
	});

	it("tolerates a null map", () => {
		expect(() => whenStyleReady(null, vi.fn())()).not.toThrow();
	});
});

describe("isStyleReady", () => {
	// Lesson 2: getStyle()/.style is truthy long before addSource will accept
	// anything, so readiness must come from isStyleLoaded alone.
	it("is false when isStyleLoaded is absent", () => {
		expect(isStyleReady({ style: {} } as never)).toBe(false);
	});

	it("tracks isStyleLoaded", () => {
		const map = fakeMap({ ready: false });
		expect(isStyleReady(map)).toBe(false);
		map.setReady(true);
		expect(isStyleReady(map)).toBe(true);
	});

	it("is false for null/undefined", () => {
		expect(isStyleReady(null)).toBe(false);
		expect(isStyleReady(undefined)).toBe(false);
	});
});
