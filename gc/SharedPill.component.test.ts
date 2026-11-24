// @vitest-environment happy-dom
// Shared by me is a sky pill with a white cloud; shared with me through a parent is the bare outline cloud, so the two never read alike.
import { cleanup, render } from "@testing-library/svelte";
import { afterEach, expect, it } from "vitest";
import SharedPill from "./SharedPill.svelte";

afterEach(cleanup);

it("my link is the pill, the cloud alone, its count in the label", () => {
	const { container } = render(SharedPill, { shared: { n: 3 } });
	const pill = container.querySelector(".rt-shared")!;
	expect(pill.classList.contains("rt-shared--own")).toBe(true);
	expect(pill.textContent!.trim()).toBe("");
	expect(pill.getAttribute("aria-label")).toContain("3");
});

it("shared through a parent is the bare cloud, no pill", () => {
	const { container } = render(SharedPill, { shared: { via: "Lake" } });
	const pill = container.querySelector(".rt-shared")!;
	expect(pill.classList.contains("rt-shared--own")).toBe(false);
	expect(pill.getAttribute("aria-label")).toContain("Lake");
});
