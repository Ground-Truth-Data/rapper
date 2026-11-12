// Every printed length and area follows the Metric / Imperial choice, with
// fewer decimals as the number grows.
import { afterEach, describe, expect, it, vi } from "vitest";
import { areaLabel, areaOf, areaText, areaUnit, rateText, distance, formatArea, formatLength, haOf, longUnit, perArea, perHaOf, phoneCountry, scaleUnit } from "./units.svelte";

vi.mock("$parent/src/lib/paraglide/runtime", () => ({ getLocale: () => "en" }));
afterEach(() => {
	distance.value = "metric";
	areaUnit.value = "ha";
});

describe("units", () => {
	it("metric: m then km, m² then ha then km²", () => {
		distance.value = "metric";
		expect(formatLength(847.4)).toBe("847 m");
		expect(formatLength(3420)).toBe("3.42 km");
		expect(formatLength(156_000)).toBe("156 km");
		expect(formatArea(500)).toBe("500 m²");
		expect(formatArea(31_000)).toBe("3.1 ha");
		expect(formatArea(4200)).toBe("0.42 ha");
		expect(formatArea(1.2e9)).toBe("1,200 km²");
		expect(longUnit()).toEqual({ name: "km", metres: 1000 });
		expect(scaleUnit()).toMatchObject({ small: "m", big: "km", perMetre: 1 });
	});

	it("imperial: ft then mi, ft² then ac then mi²", () => {
		distance.value = "imperial";
		areaUnit.value = "ac";
		expect(distance.value).toBe("imperial");
		expect(formatLength(100)).toBe("328 ft");
		expect(formatLength(2011.68)).toBe("1.25 mi");
		expect(formatArea(300)).toBe("3,229 ft²");
		expect(formatArea(31_160)).toBe("7.7 ac");
		expect(formatArea(1.2e9)).toBe("463 mi²");
		expect(longUnit().name).toBe("mi");
		expect(scaleUnit()).toMatchObject({ small: "ft", big: "mi", bigIs: 5280 });
	});

	it("the area unit converts display and typed input; hectares stay stored", () => {
		expect(areaUnit.value).toBe("ha");
		expect([areaLabel(), areaOf(10), haOf(10), perArea(1200), perHaOf(1200)]).toEqual(["ha", 10, 10, 1200, 1200]);
		areaUnit.value = "ac";
		expect(areaLabel()).toBe("ac");
		expect(areaOf(10)).toBeCloseTo(24.71);
		expect(haOf(24.71)).toBeCloseTo(10);
		expect(perArea(1200)).toBe(486);
		expect(perHaOf(486)).toBe(1201);
		for (const typed of [1, 12, 400, 486, 999]) expect(perArea(perHaOf(typed))).toBe(typed);
		expect(formatArea(31_160)).toBe("7.7 ac");
		expect([areaText(1029), areaText(2), rateText(1200)]).toEqual(["2,543", "4.9", "486"]);
		areaUnit.value = "ha";
		expect([areaText(1029), areaText(2), rateText(1200)]).toEqual(["1,029", "2.0", "1,200"]);
	});

	it("the phone's country comes from its time zone, and is remembered", () => {
		const c = phoneCountry();
		expect(typeof c).toBe("string");
		expect(phoneCountry()).toBe(c);
	});
});
