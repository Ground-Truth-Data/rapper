// @vitest-environment happy-dom
import { cleanup, render } from "@testing-library/svelte";
import { afterEach, expect, it } from "vitest";
import ConfirmedDiamond from "./ConfirmedDiamond.svelte";

afterEach(cleanup);

it("is rose when confirmed and grey once the delivery is done", () => {
	const rose = render(ConfirmedDiamond).getByRole("img");
	expect(rose.classList.contains("muted")).toBe(false);
	expect(rose.getAttribute("aria-label")).toBe("Location confirmed");
	cleanup();
	const grey = render(ConfirmedDiamond, { muted: true }).getByRole("img");
	expect(grey.classList.contains("muted")).toBe(true);
	expect(grey.getAttribute("aria-label")).toBe("Delivered, now planted or removed");
});
