// The other tier's origin follows the route table; a HEAD probe says "missing"
// only on a 404 and "unknown" on anything it cannot read.
import { describe, expect, it, vi } from "vitest";
import { otherTierOrigin, otherTierPath, probeOtherSide } from "./tierRoutes";

describe("probeOtherSide and otherTierOrigin", () => {
	it("maps status codes to serves / missing / unknown", async () => {
		const at = (status: number) => vi.fn(async () => ({ status, ok: status < 300 }) as Response);
		const ok = at(200);
		expect(await probeOtherSide("http://o", "/who", ok)).toBe("serves");
		expect(ok).toHaveBeenCalledWith("http://o/who", expect.objectContaining({ method: "HEAD" }));
		expect(await probeOtherSide("http://o", "/", at(404))).toBe("missing");
		expect(await probeOtherSide("http://o", "/", at(502))).toBe("serves");
		expect(await probeOtherSide("http://o", "/", at(403))).toBe("unknown");
		expect(await probeOtherSide("http://o", "/", vi.fn(async () => Promise.reject(new Error("offline"))))).toBe("unknown");
	});

	it("reads the other origin from the matched route and falls home without a table", () => {
		const routes = [{ path: "/admin", otherPath: "/", otherOrigin: "http://admin.x" }];
		expect(otherTierOrigin("/admin/users", routes)).toBe("http://admin.x");
		expect(otherTierOrigin("/who", routes)).toBeUndefined();
		expect(otherTierPath("/who", [], undefined)).toBe("/");
	});
});
