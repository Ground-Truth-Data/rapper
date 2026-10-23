// @vitest-environment happy-dom
// A dev card escapes to <body>, and sits beside the phone when its lane is
// wide enough, over it when not, centred when there is no phone.
import { cleanup, render } from "@testing-library/svelte";
import { createRawSnippet, flushSync } from "svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SideCard from "./SideCard.svelte";

const body = createRawSnippet(() => ({ render: () => `<p class="inside">hi</p>` }));
function frame(left: number) {
	const f = document.createElement("div");
	f.className = "mobile-preview-frame";
	f.getBoundingClientRect = () => ({ left, top: 0, width: 390, height: 844, right: left + 390, bottom: 844, x: left, y: 0, toJSON: () => ({}) });
	document.body.append(f);
}
const card = () => document.querySelector<HTMLElement>("body > aside.side-card")!;

beforeEach(() => {
	vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
	Object.defineProperty(window, "innerWidth", { configurable: true, value: 1600 });
});
afterEach(() => {
	cleanup();
	document.body.innerHTML = "";
	vi.unstubAllGlobals();
});

describe("SideCard", () => {
	it("centres with no phone, under its title, with the caller's class and attributes", () => {
		const { unmount } = render(SideCard, { title: "Dev", class: "mine", "data-x": "1", top: "8px", children: body });
		flushSync();
		const c = card();
		expect(c.className).toMatch(/dev-card side-card mine/);
		expect(c.classList.contains("side-card--centred")).toBe(true);
		expect(c.dataset.x).toBe("1");
		expect(c.style.getPropertyValue("--nudge")).toBe("8px");
		expect(c.querySelector(".dev-card__title")!.textContent).toBe("Dev");
		expect(c.querySelector(".inside")).not.toBeNull();
		unmount();
		expect(card()).toBeNull();
	});

	it("goes beside a phone with room in its lane, top-aligned on request, and over it without", () => {
		frame(900);
		render(SideCard, { side: "left", align: "top", children: body });
		flushSync();
		expect(card().className).toMatch(/gc-lane gc-lane--left side-card--top/);
		cleanup();
		render(SideCard, { side: "right", children: body });
		flushSync();
		expect(card().classList.contains("side-card--over")).toBe(true);
		expect(card().querySelector(".dev-card__head")).toBeNull();
	});
});
