// Branded, validated [lng, lat] tuple — unforgeable except via the toCoord*
// factories, which reject NaN/Infinity/out-of-range input. Mapbox crashes
// deep in its render loop (`unproject`) on a NaN coordinate with a stack
// that points at Mapbox internals, not the caller — validating at the
// boundary (GPS, geojson, clicks, persisted data) makes a Coord safe by
// construction. Internal pure-geometry code that only ever sees
// already-validated Coords doesn't need to re-validate.

declare const CoordBrand: unique symbol;

export type Coord = readonly [number, number] & {
    readonly [CoordBrand]: true;
};

// Coords outside these ranges are almost certainly a bug (swapped lng/lat,
// unconverted radians) and Mapbox will wrap weirdly or produce NaN.
const LNG_MIN = -180;
const LNG_MAX = 180;
const LAT_MIN = -90;
const LAT_MAX = 90;

function inRange(lng: number, lat: number): boolean {
    return lng >= LNG_MIN && lng <= LNG_MAX && lat >= LAT_MIN && lat <= LAT_MAX;
}

export function toCoord(lng: unknown, lat: unknown): Coord | null {
    if (typeof lng !== "number" || typeof lat !== "number") return null;
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
    if (!inRange(lng, lat)) return null;
    return [lng, lat] as unknown as Coord;
}

export function toCoordFromLngLat(
    p: { lng?: unknown; lat?: unknown } | null | undefined,
): Coord | null {
    if (!p) return null;
    return toCoord(p.lng, p.lat);
}

export function toCoordFromArray(a: unknown): Coord | null {
    if (!Array.isArray(a)) return null;
    return toCoord(a[0], a[1]);
}

export function toCoordFromFeature(
    f: { geometry?: { coordinates?: unknown } } | null | undefined,
): Coord | null {
    if (!f) return null;
    return toCoordFromArray(f.geometry?.coordinates);
}

// For values already shaped as a tuple but not provably validated (e.g.
// crossing an any/unknown boundary). Prefer toCoord/toCoordFromArray for new code.
export function isCoord(c: unknown): c is Coord {
    if (!Array.isArray(c) || c.length < 2) return false;
    const [lng, lat] = c;
    return (
        typeof lng === "number" &&
        typeof lat === "number" &&
        Number.isFinite(lng) &&
        Number.isFinite(lat) &&
        inRange(lng, lat)
    );
}
