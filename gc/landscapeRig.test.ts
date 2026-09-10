import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { isLandscapeRoute } from "./rigOrientation";

/**
 * THE PHONE, TURNED. The rig is rapper's furniture and every tier renders the
 * same component, so these assertions live here rather than in the child that
 * happens to ask for the turn — a child asserting on .mobile-preview markup is
 * the child knowing about the tier that mounts it, which childBoundary bans.
 */
const read = (rel: string) =>
	readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");

const rig = read("./PhoneRig.svelte");
const theme = read("./theme.css");

/** Every --fit DECLARATION under a .rig-landscape rule, comments stripped.
 *  Slicing the file and grepping the remainder is not enough: the prose
 *  explaining the axis names both custom properties, so a pattern spanning the
 *  rest of the file is satisfied by the comment and passes even when the rule
 *  itself divides by the wrong one. Whole declarations, not lines — the
 *  narrow-window min() spans several lines. */
const landscapeFits = () =>
	[
		...theme
			.slice(theme.indexOf(".rig-landscape"))
			.replace(/\/\*[\s\S]*?\*\//g, "")
			.matchAll(/--fit:([^;]*);/g),
	].map((m) => m[1].replace(/\s+/g, " ").trim());

describe("the phone can be turned a quarter turn", () => {
	it("is opt-in, so every other page keeps the portrait rig", () => {
		// A default-on rotation would turn the landing page, the stage and the
		// Capacitor app at the same time. The prop is the whole safety margin.
		expect(rig).toMatch(/landscape\s*=\s*false/);
	});

	it("turns the PHONE clockwise", () => {
		// Counter-clockwise puts the arm's cut edge along the top of the window,
		// where it reads as a bar across the sky rather than an arm reaching in.
		// Only the wrapper's own transform is checked: the screen inside is
		// deliberately turned the other way.
		const wrapper = theme.slice(
			theme.indexOf(".mobile-preview-backdrop.rig-landscape .mobile-preview-wrapper"),
		);
		const transform =
			wrapper.replace(/\/\*[\s\S]*?\*\//g, "").match(/transform:([^;]*);/)?.[1] ?? "";
		expect(transform).toMatch(/rotate\(90deg\)/);
		expect(transform).not.toMatch(/rotate\(-90deg\)/);
	});

	// The turn and the counter-turn are one mechanism: a screen box that is not
	// turned back leaves the page reading bottom-to-top, which is a rotated
	// picture of a phone rather than a phone held sideways.
	it("turns the SCREEN back, so the page inside stays upright", () => {
		expect(rig).toContain("mobile-preview-screen");
		const screen = theme.slice(theme.indexOf(".mobile-preview-screen {"));
		expect(screen).toMatch(/rotate\(-90deg\)/);
	});

	// Children are static blocks that stack. Turning each about its own corner
	// puts the first right and throws the rest out of the phone — measured, the
	// second child landed 200px LEFT of the frame. Normal flow has to happen
	// inside ONE turned box.
	it("turns one box, not each child", () => {
		expect(theme).not.toMatch(/\.rig-landscape[^{]*\.mobile-preview-frame\s*>\s*\*/);
	});
});

describe("the fit rule follows the turn", () => {
	it("divides by the axis that is vertical ON SCREEN, not the taller one", () => {
		const fits = landscapeFits();
		expect(fits.length).toBeGreaterThan(0);
		// Turned, the phone's on-screen height is --phone-width. Dividing the
		// headroom by --phone-height lets it claim it needs 452px when it needs
		// 936, so it computes --fit:1 and runs off both sides of the window.
		for (const fit of fits) {
			const headroom = fit.match(/100cqh[^/]*\/\s*var\((--phone-\w+)\)/);
			expect(headroom?.[1]).toBe("--phone-width");
		}
	});

	// Found by measuring the live page, not by looking at it: at 760x560 the
	// frame fitted by width and STILL ran 28px off the right edge, because the
	// composition nudge is spare room being spent — and turned, the phone very
	// nearly is the stage, so there is no spare room to spend.
	it("spends no horizontal nudge, which turned there is no room for", () => {
		const rule = theme
			.slice(theme.indexOf(".rig-landscape"))
			.replace(/\/\*[\s\S]*?\*\//g, "");
		const transform = rule.match(/transform:([^;]*);/)?.[1] ?? "";
		expect(transform).toMatch(/rotate\(90deg\)/);
		expect(transform).not.toMatch(/--wrapper-nudge/);
	});

	it("still never scales the phone UP past its hand-tuned size", () => {
		for (const fit of landscapeFits()) expect(fit).toMatch(/^min\(\s*1\s*,/);
	});
});

describe("the hand-tuned geometry is not re-solved to make this fit", () => {
	it("leaves the settled phone and hand numbers alone", () => {
		// These are signed off and explicitly fenced in theme.css. A rotation
		// that "fits" by re-tuning them is the drift that block exists to stop.
		expect(theme).toContain("--phone-width: 452px");
		expect(theme).toContain("--phone-height: 936px");
		expect(theme).toContain("--hand-width: 1484px");
		expect(theme).toContain("--hand-left: -673px");
		expect(theme).toContain("--hand-top: -51px");
	});
});

describe("which routes are turned", () => {
	it("turns the georef route, under either mounting", () => {
		// A child served on its own mounts at the bare path; mounted by a tier
		// the same page gains the /app prefix. Both are the same page.
		expect(isLandscapeRoute("/app/georef")).toBe(true);
		expect(isLandscapeRoute("/georef")).toBe(true);
		expect(isLandscapeRoute("/app/georef/")).toBe(true);
	});

	it("leaves every other route standing up", () => {
		for (const route of ["/app/map", "/app/offlinev10", "/", "/app/map/debug"])
			expect(isLandscapeRoute(route)).toBe(false);
	});

	// The page that wants the turn is a DESCENDANT of the layout that draws the
	// rig, so it cannot pass a prop up. Left to the layouts, the same route
	// would be listed three times and drift the first time one was edited.
	it("is decided in one table, not once per mounting layout", () => {
		const mounts = [
			read("../../getCache_OnlineMap/routes/+layout.svelte"),
			read("../src/routes/(gc)/+layout.svelte"),
			read("../../ReTreever/src/routes/(getcache)/+layout@.svelte"),
		];
		for (const m of mounts) expect(m).toMatch(/isLandscapeRoute\(/);
	});
});
