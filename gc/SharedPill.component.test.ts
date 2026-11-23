// @vitest-environment happy-dom
// Shared by me is a sky pill with a white cloud; shared with me through a parent is the bare outline cloud, so the two never read alike.
import { cleanup, render } from "@testing-library/svelte";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import SharedPill from "./SharedPill.svelte";

afterEach(cleanup);

it("my link is the pill, the cloud alone, its count in the label", () => {
	const { container } = render(SharedPill, { shared: { n: 3 } });
	const pill = container.querySelector(".rt-shared")!;
	expect(pill.classList.contains("rt-shared--own")).toBe(true);
	expect(pill.textContent!.trim()).toBe("");
	expect(pill.getAttribute("aria-label")).toBe("shared · 3");
	expect(pill.querySelector("svg")?.getAttribute("width"), "the cloud at the you pill's cap height").toBe("12");
});

it("shared through a parent is the bare cloud, no pill", () => {
	const { container } = render(SharedPill, { shared: { via: "Lake" } });
	const pill = container.querySelector(".rt-shared")!;
	expect(pill.classList.contains("rt-shared--own")).toBe(false);
	expect(pill.getAttribute("aria-label")).toBe("Shared with Lake");
});

// A mouse resting on it must not wash the sky in the app's gold hover: over a dark row the pill read olive (Chris, 22 Nov 2026).
it("is on the gold hover's opt-out list", () => {
	// Run from getCache/, as every rapper test is; vitest empties a CSS import.
	const css = readFileSync(join(process.cwd(), "../rapper/gc/mobile.css"), "utf8");
	const optOut = css.match(/:is\(button, \[role="button"\], \[role="tab"\]\):not\(([^)]*)\):hover/)![1]!;
	expect(optOut.split(",").map((s) => s.trim())).toContain(".rt-shared");
});
