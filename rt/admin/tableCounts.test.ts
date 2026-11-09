import { expect, test } from "vitest";
import { setTableCounts, tableCount } from "./tableCounts.svelte";

test("a table nobody counted reads undefined, and only a real 0 reads empty", () => {
	expect(tableCount("tallyTable")).toBeUndefined();
	setTableCounts({ tallyTable: 0, bagTable: 3 });
	expect(tableCount("tallyTable")).toBe(0);
	expect(tableCount("bagTable")).toBe(3);
	expect(tableCount("mapTable")).toBeUndefined();
	setTableCounts({});
	expect(tableCount("bagTable")).toBeUndefined();
});
