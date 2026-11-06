// The draw tool's vertex cap. Only drawing adds vertices — an edit moves
// them — so an imported shape, however detailed, is never held to it.

import area from "@turf/area";
import type { Geometry, Position } from "geojson";

export const DRAWN_SHAPE_MAX_POINTS = 50;

/** Shown on the shape's total while it holds the cap. */
export const DRAW_LIMIT_NOTE = `${DRAWN_SHAPE_MAX_POINTS} points is the limit for a drawn shape`;

export const mayAddVertex = (held: number): boolean => held < DRAWN_SHAPE_MAX_POINTS;

/** A piece past this gets Sentinel instead of close-up photos, quietly. It limits the download only, never the planter's drawing. */
export const PIECE_MAX_HA = 100;
/** Past this, no photos at all: Sentinel's z14 cover of a bigger piece would trip the download breaker's 550-tile bake cap. */
export const WIDE_MAX_HA = 100_000;

const outerHa = (outer: Position[]): number => area({ type: "Polygon", coordinates: [outer] }) / 10_000;

/** True when any one part's outer ring (holes ignored, as the photo cover reads it) is over PIECE_MAX_HA. */
export function overPhotoCap(geom: Geometry | null | undefined): boolean {
	const parts = geom?.type === "Polygon" ? [geom.coordinates] : geom?.type === "MultiPolygon" ? geom.coordinates : [];
	return parts.some(([outer]) => outer && outerHa(outer) > PIECE_MAX_HA);
}

/** The outer rings one photo holds, all from one source: close-ups when any ring is small enough, else the Sentinel-sized ones. */
export function photoRings<R extends Position[]>(rings: R[]): { rings: R[]; wide: boolean } {
	const close = rings.filter((r) => outerHa(r) <= PIECE_MAX_HA);
	return close.length ? { rings: close, wide: false } : { rings: rings.filter((r) => outerHa(r) <= WIDE_MAX_HA), wide: true };
}
