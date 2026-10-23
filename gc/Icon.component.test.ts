// @vitest-environment happy-dom
// A named glyph at the asked size; decorative unless it is given a label.
import { render } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Icon from "./Icon.svelte";
import { ICONS } from "./iconPaths";

describe("Icon", () => {
	it("draws the named glyph, hidden from readers, at its own stroke unless overridden", () => {
		const svg = render(Icon, { name: "check", size: 16 }).container.querySelector("svg")!;
		expect(svg.getAttribute("width")).toBe("16");
		expect(svg.getAttribute("aria-hidden")).toBe("true");
		expect(svg.getAttribute("stroke-width")).toBe(String(ICONS.check.sw));
		expect(svg.innerHTML).toContain(ICONS.check.body.slice(0, 10));
		const labelled = render(Icon, { name: "upload", ariaLabel: "Export", stroke: 3 }).container.querySelector("svg")!;
		expect(labelled.getAttribute("role")).toBe("img");
		expect(labelled.getAttribute("aria-label")).toBe("Export");
		expect(labelled.getAttribute("stroke-width")).toBe("3");
	});

	it("every icon has a body and a stroke width, zero for a filled mark", () => {
		for (const def of Object.values(ICONS)) {
			expect(def.body.length).toBeGreaterThan(0);
			expect(def.sw).toBeGreaterThanOrEqual(0);
		}
	});
});
