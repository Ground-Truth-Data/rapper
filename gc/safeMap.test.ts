import { describe, expect, it, vi } from "vitest";
import { safeEaseTo, safeFitBounds, safeFlyTo, safeJumpTo } from "./safeMap";

// safeFitBounds is the ONLY sanctioned fitBounds. Its contract: a NaN must
// never reach Mapbox's camera. The historic gap was that it validated the
// corners but not the *computed* zoom — and fitBounds derives zoom as
// log2(viewport / bounds), which goes NaN when padding exceeds the viewport
// or the canvas is unsized. NaN then survives Mapbox's min/max clamp and
// corrupts the camera permanently. These tests pin the cameraForBounds
// pre-flight that closes that gap.

type FitArg = Parameters<typeof safeFitBounds>[0];

function makeMap(over: Record<string, unknown> = {}) {
    return {
        getCenter: () => ({ lng: 0, lat: 0 }),
        getZoom: () => 2,
        stop: vi.fn(),
        flyTo: vi.fn(),
        jumpTo: vi.fn(),
        easeTo: vi.fn(),
        cameraForBounds: vi.fn(() => ({ zoom: 10 })),
        ...over,
    };
}

const SW: [number, number] = [-122, 37];
const NE: [number, number] = [-121, 38];

describe("safeFitBounds — zoom pre-flight", () => {
    it("commits the fit when cameraForBounds yields a finite zoom", () => {
        const m = makeMap();
        safeFitBounds(m as unknown as FitArg, SW, NE);
        expect(m.flyTo).toHaveBeenCalledTimes(1);
    });

    // Padding handed to the camera stays on it, and every later flyTo offset
    // lands off-centre — a tapped cache flew off the top of the screen. The
    // lopsided padding still frames the shape, as a one-off offset.
    it("flies to the fitted camera without leaving padding on it", () => {
        const m = makeMap({ cameraForBounds: vi.fn(() => ({ center: [-121.5, 37.5], zoom: 10, bearing: 0 })) });
        safeFitBounds(m as unknown as FitArg, SW, NE, { padding: { top: 90, bottom: 500 } });
        expect(m.flyTo).toHaveBeenCalledWith({ center: [-121.5, 37.5], zoom: 10, bearing: 0, offset: [0, -205] });
        expect(m.flyTo.mock.calls[0][0]).not.toHaveProperty("padding");
    });

    it("rejects (no camera move) when computed zoom is NaN — padding exceeds viewport", () => {
        const m = makeMap({ cameraForBounds: vi.fn(() => ({ zoom: NaN })) });
        safeFitBounds(m as unknown as FitArg, SW, NE);
        expect(m.flyTo).not.toHaveBeenCalled();
    });

    it("rejects (no camera move) when cameraForBounds returns undefined — unsized canvas", () => {
        const m = makeMap({ cameraForBounds: vi.fn(() => undefined) });
        safeFitBounds(m as unknown as FitArg, SW, NE);
        expect(m.flyTo).not.toHaveBeenCalled();
    });

    it("rejects (no camera move) when computed zoom is Infinity", () => {
        const m = makeMap({ cameraForBounds: vi.fn(() => ({ zoom: Infinity })) });
        safeFitBounds(m as unknown as FitArg, SW, NE);
        expect(m.flyTo).not.toHaveBeenCalled();
    });
});

describe("safeFitBounds — corner + degenerate guards (unchanged contract)", () => {
    it("rejects a non-finite corner without touching the camera", () => {
        const m = makeMap();
        safeFitBounds(m as unknown as FitArg, [NaN, 37], NE);
        expect(m.flyTo).not.toHaveBeenCalled();
    });

    it("delegates a zero-area (sw === ne) box straight to flyTo", () => {
        const m = makeMap();
        safeFitBounds(m as unknown as FitArg, SW, [...SW] as [number, number]);
        expect(m.cameraForBounds).not.toHaveBeenCalled();
        expect(m.flyTo).toHaveBeenCalledTimes(1);
    });
});

// Mapbox reads `"zoom" in opts`, so a key spelled out as undefined becomes a
// NaN target zoom: a pin drop flew with `zoom: opts?.zoom` and NaN'd the camera.
describe("an undefined option never reaches Mapbox as a key", () => {
    const at: [number, number] = [-76, 49];
    it.each([
        ["flyTo", () => (m: FitArg) => safeFlyTo(m, { center: at, zoom: undefined })],
        ["easeTo", () => (m: FitArg) => safeEaseTo(m, { center: at, zoom: undefined })],
        ["jumpTo", () => (m: FitArg) => safeJumpTo(m, { center: at, zoom: undefined })],
    ] as const)("%s", (name, call) => {
        const m = makeMap();
        call()(m as unknown as FitArg);
        const opts = (m[name] as ReturnType<typeof vi.fn>).mock.calls[0]![0];
        expect("zoom" in opts).toBe(false);
    });
});
