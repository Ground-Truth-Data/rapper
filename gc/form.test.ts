import { expect, it } from "vitest";
import { type Definition, FIX, split } from "./form";

const d: Definition = {
	elements: [
		{ type: "text", name: "block" },
		{ type: "panel", name: "trees", elements: [{ type: "paneldynamic", name: "tree", templateElements: [{ type: "text", name: "species" }] }] },
	],
};

it("splits a nested group's entries out even inside a section", () => {
	expect(split(d, { block: "B7", tree: [{ species: "Pine" }, {}] })).toEqual({ data: { block: "B7" }, fix: null, rows: [{ groupKey: "tree", n: 1, data: { species: "Pine" }, fix: null }] });
});

it("lifts each fix out of the data into its own columns; an entry holding only a fix is still empty", () => {
	const at = (lat: number) => ({ lat, lng: -120, accuracyM: 5 });
	expect(split(d, { block: "B7", [FIX]: at(55), tree: [{ species: "Pine", [FIX]: at(56) }, { [FIX]: at(57) }] })).toEqual({
		data: { block: "B7" },
		fix: at(55),
		rows: [{ groupKey: "tree", n: 1, data: { species: "Pine" }, fix: at(56) }],
	});
});
