import { expect, test } from "vitest";
import { nextSort, sortRows } from "./sortRows";

test("a new column sorts descending first", () => {
	expect(nextSort({ col: "", asc: false }, "trees")).toEqual({ col: "trees", asc: false });
	expect(nextSort({ col: "date", asc: true }, "trees")).toEqual({ col: "trees", asc: false });
});

test("clicking the sorted column cycles descending → ascending → off → descending", () => {
	let s = nextSort({ col: "", asc: false }, "trees");
	s = nextSort(s, "trees");
	expect(s).toEqual({ col: "trees", asc: true });
	s = nextSort(s, "trees");
	expect(s.col).toBe("");
	expect(nextSort(s, "trees")).toEqual({ col: "trees", asc: false });
});

test("off returns the rows in their own order", () => {
	const rows = [{ n: 2 }, { n: 1 }, { n: 3 }];
	expect(sortRows(rows, { col: "", asc: false })).toBe(rows);
});
