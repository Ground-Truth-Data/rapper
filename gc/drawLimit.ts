// The draw tool's vertex cap. Only drawing adds vertices — an edit moves
// them — so an imported shape, however detailed, is never held to it.

import area from "@turf/area";
import type { Geometry } from "geojson";

export const DRAWN_SHAPE_MAX_POINTS = 50;

/** Shown on the shape's total while it holds the cap. */
export const DRAW_LIMIT_NOTE = `${DRAWN_SHAPE_MAX_POINTS} points is the limit for a drawn shape`;

export const mayAddVertex = (held: number): boolean => held < DRAWN_SHAPE_MAX_POINTS;

/** A piece past this gets no photos, quietly. It limits the download only, never the planter's drawing. */
export const PIECE_MAX_HA = 100;

/** True when any one part's outer ring (holes ignored, as the photo cover reads it) is over PIECE_MAX_HA. */
export function overPhotoCap(geom: Geometry | null | undefined): boolean {
	const parts = geom?.type === "Polygon" ? [geom.coordinates] : geom?.type === "MultiPolygon" ? geom.coordinates : [];
	return parts.some(([outer]) => outer && area({ type: "Polygon", coordinates: [outer] }) / 10_000 > PIECE_MAX_HA);
}
