// @vitest-environment happy-dom
// The double stands in for MapLibre in the map tests; a wrong camera or a lost handler there passes a broken map.
import { describe, expect, it, vi } from "vitest";
import { mapDouble, PX } from "./mapDouble";

describe("mapDouble", () => {
	it("projects its box onto a 400×800 window and back", () => {
		const { raw } = mapDouble({ w: 0, s: 0, e: 1, n: 2 });
		expect(raw.project([0.5, 1])).toEqual({ x: PX.w / 2, y: PX.h / 2 });
		expect(raw.project({ lng: 0, lat: 2 })).toEqual({ x: 0, y: 0 });
		expect(raw.unproject([PX.w, PX.h])).toEqual({ lng: 1, lat: 0 });
		expect(raw.getCenter()).toEqual({ lng: 0.5, lat: 1 });
		expect(raw.cameraForBounds()).toEqual({ center: { lng: 0.5, lat: 1 }, zoom: 14, bearing: 0 });
		expect([raw.getBounds().getSouthWest(), raw.getBounds().getNorthEast()]).toEqual([{ lng: 0, lat: 0 }, { lng: 1, lat: 2 }]);
		raw.zoom = 9;
		expect(raw.getZoom()).toBe(9);
		expect(raw.getContainer().clientWidth).toBe(PX.w);
		expect(raw.getCanvas().getBoundingClientRect().height).toBe(PX.h);
	});

	it("keeps sources, layers in order, paint, layout, filters and feature state", () => {
		const d = mapDouble();
		const fc = { type: "FeatureCollection" as const, features: [] };
		d.raw.addSource("pins", { type: "geojson", data: fc });
		d.raw.getSource("pins")!.setData({ ...fc, features: [{ type: "Feature", geometry: null, properties: {} }] });
		expect((d.sources.get("pins") as typeof fc).features).toHaveLength(1);
		d.raw.addLayer({ id: "a" });
		d.raw.addLayer({ id: "c" });
		d.raw.addLayer({ id: "b" }, "c");
		expect(d.layers.map((l) => l.id)).toEqual(["a", "b", "c"]);
		expect([d.raw.getLayer("b"), d.raw.getStyle().layers]).toEqual([{ id: "b" }, d.layers]);
		d.raw.removeLayer("b");
		d.raw.removeLayer("nope");
		expect(d.layers.map((l) => l.id)).toEqual(["a", "c"]);
		d.raw.setPaintProperty("a", "fill-color", "red");
		d.raw.setLayoutProperty("a", "visibility", "none");
		d.raw.setFilter("a", ["==", 1, 1]);
		expect([d.paint.a, d.layout.a, d.filters.a]).toEqual([{ "fill-color": "red" }, { visibility: "none" }, ["==", 1, 1]]);
		d.raw.setFeatureState({ source: "pins", id: 7 }, { hover: true });
		d.raw.setFeatureState({ source: "pins", id: 7 }, { picked: 1 });
		expect(d.raw.getFeatureState({ source: "pins", id: 7 })).toEqual({ hover: true, picked: 1 });
		d.raw.removeFeatureState({ source: "pins", id: 7 });
		expect(d.raw.getFeatureState({ source: "pins", id: 7 })).toEqual({});
		d.raw.removeSource("pins");
		expect(d.raw.isSourceLoaded("pins")).toBe(false);
	});

	it("fires map and per-layer handlers; off removes one, once runs once, even when taken off by its original", () => {
		const d = mapDouble();
		const [onMap, onLayer, onOnce, gone] = [vi.fn(), vi.fn(), vi.fn(), vi.fn()];
		d.raw.on("click", onMap);
		d.raw.on("click", "pins", onLayer);
		d.raw.once("moveend", onOnce);
		d.raw.once("idle", gone);
		d.raw.off("idle", gone);
		d.fire("click", 1);
		d.fire("click", 2, "pins");
		d.fire("moveend");
		d.fire("moveend");
		d.fire("idle");
		expect([onMap.mock.calls, onLayer.mock.calls, onOnce.mock.calls.length, gone.mock.calls.length]).toEqual([[[1]], [[2]], 1, 0]);
		d.raw.off("click", "pins", onLayer);
		d.fire("click", 3, "pins");
		expect(onLayer).toHaveBeenCalledTimes(1);
	});
});
