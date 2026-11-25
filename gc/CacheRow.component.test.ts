// @vitest-environment happy-dom
import { cleanup, render } from "@testing-library/svelte";
import { afterEach, expect, it } from "vitest";
import CacheRow from "./CacheRow.svelte";

afterEach(cleanup);

const text = (e: Element | null) => e?.textContent?.replace(/\s+/g, " ").trim() ?? "";

it("names the cache and gives each seedlot its count over its own bar segment, then the total and its share", () => {
	const { container } = render(CacheRow, { icon: "/pin.webp", name: "c3", lots: [[0, 333], [1, 810]], total: 1143, pct: 12 });
	expect(text(container.querySelector(".n"))).toBe("c3");
	expect([...container.querySelectorAll(".nums b")].map(text)).toEqual(["333", "810"]);
	expect(container.querySelectorAll(".bar i")).toHaveLength(2);
	expect(text(container.querySelector(".v"))).toBe("1,14312%");
});

it("a cache with nothing in it says so in place of a total", () => {
	const { container } = render(CacheRow, { icon: "/pin.webp", name: "c6", lots: [], total: 0, empty: "empty" });
	expect(text(container.querySelector(".v"))).toBe("empty");
	expect(container.querySelector(".bar")).toBeNull();
});

it("a row with a swatch and no icon is a plain total (planted)", () => {
	const { container } = render(CacheRow, { swatch: "red", name: "planted", total: 40 });
	expect(container.querySelector("img")).toBeNull();
	expect(container.querySelector(".sw")).not.toBeNull();
	expect(text(container.querySelector(".v"))).toBe("40");
});
