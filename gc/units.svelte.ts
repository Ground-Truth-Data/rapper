// Every length and area the maps print goes through here, so the Metric /
// Imperial choice in Account → Settings reaches all of them at once. The host
// app keeps the choice and sets `distance.value`; until it does, the locale decides.
import { getLocale } from "$parent/src/lib/paraglide/runtime";

export type Distance = "metric" | "imperial";

// The regions whose locale measures in the US system; the phone's language tag carries its region.
const IMPERIAL = ["US", "LR", "MM"];

function initial(): Distance {
	if (typeof navigator === "undefined" || !navigator.language) return "metric";
	return IMPERIAL.includes(new Intl.Locale(navigator.language).maximize().region ?? "") ? "imperial" : "metric";
}

let value = $state<Distance>(initial());

export const distance = {
	get value() {
		return value;
	},
	set value(v: Distance) {
		value = v;
	},
};

const FT_PER_M = 3.28084;
const M_PER_MI = 1609.344;
const M2_PER_AC = 4046.8564224;
const AC_PER_MI2 = 640;

const num = (n: number, d = 0) =>
	n.toLocaleString(getLocale(), { minimumFractionDigits: d, maximumFractionDigits: d });
// Fewer decimals as the number grows: 3.42 km, 15.6 km, 156 km · 0.42 ha, 3.1 ha, 156 ha.
const scaled = (n: number) => num(n, n < 10 ? 2 : n < 100 ? 1 : 0);
const scaledArea = (n: number) => num(n, n < 1 ? 2 : n < 10 ? 1 : 0);

/** "847 m" / "3.42 km" or "560 ft" / "1.25 mi". */
export function formatLength(metres: number): string {
	if (value === "imperial") {
		const mi = metres / M_PER_MI;
		return mi < 0.1 ? `${num(Math.round(metres * FT_PER_M))} ft` : `${scaled(mi)} mi`;
	}
	return metres < 1000 ? `${num(Math.round(metres))} m` : `${scaled(metres / 1000)} km`;
}

/** "500 m²" / "3.1 ha" / "1,200 km²" or "5,400 ft²" / "7.7 ac" / "460 mi²". */
export function formatArea(sqMetres: number): string {
	if (value === "imperial") {
		const ac = sqMetres / M2_PER_AC;
		if (ac < 0.1) return `${num(Math.round(sqMetres * FT_PER_M ** 2))} ft²`;
		if (ac >= 100 * AC_PER_MI2) return `${num(Math.round(ac / AC_PER_MI2))} mi²`;
		return `${scaledArea(ac)} ac`;
	}
	const ha = sqMetres / 10_000;
	if (ha < 0.1) return `${num(Math.round(sqMetres))} m²`;
	if (ha >= 100_000) return `${num(Math.round(ha / 100))} km²`;
	return `${scaledArea(ha)} ha`;
}

/** The unit a far-off thing is counted in, whole: km, or mi in imperial. */
export const longUnit = () => (value === "imperial" ? { name: "mi", metres: M_PER_MI } : { name: "km", metres: 1000 });

/** The scale bar's unit: metres, or feet in imperial — miles take over past one. */
export function scaleUnit(): { perMetre: number; small: string; big: string; bigIs: number } {
	return value === "imperial"
		? { perMetre: FT_PER_M, small: "ft", big: "mi", bigIs: 5280 }
		: { perMetre: 1, small: "m", big: "km", bigIs: 1000 };
}
