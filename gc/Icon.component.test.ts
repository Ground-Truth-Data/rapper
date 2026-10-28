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

	it("every icon has a body and a stroke width, zero for a filled mark, or a mask image", () => {
		for (const def of Object.values(ICONS)) {
			if ("mask" in def) {
				expect(def.mask.length).toBeGreaterThan(0);
				continue;
			}
			expect(def.body.length).toBeGreaterThan(0);
			expect(def.sw).toBeGreaterThanOrEqual(0);
		}
	});

	it("draws hand-drawn art as a currentColor mask", () => {
		const span = render(Icon, { name: "pen", size: 14 }).container.querySelector("span")!;
		expect(span.style.width).toBe("14px");
		expect(span.style.background.toLowerCase()).toBe("currentcolor");
		expect(span.getAttribute("style")).toContain("pen_edit_icon_white.webp");
	});
});
