// Every camera call refuses a non-finite input with a named warning and moves
// nothing; a camera already at NaN is jumped to a sane spot first, and an
// unrecoverable one refuses the move.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { isFiniteLngLat, safeEaseTo, safeFitBounds, safeFlyTo, safeGetBounds, safeJumpTo } from "./safeMap";

function cam(center = { lng: -119, lat: 49 }, zoom = 10) {
	return {
		flyTo: vi.fn(),
		easeTo: vi.fn(),
		jumpTo: vi.fn(),
		stop: vi.fn(),
		getCenter: () => center,
		getZoom: () => zoom,
		cameraForBounds: vi.fn(() => ({ center: { lng: -119, lat: 49 }, zoom: 12, bearing: 0 }) as { center: unknown; zoom: number; bearing: number } | undefined),
	};
}
let warn: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
	warn = vi.spyOn(console, "warn").mockImplementation(() => {});
});
const said = () => warn.mock.calls.map((c: unknown[]) => String(c[0]));

describe("refusals", () => {
	it("flyTo refuses bad zoom, duration and offset", () => {
		const m = cam();
		safeFlyTo(m as never, { center: [-119, 49], zoom: Number.NaN });
		safeFlyTo(m as never, { center: [-119, 49], duration: Infinity });
		safeFlyTo(m as never, { center: [-119, 49], offset: [0, Number.NaN] });
		expect(m.flyTo).not.toHaveBeenCalled();
		expect(said()).toEqual([
			"[safeMap] rejected flyTo: zoom is not finite",
			"[safeMap] rejected flyTo: duration is not finite",
			"[safeMap] rejected flyTo: offset has non-finite component",
		]);
		safeFlyTo(m as never, { center: [-119, 49], offset: [0, -160], zoom: undefined });
		expect(m.flyTo).toHaveBeenCalledWith({ center: [-119, 49], offset: [0, -160] });
	});

	it("jumpTo and easeTo refuse bad centre, zoom and duration", () => {
		const m = cam();
		safeJumpTo(m as never, { center: [Number.NaN, 1] });
		safeJumpTo(m as never, { zoom: Number.NaN });
		safeEaseTo(m as never, { center: [Number.NaN, 1] });
		safeEaseTo(m as never, { zoom: Number.NaN });
		safeEaseTo(m as never, { duration: Number.NaN });
		expect(m.jumpTo).not.toHaveBeenCalled();
		expect(m.easeTo).not.toHaveBeenCalled();
		expect(said()).toHaveLength(5);
		safeJumpTo(m as never, { zoom: 4 });
		safeEaseTo(m as never, { zoom: 5, bearing: undefined });
		expect(m.jumpTo).toHaveBeenCalledWith({ zoom: 4 });
		expect(m.easeTo).toHaveBeenCalledWith({ zoom: 5 });
		expect(m.stop).toHaveBeenCalledTimes(1);
	});

	it("fitBounds refuses a bad duration and a non-finite fitted zoom", () => {
		const m = cam();
		safeFitBounds(m as never, [-120, 48], [-118, 50], { duration: Number.NaN });
		m.cameraForBounds.mockReturnValueOnce(undefined);
		safeFitBounds(m as never, [-120, 48], [-118, 50], { padding: 9999 });
		expect(said()).toEqual([
			"[safeMap] rejected fitBounds: duration is not finite",
			"[safeMap] rejected fitBounds: computed zoom is non-finite (padding exceeds viewport, degenerate bounds, or unsized canvas)",
		]);
		expect(m.flyTo).not.toHaveBeenCalled();
	});
});

describe("a camera already at NaN", () => {
	it("is jumped to the target first, then flown", () => {
		const m = cam({ lng: Number.NaN, lat: 1 }, Number.NaN);
		safeFlyTo(m as never, { center: [-119, 49], zoom: 9 });
		expect(m.jumpTo).toHaveBeenCalledWith({ center: [-119, 49], zoom: 9 });
		expect(m.flyTo).toHaveBeenCalled();
	});

	it("keeps a clean centre and falls back to zoom 2 when only the zoom broke", () => {
		const m = cam({ lng: -100, lat: 40 }, Number.NaN);
		safeEaseTo(m as never, { bearing: 0 });
		expect(m.jumpTo).toHaveBeenCalledWith({ center: [-100, 40], zoom: 2 });
		const z = cam({ lng: -100, lat: 40 }, Number.NaN);
		safeFitBounds(z as never, [-120, 48], [-118, 50]);
		expect(z.jumpTo).toHaveBeenCalledWith({ center: [-120, 48], zoom: 2 });
	});

	it("refuses when neither the camera nor the call has a centre", () => {
		const m = cam({ lng: Number.NaN, lat: Number.NaN }, 5);
		safeEaseTo(m as never, { zoom: 6 });
		expect(m.easeTo).not.toHaveBeenCalled();
		expect(said()).toEqual(["[safeMap] rejected ensureCleanCamera: no fallback center available"]);
	});
});

describe("safeGetBounds and isFiniteLngLat", () => {
	it("return null for a NaN zoom or a throwing getBounds", () => {
		expect(safeGetBounds({ getZoom: () => Number.NaN, getBounds: () => 1 })).toBeNull();
		expect(
			safeGetBounds({
				getZoom: () => 3,
				getBounds: () => {
					throw new Error("degenerate");
				},
			}),
		).toBeNull();
		expect(said()[1]).toBe("[safeMap] rejected getBounds: Error: degenerate");
		expect(isFiniteLngLat(null)).toBe(false);
		expect(isFiniteLngLat({ lng: 1, lat: Number.NaN })).toBe(false);
		expect(isFiniteLngLat({ lng: 1, lat: 2 })).toBe(true);
	});
});
