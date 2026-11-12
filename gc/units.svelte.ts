// Every length and area the maps print goes through here, so the Metric /
// Imperial choice in Account → Settings reaches all of them at once. The host
// app keeps the choice and sets `distance.value`; until it does, the locale decides.
import { getLocale } from "$parent/src/lib/paraglide/runtime";

export type Distance = "metric" | "imperial";

const IMPERIAL = ["US", "LR", "MM"];

const zonesOf = (region: string): string[] | undefined => {
	const l = new Intl.Locale(`und-${region}`) as Intl.Locale & { getTimeZones?: () => string[]; timeZones?: string[] };
	return l.getTimeZones?.() ?? l.timeZones;
};

let country: string | undefined;

/** Where the phone is: its time zone's country. The language tag is a fallback
 *  only — browsers say en-US to most English speakers, wherever they are. */
export function phoneCountry(): string {
	if (country !== undefined) return country;
	if (typeof navigator === "undefined") return "";
	const spoken = navigator.language ? (new Intl.Locale(navigator.language).maximize().region ?? "") : "";
	const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
	if (spoken && zonesOf(spoken)?.includes(tz)) return (country = spoken);
	const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
	for (const a of A) for (const b of A) if (zonesOf(a + b)?.includes(tz)) return (country = a + b);
	return (country = spoken);
}

let value = $state<Distance>(IMPERIAL.includes(phoneCountry()) ? "imperial" : "metric");

export const distance = {
	get value() {
		return value;
	},
	set value(v: Distance) {
		value = v;
	},
};

export type AreaUnit = "ha" | "ac";

// Areas and per-area rates are stored in hectares; only what is shown or typed converts.
let area = $state<AreaUnit>("ha");

export const areaUnit = {
	get value() {
		return area;
	},
	set value(v: AreaUnit) {
		area = v;
	},
};

const AC_PER_HA = 2.471;

export const areaLabel = (): AreaUnit => area;
export const areaOf = (ha: number) => (area === "ac" ? ha * AC_PER_HA : ha);
export const haOf = (typed: number) => (area === "ac" ? typed / AC_PER_HA : typed);
/** A per-hectare count (trees/ha), per the area unit, whole. */
export const perArea = (perHa: number) => (area === "ac" ? Math.round(perHa / AC_PER_HA) : perHa);
export const perHaOf = (typed: number) => (area === "ac" ? Math.round(typed * AC_PER_HA) : typed);

/** A block's hectares in the area unit, the number only: "3.1", "1,029". */
export const areaText = (ha: number) => {
	const a = areaOf(ha);
	return a < 10 ? num(a, 1) : num(Math.round(a));
};
/** Trees/ha in the area unit, the number only: "1,200", or "486" per acre. */
export const rateText = (perHa: number) => num(perArea(perHa));

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
	const ac = sqMetres / M2_PER_AC;
	const ha = sqMetres / 10_000;
	if (value === "imperial") {
		if (ac < 0.1) return `${num(Math.round(sqMetres * FT_PER_M ** 2))} ft²`;
		if (ac >= 100 * AC_PER_MI2) return `${num(Math.round(ac / AC_PER_MI2))} mi²`;
	} else {
		if (ha < 0.1) return `${num(Math.round(sqMetres))} m²`;
		if (ha >= 100_000) return `${num(Math.round(ha / 100))} km²`;
	}
	return area === "ac" ? `${scaledArea(ac)} ac` : `${scaledArea(ha)} ha`;
}

/** The unit a far-off thing is counted in, whole: km, or mi in imperial. */
export const longUnit = () => (value === "imperial" ? { name: "mi", metres: M_PER_MI } : { name: "km", metres: 1000 });

/** The scale bar's unit: metres, or feet in imperial — miles take over past one. */
export function scaleUnit(): { perMetre: number; small: string; big: string; bigIs: number } {
	return value === "imperial"
		? { perMetre: FT_PER_M, small: "ft", big: "mi", bigIs: 5280 }
		: { perMetre: 1, small: "m", big: "km", bigIs: 1000 };
}
