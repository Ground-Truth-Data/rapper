// @vitest-environment happy-dom
// A person's pill in their colour; a second half for a clobber, someone
// else's edit, or a plain re-save — clobber first.
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
		expect(c.querySelector(".id-pill-wrap--double")).toBeNull();
		const self = render(IdentityPill, { who: me }).container.querySelector(".id-pill")!;
		expect(self.className).toMatch(/id-pill--self/);
		expect(self.className).not.toMatch(/id-pill--picked/);
	});

	it("the second half: hammer beats editor beats edited", () => {
		const hammer = render(IdentityPill, { who: me, editor: pete, hammer: true }).container;
		expect(hammer.querySelector(".id-pill--hammer")!.textContent).toBe("Pete");
		const edit = render(IdentityPill, { who: me, editor: pete, edited: true }).container;
		expect(edit.querySelector(".id-pill--editor")!.textContent).toBe("Pete");
		expect(edit.querySelector(".id-pill--hammer")).toBeNull();
		const resaved = render(IdentityPill, { who: me, edited: true }).container;
		expect(resaved.querySelector(".id-pill-wrap--double .id-pill--editor svg")).not.toBeNull();
		expect(resaved.querySelector(".id-pill--editor")!.textContent).toBe("");
	});
});
