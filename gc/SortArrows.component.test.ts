// @vitest-environment happy-dom
// Both arrows gold until a column sorts; then only the winning one.
import { render } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import SortArrows from "./SortArrows.svelte";

describe("SortArrows", () => {
	it("marks ascending, descending, or neither", () => {
		const cls = (dir: 1 | -1 | 0) => render(SortArrows, { dir }).container.querySelector("svg")!.classList;
		expect([...cls(0)]).not.toContain("asc");
		expect(cls(1).contains("asc")).toBe(true);
		expect(cls(-1).contains("desc")).toBe(true);
	});
});
