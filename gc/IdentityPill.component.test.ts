// @vitest-environment happy-dom
// One pill, one fact: the person, a clobber (hammer + who did it), or the
// owner's own re-save (a grey pen), each with its count.
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
		const c = render(IdentityPill, { who: pete, clobber: true, count: 2 }).container;
		expect(c.querySelector(".id-hammer-half [aria-hidden]")).not.toBeNull();
		const pill = c.querySelector(".id-hammer .id-pill")!;
		expect(pill.textContent).toMatch(/^Pete\s×2$/);
		expect(pill.classList.contains("id-pill--picked")).toBe(true);
		expect(c.querySelectorAll(".id-pill")).toHaveLength(1);
	});

	it("the owner's own re-save is a grey pen and its count", () => {
		const once = render(IdentityPill, { who: me, edited: true }).container;
		expect(once.querySelector(".id-pill--pen")!.textContent).toBe("×1");
		expect(once.querySelector(".id-pill--pen")!.textContent).not.toContain("Me");
		const thrice = render(IdentityPill, { who: me, edited: true, count: 3 }).container;
		expect(thrice.querySelector(".id-pill--pen")!.textContent).toBe("×3");
	});
});
