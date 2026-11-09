// @vitest-environment happy-dom
/** Table rows out as JSON, CSV and Markdown: every cell lands in its own column, nothing reads "null". */

import { afterEach, expect, test, vi } from "vitest";
import { copyText, downloadText, rowsToCsv, rowsToJson, rowsToMarkdown } from "./exportRows";

afterEach(() => vi.restoreAllMocks());

const circular: Record<string, unknown> = {};
circular.self = circular;

test("CSV: a comma, quote, newline or return stays inside its own field; blanks are empty, objects are JSON", () => {
	const columns = ["name", "note", "n", "meta"];
	const rows = [
		{ name: "Creek, North", note: 'said "hi"', n: 0, meta: { a: 1 } },
		{ name: "two\nlines", note: "cr\rhere", n: null, meta: undefined },
	];
	expect(rowsToCsv(columns, rows)).toBe(
		['name,note,n,meta', '"Creek, North","said ""hi""",0,"{""a"":1}"', '"two\nlines","cr\rhere",,'].join("\n"),
	);
});

test("CSV: a header with a comma is quoted, and no rows is the header alone", () => {
	expect(rowsToCsv(["a,b", "c"], [])).toBe('"a,b",c');
});

test("CSV: a blank row is still a row", () => {
	expect(rowsToCsv(["a"], [{ a: null }]).split("\n")).toEqual(["a", ""]);
});

test("a cell JSON cannot write still exports, as its text", () => {
	expect(rowsToCsv(["x"], [{ x: circular }])).toBe("x\n[object Object]");
});

test("JSON: in the screen's column order, a missing cell null, columns not on screen left out", () => {
	const out = JSON.parse(rowsToJson(["b", "a"], [{ a: 1, hidden: "x" }]));
	expect(out).toEqual([{ b: null, a: 1 }]);
	expect(Object.keys(out[0])).toEqual(["b", "a"]);
});

test("Markdown: a pipe or newline in a cell never breaks the table", () => {
	expect(rowsToMarkdown(["a", "b"], [{ a: "x|y", b: "one\r\ntwo" }, { a: null, b: 3 }])).toBe(
		["| a | b |", "| --- | --- |", "| x\\|y | one two |", "|  | 3 |"].join("\n"),
	);
	expect(rowsToMarkdown(["a"], [])).toBe("| a |\n| --- |");
});

test("copy says true only when the clipboard took the text", async () => {
	const writeText = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("denied"));
	Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
	const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
	expect(await copyText("a")).toBe(true);
	expect(await copyText("b")).toBe(false);
	expect(warn).toHaveBeenCalledOnce();
});

test("download hands the browser one file of the text, named, then lets the link and the blob go", async () => {
	const made: Blob[] = [];
	vi.spyOn(URL, "createObjectURL").mockImplementation((b) => (made.push(b as Blob), "blob:x"));
	const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
	const clicked: { href: string; download: string }[] = [];
	vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
		clicked.push({ href: this.href, download: this.download });
	});
	downloadText("rows.csv", "a,b", "text/csv");
	expect(clicked).toEqual([{ href: "blob:x", download: "rows.csv" }]);
	expect(await made[0].text()).toBe("a,b");
	expect(made[0].type).toBe("text/csv");
	expect(document.querySelector("a")).toBeNull();
	await new Promise((r) => setTimeout(r, 0));
	expect(revoke).toHaveBeenCalledWith("blob:x");
});
