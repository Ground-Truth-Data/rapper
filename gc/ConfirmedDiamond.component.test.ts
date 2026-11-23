// @vitest-environment happy-dom
import { cleanup, render } from "@testing-library/svelte";
import { afterEach, expect, it } from "vitest";
import ConfirmedDiamond from "./ConfirmedDiamond.svelte";

afterEach(cleanup);

it("shows the confirmed diamond, and the muted one once the delivery is done", () => {
	const rose = render(ConfirmedDiamond).getByRole("img");
	expect(rose.classList.contains("muted")).toBe(false);
	cleanup();
	const grey = render(ConfirmedDiamond, { muted: true, art: "vert", tone: "dark", size: 12 }).getByRole("img");
	expect(grey.classList.contains("muted")).toBe(true);
});
