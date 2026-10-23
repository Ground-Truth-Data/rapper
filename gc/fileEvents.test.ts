// @vitest-environment happy-dom
// Exports and imports are announced on window by name; an import that was
// refused says so, and only a landed one counts as landed.
import { describe, expect, it, vi } from "vitest";
import { FILE_EXPORTED_EVENT, FILE_IMPORTED_EVENT, announceExport, announceImport, landedImport } from "./fileEvents";

describe("file events", () => {
	it("announce the filename, and tell a landed import from a refusal", () => {
		const exported = vi.fn();
		const imported = vi.fn();
		window.addEventListener(FILE_EXPORTED_EVENT, exported);
		window.addEventListener(FILE_IMPORTED_EVENT, imported);
		announceExport("tally.csv");
		expect((exported.mock.calls[0]![0] as CustomEvent).detail).toEqual({ filename: "tally.csv" });
		announceImport("a.gpkg");
		announceImport("b.gpkg", false);
		const [landed, refused] = imported.mock.calls.map((c) => c[0] as Event);
		expect((landed as CustomEvent).detail).toEqual({ filename: "a.gpkg", landed: true });
		expect(landedImport(landed!)).toBe(true);
		expect(landedImport(refused!)).toBe(false);
		expect(landedImport(new Event("x"))).toBe(false);
	});
});
