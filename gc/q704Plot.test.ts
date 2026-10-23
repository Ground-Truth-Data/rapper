// A 3.99 m plot is 1/20 ha; M at 1800 sph is 9 spots, and a row's own frozen
// M beats the header's, an override may only lower it.
import { describe, expect, it } from "vitest";
import { DEFAULT_DENSITY, PLOT_RADIUS, derivePlot, maxSpots, plotArea, plotMultiplier } from "./q704Plot";

describe("plot arithmetic", () => {
	it("a 3.99 m plot is about 50 m², a ×200 multiplier, 9 spots at 1800 sph", () => {
		expect(plotArea(PLOT_RADIUS)).toBeCloseTo(50.01, 1);
		expect(plotMultiplier(PLOT_RADIUS)).toBeCloseTo(199.95, 1);
		expect(maxSpots(DEFAULT_DENSITY, PLOT_RADIUS)).toBe(9);
	});

	it("splits planted into satisfactory, faults and excess", () => {
		expect(derivePlot({ planted: 11, plantableSpotsOverrideQty: null, faults: ["J"] }, 9)).toEqual({ spots: 9, excess: 2, unsat: 1, satisfactory: 8, valid: true });
		expect(derivePlot({ planted: null, plantableSpotsOverrideQty: null, faults: [] }, 9)).toMatchObject({ satisfactory: 0, valid: true });
	});

	it("a frozen M beats the header, an override lowers spots, and raising past the cap is invalid", () => {
		expect(derivePlot({ planted: 6, plantableSpotsOverrideQty: null, plantableSpotsQty: 7, faults: [] }, 9).spots).toBe(7);
		expect(derivePlot({ planted: 6, plantableSpotsOverrideQty: 4, faults: [] }, 9)).toMatchObject({ spots: 4, excess: 2, valid: true });
		expect(derivePlot({ planted: 6, plantableSpotsOverrideQty: 12, faults: [] }, 9).valid).toBe(false);
		expect(derivePlot({ planted: 1, plantableSpotsOverrideQty: null, faults: ["a", "b"] }, 9).valid).toBe(false);
	});
});
