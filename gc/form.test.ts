import { expect, it } from "vitest";
import { type Definition, FIX, follow, split } from "./form";

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

it("an answer follows an edit: a renamed question keeps its answer, a new one is blank, a deleted one is dropped", () => {
	const at = { lat: 55, lng: -120, accuracyM: 5 };
	const edited: Definition = {
		elements: [
			{ type: "text", name: "block", title: "Block number" },
			{ type: "comment", name: "notes" },
			{ type: "panel", name: "trees", elements: [{ type: "paneldynamic", name: "tree", templateElements: [{ type: "text", name: "species", title: "Tree species" }] }] },
		],
	};
	expect(follow(edited, { block: "B7", height: 12, [FIX]: at, tree: [{ species: "Pine", age: 3 }] })).toEqual({ block: "B7", [FIX]: at, tree: [{ species: "Pine" }] });
});
