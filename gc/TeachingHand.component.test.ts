// @vitest-environment happy-dom
// The teaching hand: placed, it is on stage with every grip mounted and
// hidden from readers; a tween settles through the mocked gsap; cancel takes it off.
import { cleanup, render } from "@testing-library/svelte";
import { flushSync } from "svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import TeachingHand from "./TeachingHand.svelte";

// gsap's `to` is a thenable tween: run it to its end on the next microtask.
vi.mock("gsap", () => ({
	gsap: {
		to(target: Record<string, number>, vars: Record<string, unknown>) {
			const done = Promise.resolve().then(() => {
				for (const [k, v] of Object.entries(vars)) if (typeof v === "number" && k in target) target[k] = v;
				(vars.onUpdate as (() => void) | undefined)?.();
			});
			return { then: done.then.bind(done), kill: vi.fn() };
		},
	},
}));

afterEach(cleanup);

describe("TeachingHand", () => {
	it("is off stage until placed, then shows the pointing grip at the fingertip", async () => {
		const { component, container } = render(TeachingHand);
		expect(component.isVisible()).toBe(false);
		expect(container.querySelectorAll("img")).toHaveLength(0);

		component.place(120, 80);
		flushSync();
		expect(component.isVisible()).toBe(true);
		const imgs = [...container.querySelectorAll("img")];
		expect(imgs).toHaveLength(3);
		for (const img of imgs) {
			expect(img.getAttribute("aria-hidden")).toBe("true");
			expect(img.style.left).toBe("120px");
			expect(img.style.top).toBe("80px");
			expect(img.classList.contains("draw-demo-hand")).toBe(true);
		}
		expect(imgs.map((i) => i.style.opacity)).toEqual(["0", "0", "0"]);

		await component.fadeIn();
		flushSync();
		const shown = [...container.querySelectorAll("img")].map((i) => i.style.opacity);
		expect(shown).toEqual(["1", "0", "0"]);

		component.setGrip("fist");
		flushSync();
		expect([...container.querySelectorAll("img")].map((i) => i.style.opacity)).toEqual(["0", "0", "1"]);

		await component.moveTo(300, 200);
		flushSync();
		expect(container.querySelector("img")!.style.left).toBe("300px");

		component.cancel();
		flushSync();
		expect(component.isVisible()).toBe(false);
		expect(container.querySelectorAll("img")).toHaveLength(0);
	});
});
