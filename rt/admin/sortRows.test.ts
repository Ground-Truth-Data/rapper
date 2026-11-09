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

const col = (rows: Record<string, unknown>[], c: string) => rows.map((r) => r[c]);

test("numbers sort as numbers, either way, and the rows given are left as they were", () => {
	const rows = [{ n: 10 }, { n: 9 }, { n: 100 }];
	expect(col(sortRows(rows, { col: "n", asc: true }), "n")).toEqual([9, 10, 100]);
	expect(col(sortRows(rows, { col: "n", asc: false }), "n")).toEqual([100, 10, 9]);
	expect(col(rows, "n")).toEqual([10, 9, 100]);
});

test("blanks sit last whichever way the column sorts", () => {
	const rows = [{ n: null }, { n: 2 }, { n: "" }, { n: 1 }, {}];
	expect(col(sortRows(rows, { col: "n", asc: true }), "n").slice(0, 2)).toEqual([1, 2]);
	expect(col(sortRows(rows, { col: "n", asc: false }), "n").slice(0, 2)).toEqual([2, 1]);
});

test("times sort by the moment, not the text, even when written two ways", () => {
	const rows = [{ t: "2026-11-09T10:00:00-07:00" }, { t: "2026-11-09 12:00:00Z" }, { t: "2026-11-09T11:00:00Z" }];
	expect(col(sortRows(rows, { col: "t", asc: true }), "t")).toEqual(["2026-11-09T11:00:00Z", "2026-11-09 12:00:00Z", "2026-11-09T10:00:00-07:00"]);
});

test("text sorts the way people count: block 9 before block 10", () => {
	const rows = [{ b: "Block 10" }, { b: "block 9" }, { b: "Block 2" }];
	expect(col(sortRows(rows, { col: "b", asc: true }), "b")).toEqual(["Block 2", "block 9", "Block 10"]);
});

test("a picker sorts by what it reads off each row", () => {
	const rows = [{ v: { trees: 5 } }, { v: { trees: 50 } }];
	expect(sortRows(rows, { col: "trees", asc: false }, (r, c) => r.v[c as "trees"])).toEqual([{ v: { trees: 50 } }, { v: { trees: 5 } }]);
});
