// Georef turns the phone and draws no bars, in either spelling of its route;
// an embedded copy of the app draws no bars anywhere.
import { describe, expect, it } from "vitest";
import { EMBED_PARAM, hasBottomBar, hasTopBar, isEmbedded, isLandscapeRoute } from "./rigOrientation";

describe("rigOrientation", () => {
	it("georef is landscape and barless, with or without /app or a trailing slash", () => {
		for (const p of ["/georef", "/app/georef/", new URL("http://x/app/georef")]) {
			expect(isLandscapeRoute(p)).toBe(true);
			expect(hasTopBar(p)).toBe(false);
			expect(hasBottomBar(p)).toBe(false);
		}
		expect(isLandscapeRoute("/")).toBe(false);
		expect(isLandscapeRoute("///")).toBe(false);
	});

	it("every other route has both bars unless it is embedded", () => {
		expect(hasTopBar("/app/stats")).toBe(true);
		expect(hasBottomBar(new URL("http://x/app/stats"))).toBe(true);
		const embedded = new URL(`http://x/app/stats?${EMBED_PARAM}=1`);
		expect(isEmbedded(embedded)).toBe(true);
		expect(isEmbedded("/app/stats?embed=1")).toBe(false);
		expect(hasTopBar(embedded)).toBe(false);
		expect(hasBottomBar(embedded)).toBe(false);
	});
});
