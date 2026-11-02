// @vitest-environment happy-dom
import { cleanup, render } from "@testing-library/svelte";
import { afterEach, expect, it } from "vitest";
import ConfirmedDiamond from "./ConfirmedDiamond.svelte";

afterEach(cleanup);

it("is the tilted light rose when confirmed and greyed once the delivery is done", () => {
	const rose = render(ConfirmedDiamond).getByRole("img");
	expect(rose.classList.contains("muted")).toBe(false);
	expect(rose.getAttribute("alt")).toBe("Location confirmed");
	expect(rose.getAttribute("src")).toMatch(/diamond_lightRose_tilt/);
	cleanup();
	const grey = render(ConfirmedDiamond, { muted: true, art: "vert", tone: "dark", size: 12 }).getByRole("img");
	expect(grey.classList.contains("muted")).toBe(true);
	expect(grey.getAttribute("alt")).toBe("Delivered, now planted or removed");
	expect(grey.getAttribute("src")).toMatch(/diamond_darkRose_vert/);
	expect(grey.style.width).toBe("12px");
});
