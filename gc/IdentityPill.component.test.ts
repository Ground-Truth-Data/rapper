// @vitest-environment happy-dom
// The person, then one joined pill per editor: a pen half for their saves, a hammer half for a clobber.
import { fireEvent, render } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import IdentityPill, { onePerPerson } from "./IdentityPill.svelte";

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

	it("draws you gold whatever colour your row holds: a merged contact's colour never reaches the you pill", () => {
		const self = render(IdentityPill, { who: { ...me, color: "#e68a2e" } }).container.querySelector<HTMLElement>(".id-pill")!;
		expect(self.style.getPropertyValue("--id-c")).toBe("#e8c53a");
	});

	it("a clobber is a hammer half joined to the editor's own pill, in their colour", () => {
		const c = render(IdentityPill, { who: pete, editors: [pete], clobberBy: pete }).container;
		expect(c.querySelector(".id-mark-half--hammer")).not.toBeNull();
		const pill = c.querySelector(".id-mark .id-pill")!;
		expect(pill.textContent).toBe("Pete");
		expect(pill.classList.contains("id-pill--picked")).toBe(true);
		expect(c.querySelectorAll(".id-pill")).toHaveLength(1);
	});

	it("an owner who edited is one joined pen pill, never two, and never a count", () => {
		const c = render(IdentityPill, { who: me, editors: [me] }).container;
		expect(c.querySelector(".id-mark-half")).not.toBeNull();
		expect(c.querySelector(".id-mark-half--hammer")).toBeNull();
		expect(c.querySelectorAll(".id-pill")).toHaveLength(1);
		expect(c.querySelector(".id-pill")!.textContent).toBe("Me");
	});

	// Names repeat (twins, a shared alias); a list keyed on the name threw each_key_duplicate and blanked the screen.
	it("two people with one name draw two pills; one person listed twice (a folded twin) draws one", () => {
		const mikeA = { label: "Mike", color: "", self: false, picked: false, key: "p-a" };
		const mikeB = { ...mikeA, key: "p-b" };
		const c = render(IdentityPill, { who: pete, editors: [mikeA, mikeB, { ...mikeA }] }).container;
		expect([...c.querySelectorAll(".id-mark .id-pill")].map((p) => p.textContent)).toEqual(["Mike", "Mike"]);
		expect(onePerPerson([mikeA, mikeB, { ...mikeA }, { label: "Kim", color: "", self: false, picked: false }]).map((w) => w.key ?? w.label)).toEqual(["p-a", "p-b", "Kim"]);
	});

	it("a name over 12 characters draws its first 12 and an ellipsis, as owner and as editor; a tap reads it whole", async () => {
		const long = { label: "somethingELse", color: "#3a3", self: false, picked: true };
		const c = render(IdentityPill, { who: long, editors: [{ ...long, label: "anotherLongName", key: "p-x" }] }).container;
		const [owner, editor] = [...c.querySelectorAll<HTMLElement>(".id-pill")];
		expect(owner!.textContent).toBe("somethingELs…");
		expect(owner!.title).toBe("somethingELse");
		expect(editor!.closest(".id-mark")).not.toBeNull();
		expect(editor!.textContent).toBe("anotherLongN…");
		await fireEvent.click(owner!);
		expect(owner!.textContent).toBe("somethingELse");
		const twelve = render(IdentityPill, { who: { ...long, label: "twelve_chars" } }).container.querySelector(".id-pill")!;
		expect(twelve.textContent).toBe("twelve_chars");
	});

	it("a nameless author draws nothing: no blank pill, no pen", () => {
		const none = { label: "", color: "", self: false, picked: false };
		expect(render(IdentityPill, { who: none }).container.querySelectorAll(".id-pill, .id-mark")).toHaveLength(0);
		const c = render(IdentityPill, { who: pete, editors: [none] }).container;
		expect([...c.querySelectorAll(".id-pill")].map((p) => p.textContent)).toEqual(["Pete"]);
		expect(c.querySelector(".id-mark")).toBeNull();
	});
});
