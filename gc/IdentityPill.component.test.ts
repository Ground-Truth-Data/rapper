// @vitest-environment happy-dom
// The person, then one joined pill per editor: a pen half for their saves, a hammer half for a clobber.
import { render } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import IdentityPill from "./IdentityPill.svelte";

const pete = { label: "Pete", color: "#c33", self: false, picked: true };
const me = { label: "Me", color: "", self: true, picked: true };

describe("IdentityPill", () => {
	it("draws the person alone, picked colour filled, self outlined", () => {
		const c = render(IdentityPill, { who: pete }).container;
		const pill = c.querySelector<HTMLElement>(".id-pill")!;
		expect(pill.textContent).toBe("Pete");
		expect(pill.classList.contains("id-pill--picked")).toBe(true);
		expect(pill.style.getPropertyValue("--id-c")).toBe("#c33");
		expect(c.querySelectorAll(".id-pill")).toHaveLength(1);
		const self = render(IdentityPill, { who: me }).container.querySelector(".id-pill")!;
		expect(self.className).toMatch(/id-pill--self/);
		expect(self.className).not.toMatch(/id-pill--picked/);
	});

	it("a clobber is a hammer half joined to the editor's own pill, in their colour", () => {
		const c = render(IdentityPill, { who: pete, editors: [{ who: pete, count: 2 }], clobberBy: pete }).container;
		expect(c.querySelector(".id-mark-half--hammer")).not.toBeNull();
		const pill = c.querySelector(".id-mark .id-pill")!;
		expect(pill.textContent).toMatch(/^Pete\s×2$/);
		expect(pill.classList.contains("id-pill--picked")).toBe(true);
		expect(c.querySelectorAll(".id-pill")).toHaveLength(1);
	});

	it("an owner who edited is one joined pen pill and its count, never two pills", () => {
		const c = render(IdentityPill, { who: me, editors: [{ who: me, count: 3 }] }).container;
		expect(c.querySelector(".id-mark-half")).not.toBeNull();
		expect(c.querySelector(".id-mark-half--hammer")).toBeNull();
		expect(c.querySelectorAll(".id-pill")).toHaveLength(1);
		expect(c.querySelector(".id-pill")!.textContent).toMatch(/^Me\s×3$/);
	});
});
