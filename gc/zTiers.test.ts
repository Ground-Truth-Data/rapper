// The z ladder in order: hands over the app, scrims over hands, a hand inside
// a modal over its card, a field menu over all of them.
import { describe, expect, it } from "vitest";
import { Z_FIELD_MENU, Z_HANDS, Z_HANDS_IN_MODAL, Z_OVER_HANDS } from "./zTiers";

describe("the z ladder", () => {
	it("climbs hands < scrims < card < hand-in-modal < field menu", () => {
		expect(Z_HANDS).toBe(10500);
		expect(Z_HANDS).toBeGreaterThan(10400);
		expect(Z_OVER_HANDS + 1).toBeLessThan(Z_HANDS_IN_MODAL);
		expect(Z_HANDS_IN_MODAL).toBeLessThan(Z_FIELD_MENU);
	});
});
