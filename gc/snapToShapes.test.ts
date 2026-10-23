import area from "@turf/area";
import type { Feature, Polygon } from "geojson";
import { describe, expect, it } from "vitest";
import { BORDER_REACH_PX as R } from "./drawDials";
import { type Lnglat, snapLngLat, snapRings } from "./snapToShapes";

// Identity projection: lng/lat ARE screen px, so thresholds read directly.
const flat = {
	project: ({ lng, lat }: { lng: number; lat: number }) => ({ x: lng, y: lat }),
	unproject: ([x, y]: [number, number]) => ({ lng: x, lat: y }),
};
const poly = (ring: Lnglat[], props = {}): Feature<Polygon> => ({
	type: "Feature",
	properties: props,
	geometry: { type: "Polygon", coordinates: [[...ring, ring[0]!]] },
});
const SQUARE = poly([[0, 0], [100, 0], [100, 100], [0, 100]]);
const rings = snapRings(flat, [SQUARE]);
const snap = (ll: Lnglat) => snapLngLat(flat, ll, rings);

describe("snapLngLat", () => {
	it("snaps to a corner inside the corner radius and not outside it", () => {
		expect(snap([R - 0.1, 0.4])).toEqual({ ll: [0, 0], kind: "corner" });
		expect(snap([R + 0.1, 0]).kind).toBe("edge");
		expect(snap([R + 0.1, R + 0.1]).kind).toBeNull();
	});

	it("corner beats edge even when the edge is nearer", () => {
		expect(snap([7, 1]).kind).toBe("corner");
	});

	it("snaps onto an edge inside the edge radius and not outside it", () => {
		expect(snap([50, R - 0.1])).toEqual({ ll: [50, 0], kind: "edge" });
		expect(snap([50, R + 0.1])).toEqual({ ll: [50, R + 0.1], kind: null });
		expect(snap([50, 103]).ll).toEqual([50, 100]);
	});

	it("a held snap lets go only past twice its radius, so a wobbling finger stays on the track", () => {
		expect(snapLngLat(flat, [50, R + 2], rings, "edge")).toEqual({ ll: [50, 0], kind: "edge" });
		expect(snapLngLat(flat, [50, 2 * R + 0.1], rings, "edge").kind).toBeNull();
		expect(snapLngLat(flat, [R + 2, 3], rings, "corner").kind).toBe("corner");
		expect(snapLngLat(flat, [R + 2, 3], rings, "edge").kind).toBe("edge");
	});

	it("a reach replaces both radii, so a landing finger snaps from further out", () => {
		expect(snapLngLat(flat, [50, 20], rings, null, 22)).toEqual({ ll: [50, 0], kind: "edge" });
		expect(snapLngLat(flat, [15, 15], rings, null, 22).kind).toBe("corner");
		expect(snapLngLat(flat, [50, 23], rings, null, 22).kind).toBeNull();
	});

	it("returns the stored corner coordinate, never a round-trip", () => {
		const odd = poly([[0.1234567890123, 0.9876543210987], [100, 0], [100, 100]]);
		const r = snapRings({ ...flat, unproject: () => ({ lng: 99, lat: 99 }) }, [odd]);
		expect(snapLngLat(flat, [1, 1], r).ll).toEqual(odd.geometry.coordinates[0]![0]);
	});

	it("leaves out the shape being edited and includes MultiPolygon parts and holes", () => {
		expect(snapLngLat(flat, [1, 1], snapRings(flat, [SQUARE], 0)).kind).toBeNull();
		const multi: Feature = {
			type: "Feature",
			properties: {},
			geometry: {
				type: "MultiPolygon",
				coordinates: [
					[[[0, 0], [100, 0], [100, 100], [0, 100], [0, 0]], [[40, 40], [60, 40], [60, 60], [40, 60], [40, 40]]],
					[[[200, 200], [300, 200], [300, 300], [200, 300], [200, 200]]],
				],
			},
		};
		const r = snapRings(flat, [multi]);
		expect(snapLngLat(flat, [42, 41], r).ll).toEqual([40, 40]);
		expect(snapLngLat(flat, [250, 203], r).ll).toEqual([250, 200]);
	});

	it("two pieces cut to the block's corners partition its area exactly", () => {
		const block = poly([[-119.9, 49.27], [-119.89, 49.27], [-119.89, 49.28], [-119.9, 49.28]]);
		const merc = {
			project: ({ lng, lat }: { lng: number; lat: number }) => ({ x: lng * 1e5, y: lat * 1e5 }),
			unproject: ([x, y]: [number, number]) => ({ lng: x / 1e5, lat: y / 1e5 }),
		};
		const r = snapRings(merc, [block]);
		const at = (ll: Lnglat) => snapLngLat(merc, ll, r).ll;
		// A cut across the middle: both pieces' outer corners land ON the block corners, the cut ends ON its edges.
		const cutW = at([-119.9 + 0.00002, 49.275]);
		const cutE = at([-119.89 - 0.00002, 49.275]);
		const south = poly([at([-119.9 + 0.00003, 49.27 + 0.00003]), at([-119.89, 49.27]), cutE, cutW]);
		const north = poly([cutW, cutE, at([-119.89, 49.28]), at([-119.9 - 0.00003, 49.28])]);
		expect(cutW[0]).toBeCloseTo(-119.9, 12);
		expect(cutE[0]).toBeCloseTo(-119.89, 12);
		expect(Math.abs(area(south) + area(north) - area(block)) / area(block)).toBeLessThan(1e-9);
	});
});
