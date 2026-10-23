// Every printed length and area follows the Metric / Imperial choice, with
// fewer decimals as the number grows.
import { afterEach, describe, expect, it, vi } from "vitest";
import { distance, formatArea, formatLength, longUnit, phoneCountry, scaleUnit } from "./units.svelte";

vi.mock("$parent/src/lib/paraglide/runtime", () => ({ getLocale: () => "en" }));
afterEach(() => void (distance.value = "metric"));

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
		expect(distance.value).toBe("imperial");
		expect(formatLength(100)).toBe("328 ft");
		expect(formatLength(2011.68)).toBe("1.25 mi");
		expect(formatArea(300)).toBe("3,229 ft²");
		expect(formatArea(31_160)).toBe("7.7 ac");
		expect(formatArea(1.2e9)).toBe("463 mi²");
		expect(longUnit().name).toBe("mi");
		expect(scaleUnit()).toMatchObject({ small: "ft", big: "mi", bigIs: 5280 });
	});

	it("the phone's country comes from its time zone, and is remembered", () => {
		const c = phoneCountry();
		expect(typeof c).toBe("string");
		expect(phoneCountry()).toBe(c);
	});
});
