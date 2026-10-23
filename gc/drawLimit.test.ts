import { describe, expect, it, vi } from "vitest";
import { DRAWN_SHAPE_MAX_POINTS, mayAddVertex } from "./drawLimit";

const sonner = vi.hoisted(() => ({ toast: vi.fn() }));
vi.mock("svelte-sonner", () => ({ toast: sonner.toast }));

describe("mayAddVertex", () => {
	it("allows a vertex under the cap and refuses, with one toast, at it", () => {
		expect(mayAddVertex(DRAWN_SHAPE_MAX_POINTS - 1)).toBe(true);
		expect(sonner.toast).not.toHaveBeenCalled();
		expect(mayAddVertex(DRAWN_SHAPE_MAX_POINTS)).toBe(false);
		expect(sonner.toast).toHaveBeenCalledWith(expect.stringContaining(String(DRAWN_SHAPE_MAX_POINTS)), { id: "draw-limit" });
	});
});
