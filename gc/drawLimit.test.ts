import { describe, expect, it } from "vitest";
import { DRAWN_SHAPE_MAX_POINTS, mayAddVertex } from "./drawLimit";

describe("mayAddVertex", () => {
	it("allows a vertex under the cap and refuses one at it", () => {
		expect(mayAddVertex(DRAWN_SHAPE_MAX_POINTS - 1)).toBe(true);
		expect(mayAddVertex(DRAWN_SHAPE_MAX_POINTS)).toBe(false);
	});
});
