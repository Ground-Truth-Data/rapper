// Snapping a dragged point onto the corners and edges of saved pieces, in screen pixels so zooming in is how you get finer control.

import type { Feature, MultiPolygon, Polygon, Position } from "geojson";
import { BORDER_REACH_PX } from "./drawDials";

export type Lnglat = [number, number];
export type SnapKind = "corner" | "edge" | null;
type Px = { x: number; y: number };
/** A ring projected to screen; `ll` keeps the stored coordinate so a corner snap is exact, not an unproject round-trip. */
export type SnapRing = Array<Px & { ll: Lnglat }>;
export type SnapRings = SnapRing[];

type Projector = {
    project(ll: { lng: number; lat: number }): Px;
    unproject(p: [number, number]): { lng: number; lat: number };
};

/** Every ring of every polygon (holes and MultiPolygon parts too), projected. Built once per drag; the map cannot move mid-drag. */
export function snapRings(map: Projector, features: Feature[], skipIdx = -1): SnapRings {
    const out: SnapRings = [];
    for (const [i, f] of features.entries()) {
        if (i === skipIdx) continue;
        const g = f.geometry;
        const polys: Position[][][] =
            g?.type === "Polygon" ? [(g as Polygon).coordinates]
            : g?.type === "MultiPolygon" ? (g as MultiPolygon).coordinates
            : [];
        for (const poly of polys) for (const ring of poly) {
            out.push(ring.map(([lng = NaN, lat = NaN]) => ({ ...map.project({ lng, lat }), ll: [lng, lat] as Lnglat })));
        }
    }
    return out;
}

/** Nearest corner within BORDER_REACH_PX wins; else the nearest point on an edge within it; else the input unchanged.
 *  `held` is the last call's kind: that kind lets go only past twice the reach, so a wobbling finger doesn't flicker on and off.
 *  `reach` replaces both radii: a finger landing, not a drag. */
export function snapLngLat(map: Projector, ll: Lnglat, rings: SnapRings, held: SnapKind = null, reach?: number): { ll: Lnglat; kind: SnapKind } {
    if (!rings.length) return { ll, kind: null };
    const cornerPx = reach ?? (held === "corner" ? 2 * BORDER_REACH_PX : BORDER_REACH_PX);
    const edgePx = reach ?? (held ? 2 * BORDER_REACH_PX : BORDER_REACH_PX);
    const p = map.project({ lng: ll[0], lat: ll[1] });
    let best: { d2: number; ll: Lnglat } | null = null;
    for (const ring of rings) for (const c of ring) {
        const d2 = (c.x - p.x) ** 2 + (c.y - p.y) ** 2;
        if (d2 <= cornerPx ** 2 && (!best || d2 < best.d2)) best = { d2, ll: c.ll };
    }
    if (best) return { ll: best.ll, kind: "corner" };
    let bestPx: { d2: number; x: number; y: number } | null = null;
    for (const ring of rings) for (let i = 0; i + 1 < ring.length; i++) {
        const a = ring[i]!, b = ring[i + 1]!;
        const dx = b.x - a.x, dy = b.y - a.y;
        const len2 = dx * dx + dy * dy;
        const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
        const x = a.x + t * dx, y = a.y + t * dy;
        const d2 = (x - p.x) ** 2 + (y - p.y) ** 2;
        if (d2 <= edgePx ** 2 && (!bestPx || d2 < bestPx.d2)) bestPx = { d2, x, y };
    }
    if (!bestPx) return { ll, kind: null };
    const u = map.unproject([bestPx.x, bestPx.y]);
    return { ll: [u.lng, u.lat], kind: "edge" };
}
