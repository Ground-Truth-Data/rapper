// @vitest-environment happy-dom
// A button or a link in the fancy material: sized, pressed while held, and a
// disabled one neither fires nor navigates.
import { cleanup, fireEvent, render } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import FancyButton from "./FancyButton.svelte";

const label = createRawSnippet(() => ({ render: () => `<b>Save</b>` }));
const icon = createRawSnippet(() => ({ render: () => `<i>★</i>` }));
afterEach(cleanup);

describe("FancyButton", () => {
	it("is a full-width button that fires, and shows pressed only while held", async () => {
		const onclick = vi.fn();
		const { getByRole } = render(FancyButton, { onclick, children: label, icon, ariaLabel: "Save it" });
		const b = getByRole("button");
		expect(b.tagName).toBe("BUTTON");
		expect(b.className).toMatch(/size-md.*full/);
		expect(b.querySelector(".badge i")).not.toBeNull();
		await fireEvent.pointerDown(b);
		expect(b.classList.contains("pressed")).toBe(true);
		await fireEvent.pointerUp(b);
		expect(b.classList.contains("pressed")).toBe(false);
		await fireEvent.click(b);
		expect(onclick).toHaveBeenCalledOnce();
	});

	it("disabled never presses or fires; a link drops its href when disabled", async () => {
		const onclick = vi.fn();
		const { getByRole } = render(FancyButton, { onclick, disabled: true, size: "xs", variant: "rust", children: label });
		const b = getByRole("button");
		expect(b.className).not.toMatch(/\bfull\b/);
		expect(b.classList.contains("rt-fancy-btn--rust")).toBe(true);
		await fireEvent.pointerDown(b);
		expect(b.classList.contains("pressed")).toBe(false);
		await fireEvent.click(b);
		expect(onclick).not.toHaveBeenCalled();
		const live = render(FancyButton, { href: "/app/stats", children: label }).getAllByRole("link").at(-1)!;
		expect(live.getAttribute("href")).toBe("/app/stats");
		const dead = render(FancyButton, { href: "/app/stats", disabled: true, children: label }).getAllByRole("link").at(-1)!;
		expect(dead.getAttribute("href")).toBeNull();
		expect(dead.getAttribute("aria-disabled")).toBe("true");
	});
});
