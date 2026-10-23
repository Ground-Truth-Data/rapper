// @vitest-environment happy-dom
// The Export button: its label and upload glyph, gold while on, and a tap reaches the owner.
import { fireEvent, render } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import ExportToggle from "./ExportToggle.svelte";

describe("ExportToggle", () => {
	it("shows its label, is gold only while on, and passes the tap on", async () => {
		const onclick = vi.fn();
		const { getByRole, rerender } = render(ExportToggle, { label: "Export", onclick });
		const btn = getByRole("button");
		expect(btn.textContent).toContain("Export");
		expect(btn.querySelector("svg")).not.toBeNull();
		expect(btn.classList.contains("on")).toBe(false);
		await rerender({ label: "Export", onclick, on: true });
		expect(btn.classList.contains("on")).toBe(true);
		await fireEvent.click(btn);
		expect(onclick).toHaveBeenCalledTimes(1);
	});
});
