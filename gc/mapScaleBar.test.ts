// @vitest-environment happy-dom
// The scale bar prints a round number in the planter's unit, splits in halves
// and quarters only, and lights up while the map zooms.
import { distance } from "$gc/units.svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mapDouble } from "./mapDouble";
import { NiceScaleBarControl } from "./mapScaleBar";

beforeEach(() => {
	vi.useFakeTimers();
	distance.value = "metric";
});
afterEach(() => vi.useRealTimers());

describe("NiceScaleBarControl", () => {
	it("mounts under both renderers' class names and draws a bar for the viewport", () => {
		const d = mapDouble({ w: -119.3, s: 50.2, e: -119.2, n: 50.3 });
		const bar = new NiceScaleBarControl();
		const el = bar.onAdd(d.map as never);
		expect(bar.getDefaultPosition()).toBe("bottom-left");
		expect(el.className).toContain("mapboxgl-ctrl");
		expect(el.className).toContain("maplibregl-ctrl");
		const labels = [...el.querySelectorAll(".nice-scale-bar__tick")].map((t) => t.textContent);
		expect(labels[0]).toBe("0");
		expect(labels.at(-1)).toMatch(/^\d+(\.\d+)?(m|km)$/);
		const blocks = el.querySelectorAll(".nice-scale-bar__block");
		expect([2, 3]).toContain(blocks.length);
		const widthPx = Number.parseFloat((el.querySelector(".nice-scale-bar__blocks") as HTMLElement).style.width);
		expect(widthPx).toBeGreaterThan(0);
		expect(widthPx).toBeLessThanOrEqual(200);
	});

	it("prints miles for an imperial planter and redraws on every move", () => {
		const d = mapDouble({ w: -120, s: 50, e: -119, n: 51 });
		const el = new NiceScaleBarControl({ width: 300 }).onAdd(d.map as never);
		distance.value = "imperial";
		d.fire("move");
		const labels = [...el.querySelectorAll(".nice-scale-bar__tick")].map((t) => t.textContent);
		expect(labels.at(-1)).toMatch(/mi$/);
	});

	it("goes active on zoomstart and fades half a second after zoomend; onRemove detaches", () => {
		const d = mapDouble();
		const bar = new NiceScaleBarControl();
		const el = bar.onAdd(d.map as never);
		document.body.appendChild(el);
		d.fire("zoomstart");
		expect(el.classList.contains("is-active")).toBe(true);
		d.fire("zoomend");
		d.fire("zoomstart");
		d.fire("zoomend");
		vi.advanceTimersByTime(499);
		expect(el.classList.contains("is-active")).toBe(true);
		vi.advanceTimersByTime(1);
		expect(el.classList.contains("is-active")).toBe(false);
		d.fire("zoomend");
		bar.onRemove();
		expect(el.isConnected).toBe(false);
		for (const ev of ["move", "zoomstart", "zoomend"]) expect(d.handlers.get(ev)).toHaveLength(0);
		bar.onRemove();
	});

	it("draws nothing for a camera it cannot measure", () => {
		const d = mapDouble();
		d.raw.unproject = () => ({ lng: Number.NaN, lat: Number.NaN });
		const el = new NiceScaleBarControl().onAdd(d.map as never);
		expect(el.querySelectorAll(".nice-scale-bar__block")).toHaveLength(0);
		const still = mapDouble();
		still.raw.unproject = () => ({ lng: 0, lat: 0 });
		const el2 = new NiceScaleBarControl().onAdd(still.map as never);
		expect(el2.querySelectorAll(".nice-scale-bar__block")).toHaveLength(0);
	});
});
