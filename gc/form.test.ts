import { expect, it } from "vitest";
import { type Definition, split } from "./form";

it("splits a nested group's entries out even inside a section", () => {
	const d: Definition = {
		elements: [
			{ type: "text", name: "block" },
			{ type: "panel", name: "trees", elements: [{ type: "paneldynamic", name: "tree", templateElements: [{ type: "text", name: "species" }] }] },
		],
	};
	expect(split(d, { block: "B7", tree: [{ species: "Pine" }, {}] })).toEqual({ data: { block: "B7" }, rows: [{ groupKey: "tree", n: 1, data: { species: "Pine" } }] });
});
