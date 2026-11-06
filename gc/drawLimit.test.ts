import { describe, expect, it } from "vitest";
import { DRAWN_SHAPE_MAX_POINTS, mayAddVertex, overPhotoCap, photoRings } from "./drawLimit";

describe("mayAddVertex", () => {
	it("allows a vertex under the cap and refuses one at it", () => {
		expect(mayAddVertex(DRAWN_SHAPE_MAX_POINTS - 1)).toBe(true);
		expect(mayAddVertex(DRAWN_SHAPE_MAX_POINTS)).toBe(false);
	});
});

describe("overPhotoCap", () => {
	// A square of side `m` metres at the equator; 1 ha = 100 m × 100 m.
	const square = (m: number, x0 = 0): number[][] => {
		const d = m / 111_320;
		return [[x0, 0], [x0 + d, 0], [x0 + d, d], [x0, d], [x0, 0]];
	};
	it("passes 50 ha and refuses 150 ha", () => {
		expect(overPhotoCap({ type: "Polygon", coordinates: [square(707)] })).toBe(false);
		expect(overPhotoCap({ type: "Polygon", coordinates: [square(1225)] })).toBe(true);
	});
	it("reads the outer ring only, so a hole never brings a piece under", () => {
		expect(overPhotoCap({ type: "Polygon", coordinates: [square(1225), square(1000)] })).toBe(true);
	});
	it("holds each part of a MultiPolygon on its own", () => {
		const two60 = { type: "MultiPolygon" as const, coordinates: [[square(775)], [square(775, 1)]] };
		expect(overPhotoCap(two60)).toBe(false);
		expect(overPhotoCap({ ...two60, coordinates: [[square(775)], [square(1225, 1)]] })).toBe(true);
	});
	it("is false for a point or nothing", () => {
		expect(overPhotoCap({ type: "Point", coordinates: [0, 0] })).toBe(false);
		expect(overPhotoCap(null)).toBe(false);
	});
});

describe("photoRings", () => {
	const square = (m: number, x0 = 0): number[][] => {
		const d = m / 111_320;
		return [[x0, 0], [x0 + d, 0], [x0 + d, d], [x0, d], [x0, 0]];
	};
	const small = square(707), big = square(3200, 1), absurd = square(40_000, 2);
	it("gives a small piece close-ups and leaves a big neighbour out of that photo", () => {
		expect(photoRings([small, big])).toEqual({ rings: [small], wide: false });
	});
	it("gives pieces over 100 ha Sentinel on their own", () => {
		expect(photoRings([big])).toEqual({ rings: [big], wide: true });
	});
	it("gives nothing to a piece too big for Sentinel's tile cap", () => {
		expect(photoRings([absurd])).toEqual({ rings: [], wide: true });
	});
});
