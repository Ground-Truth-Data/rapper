import { describe, expect, it } from "vitest";
import { LOUPE_LIFT_PX, LOUPE_PX, LOUPE_ZOOM, loupeAt, loupeFrame } from "./Loupe.svelte";

// Where a source backing pixel lands in the lens's backing store after drawImage(src, s…, d…).
function landing(f: ReturnType<typeof loupeFrame>, bx: number, by: number) {
	return {
		x: f.dx + ((bx - f.sx) * f.dw) / f.sw,
		y: f.dy + ((by - f.sy) * f.dh) / f.sh,
	};
}

describe("the loupe shows the map under the pointer", () => {
	it("the pointer's own pixel is the crosshair, whatever the source and lens ratios", () => {
		for (const [s, dpr] of [
			[1, 1],
			[2, 2],
			[3, 2],
			[1.5, 3],
		]) {
			const f = loupeFrame(200 * s, 300 * s, s, 390 * s, 844 * s, dpr);
			const l = landing(f, 200 * s, 300 * s);
			expect(l.x).toBeCloseTo((LOUPE_PX * dpr) / 2, 6);
			expect(l.y).toBeCloseTo((LOUPE_PX * dpr) / 2, 6);
		}
	});

	it("a pin 5 px right of the pointer sits 5 × zoom px right of the crosshair", () => {
		const f = loupeFrame(400, 600, 2, 780, 1688, 2);
		expect(landing(f, 410, 600).x).toBeCloseTo(LOUPE_PX + 5 * LOUPE_ZOOM * 2, 6);
	});

	it("clipped at the canvas edge, the pointer stays dead centre instead of the view stretching", () => {
		const f = loupeFrame(20, 600, 2, 780, 1688, 2);
		expect(f.sx).toBe(0);
		expect(f.dw / f.sw).toBeCloseTo(LOUPE_ZOOM, 6);
		expect(landing(f, 20, 600).x).toBeCloseTo(LOUPE_PX, 6);
	});

	it("floats above the pointer and never off the viewport", () => {
		expect(loupeAt(200, 400, 390, 844)).toEqual({ x: 200, y: 400 - LOUPE_LIFT_PX });
		expect(loupeAt(5, 100, 390, 844)).toEqual({ x: LOUPE_PX / 2, y: LOUPE_PX / 2 });
		expect(loupeAt(389, 843, 390, 844)).toEqual({ x: 390 - LOUPE_PX / 2, y: 843 - LOUPE_LIFT_PX });
	});
});
