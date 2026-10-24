// The ONLY sanctioned way to mutate the Mapbox camera. Any NaN reaching
// Mapbox's projection math corrupts the camera permanently — every LATER
// call crashes too, so a spot fix at one call site doesn't help. Every
// flyTo/fitBounds/easeTo/jumpTo/panTo/setCenter/setZoom/setBearing/setPitch
// MUST go through these wrappers — direct calls fail `vite build`
// (noRawCamera plugin, rapper/src/lib/guards/). A line that genuinely can't
// use a wrapper is annotated `// camera-allow-raw: <why>`.

// Structural type, not `import { Map } from "mapbox-gl"`: ReTreever and
// rapper both depend on mapbox-gl and npm hoists two copies, producing
// "Types of property 'style' are incompatible" at the boundary.
type CameraMap = {
    flyTo(opts: Record<string, unknown>): void;
    // Runs fitBounds' zoom math without mutating the camera — used to
    // validate the target zoom before committing.
    cameraForBounds(
        bounds: [[number, number], [number, number]],
        opts?: Record<string, unknown>,
    ): { center?: unknown; zoom?: number; bearing?: number } | null | undefined;
    easeTo(opts: Record<string, unknown>): void;
    jumpTo(opts: Record<string, unknown>): void;
    stop(): void;
    getCenter(): { lng: number; lat: number };
    getZoom(): number;
};

import { type Coord, isCoord } from "./coord";

export function isFiniteLngLat(
    p: { lng: number; lat: number } | null | undefined,
): p is { lng: number; lat: number } {
    return !!p && Number.isFinite(p.lng) && Number.isFinite(p.lat);
}

type CoordInput = Coord | readonly [number, number] | [number, number];

function isFiniteNumber(n: unknown): n is number {
    return typeof n === "number" && Number.isFinite(n);
}

// isCoord's lng/lat range check would reject valid pixel offsets like `[0, -160]`.
function isFinitePixelPair(p: unknown): p is [number, number] {
    return (
        Array.isArray(p) &&
        p.length >= 2 &&
        Number.isFinite(p[0]) &&
        Number.isFinite(p[1])
    );
}

// A NaN center/zoom means no animated transition can succeed — reset to a
// known-good state with jumpTo first.
function ensureCleanCamera(
    map: CameraMap,
    fallbackCenter?: CoordInput,
    fallbackZoom?: number,
): boolean {
    const c = map.getCenter();
    const z = map.getZoom();
    const cleanCenter = Number.isFinite(c.lng) && Number.isFinite(c.lat);
    const cleanZoom = Number.isFinite(z);
    if (cleanCenter && cleanZoom) return true;

    const target: Coord | null = fallbackCenter && isCoord(fallbackCenter)
        ? (fallbackCenter as Coord)
        : cleanCenter
        ? ([c.lng, c.lat] as unknown as Coord)
        : null;
    const targetZoom = isFiniteNumber(fallbackZoom)
        ? fallbackZoom
        : cleanZoom
        ? z
        : 2;

    if (!target) {
        reportRejection("ensureCleanCamera", "no fallback center available");
        return false;
    }
    map.jumpTo({ center: target, zoom: targetZoom });
    return true;
}

// Mapbox tests `"zoom" in opts`, so `{ zoom: undefined }` flies to zoom NaN.
function present<T extends object>(opts: T): Record<string, unknown> {
    return Object.fromEntries(
        Object.entries(opts).filter(([, v]) => v !== undefined),
    );
}

function reportRejection(method: string, reason: string): void {
    if (typeof console !== "undefined") {
        console.warn(`[safeMap] rejected ${method}: ${reason}`);
    }
}

export type SafeFlyToOptions = {
    center: CoordInput;
    zoom?: number;
    bearing?: number;
    pitch?: number;
    duration?: number;
    curve?: number;
    offset?: [number, number];
    essential?: boolean;
};

export function safeFlyTo(map: CameraMap, opts: SafeFlyToOptions): void {
    if (!isCoord(opts.center)) {
        reportRejection("flyTo", "center is not finite");
        return;
    }
    if (opts.zoom !== undefined && !isFiniteNumber(opts.zoom)) {
        reportRejection("flyTo", "zoom is not finite");
        return;
    }
    if (opts.duration !== undefined && !isFiniteNumber(opts.duration)) {
        reportRejection("flyTo", "duration is not finite");
        return;
    }
    if (opts.offset && !isFinitePixelPair(opts.offset)) {
        reportRejection("flyTo", "offset has non-finite component");
        return;
    }
    if (!ensureCleanCamera(map, opts.center, opts.zoom)) return;

    map.stop();
    map.flyTo(present(opts));
}

