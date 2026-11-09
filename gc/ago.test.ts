import { afterEach, expect, test, vi } from "vitest";
import { ago } from "./ago";

afterEach(() => vi.useRealTimers());

test("minutes, hours, days, then weeks, each switching at the next unit; a time ahead of the clock is 0m", () => {
	vi.useFakeTimers({ now: Date.parse("2026-11-09T12:00:00Z") });
	const before = (min: number) => new Date(Date.now() - min * 60_000).toISOString();
	expect([0, 59, 60, 90, 1439, 1440, 20159, 20160, 30240].map((m) => ago(before(m)))).toEqual(["0m", "59m", "1h", "2h", "24h", "1d", "14d", "2w", "3w"]);
	expect(ago("2026-11-09T13:00:00Z")).toBe("0m");
});
