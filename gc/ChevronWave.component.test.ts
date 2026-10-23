// @vitest-environment happy-dom
// The chevrons beat on the wall clock while on; the resting glyph steps aside.
import { render } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { describe, expect, it, vi } from "vitest";
import ChevronWave from "./ChevronWave.svelte";

describe("ChevronWave", () => {
	it("phases to the wall clock when on, and keeps the resting glyph", () => {
		vi.spyOn(Date, "now").mockReturnValue(6000 * 7 + 1500);
		const children = createRawSnippet(() => ({ render: () => `<b>›</b>` }));
		const on = render(ChevronWave, { on: true, children }).container.querySelector<HTMLElement>(".chevron-wave")!;
		expect(on.classList.contains("on")).toBe(true);
		expect(on.style.getPropertyValue("--chevron-phase")).toBe("-1500ms");
		expect(on.querySelector(".rest b")).not.toBeNull();
		expect(on.querySelectorAll(".chevron-sign i")).toHaveLength(3);
		const off = render(ChevronWave, {}).container.querySelector<HTMLElement>(".chevron-wave")!;
		expect(off.style.getPropertyValue("--chevron-phase")).toBe("0ms");
		expect(off.querySelector(".rest")).toBeNull();
		vi.restoreAllMocks();
	});
});