export type SafeFitBoundsOptions = {
    padding?:
        | number
        | { top?: number; bottom?: number; left?: number; right?: number };
    duration?: number;
    maxZoom?: number;
    essential?: boolean;
    bearing?: number;
    pitch?: number;
};

export function safeFitBounds(
    map: CameraMap,
    sw: CoordInput,
    ne: CoordInput,
    opts: SafeFitBoundsOptions = {},
): void {
    if (!isCoord(sw) || !isCoord(ne)) {
        reportRejection("fitBounds", "corner is not finite");
        return;
    }
    // Degenerate bounds (sw === ne) make Mapbox's fit math NaN — fall back
    // to flyTo on the single point.
    const sameLng = sw[0] === ne[0];
    const sameLat = sw[1] === ne[1];
    if (sameLng && sameLat) {
        safeFlyTo(map, {
            center: sw as Coord,
            zoom: opts.maxZoom ?? 16,
            duration: opts.duration ?? 1200,
            essential: opts.essential,
        });
        return;
    }
    if (opts.duration !== undefined && !isFiniteNumber(opts.duration)) {
        reportRejection("fitBounds", "duration is not finite");
        return;
    }
    // fitBounds derives zoom as log2(viewport / bounds-size); padding that
    // exceeds the viewport drives that negative → NaN zoom, which survives
    // Mapbox's min/max clamp and corrupts the camera for every later call.
    const cam = map.cameraForBounds(
        [
            sw as unknown as [number, number],
            ne as unknown as [number, number],
        ],
        present(opts),
    );
    if (!cam || !Number.isFinite(cam.zoom)) {
        reportRejection(
            "fitBounds",
            "computed zoom is non-finite (padding exceeds viewport, degenerate bounds, or unsized canvas)",
        );
        return;
    }
    if (!ensureCleanCamera(map, sw)) return;

    map.stop();
    // Never fitBounds itself: it hands its padding to the camera, which keeps it
    // and shoves every later flyTo/offset off-centre, so the padding's
    // lopsidedness becomes a one-off offset instead. Only the zoom comes from
    // cameraForBounds: MapLibre's centre already includes the padding shift,
    // and the offset would apply it twice.
    const p = typeof opts.padding === "object" ? opts.padding : {};
    map.flyTo(
        present({
            center: [(sw[0] + ne[0]) / 2, (sw[1] + ne[1]) / 2],
            zoom: cam.zoom,
            bearing: cam.bearing,
            pitch: opts.pitch,
            offset: [
                ((p.left ?? 0) - (p.right ?? 0)) / 2,
                ((p.top ?? 0) - (p.bottom ?? 0)) / 2,
            ],
            duration: opts.duration,
            essential: opts.essential,
        }),
    );
}

export type SafeJumpToOptions = {
    center?: CoordInput;
    zoom?: number;
    bearing?: number;
    pitch?: number;
};

export function safeJumpTo(map: CameraMap, opts: SafeJumpToOptions): void {
    if (opts.center !== undefined && !isCoord(opts.center)) {
        reportRejection("jumpTo", "center is not finite");
        return;
    }
    if (opts.zoom !== undefined && !isFiniteNumber(opts.zoom)) {
        reportRejection("jumpTo", "zoom is not finite");
        return;
    }
    map.jumpTo(present(opts));
}

export type SafeEaseToOptions = {
    center?: CoordInput;
    zoom?: number;
    bearing?: number;
    pitch?: number;
    padding?: { top?: number; bottom?: number; left?: number; right?: number };
    duration?: number;
    easing?: (t: number) => number;
    essential?: boolean;
};

export function safeEaseTo(map: CameraMap, opts: SafeEaseToOptions): void {
    if (opts.center !== undefined && !isCoord(opts.center)) {
        reportRejection("easeTo", "center is not finite");
        return;
    }
    if (opts.zoom !== undefined && !isFiniteNumber(opts.zoom)) {
        reportRejection("easeTo", "zoom is not finite");
        return;
    }
    if (opts.duration !== undefined && !isFiniteNumber(opts.duration)) {
        reportRejection("easeTo", "duration is not finite");
        return;
    }
    if (!ensureCleanCamera(map, opts.center, opts.zoom)) return;

    map.stop();
    map.easeTo(present(opts));
}

// map.getBounds() THROWS on a momentarily degenerate transform (zoom ===
// NaN, possible for one frame during a jump/ease) — this returns null
// instead so a moveend handler can skip the frame rather than crash.
export function safeGetBounds<T>(map: {
    getZoom(): number;
    getBounds(): T;
}): T | null {
    if (!isFiniteNumber(map.getZoom())) {
        reportRejection("getBounds", "camera zoom is not finite");
        return null;
    }
    try {
        return map.getBounds();
    } catch (e) {
        reportRejection("getBounds", String(e));
        return null;
    }
}
