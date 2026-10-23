// @vitest-environment happy-dom
// Empty, ticked or part-ticked; with a label it is a tappable "tick everything" row.
import { fireEvent, render } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import TickBox from "./TickBox.svelte";

describe("TickBox", () => {
	it("draws the check only when on, and a labelled row is a button", async () => {
		const off = render(TickBox, { state: "" }).container;
		expect(off.querySelector(".tick--off")).not.toBeNull();
		expect(off.querySelector("button")).toBeNull();
		expect(render(TickBox, { state: "part" }).container.querySelector(".tick--part svg")).toBeNull();
		const onclick = vi.fn();
		const { getByRole } = render(TickBox, { state: "on", label: "All 12", onclick });
		const row = getByRole("button");
		expect(row.textContent).toContain("All 12");
		expect(row.querySelector(".tick--on svg")).not.toBeNull();
		await fireEvent.click(row);
		expect(onclick).toHaveBeenCalledOnce();
	});
});
