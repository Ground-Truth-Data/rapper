import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * The landscape rig rotates `.mobile-preview-screen` -90°. Turned,
 * `rect.width / offsetWidth` reads the aspect ratio, not the scale, and a raw
 * difference of rect edges is a screen-space distance on the wrong axis. Both
 * stay finite and plausible, so they are pinned as source assertions.
 */
const read = (rel: string) =>
	readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*/g, "");

const fcb = read("./fixedContainingBlock.ts");
const atv = read("./atvShare.ts");
const portal = read("./handPortal.ts");

describe("the scale survives a turn", () => {
	// hypot(a, b) is the x-axis scale of the accumulated matrix, which holds the
	// rotation and the scale separately. The rect ratio conflates them.
	it("derives scale from the matrix, not the rect's width", () => {
		expect(strip(fcb)).toMatch(/Math\.hypot\(\s*m\.a\s*,\s*m\.b\s*\)/);
	});

	// Correct whenever nothing is rotated, but never the primary answer.
	it("keeps the rect ratio only as a fallback", () => {
		const body = strip(fcb);
		const ratio = body.indexOf("r.width / el.offsetWidth");
		const matrix = body.indexOf("Math.hypot");
		expect(ratio).toBeGreaterThan(-1);
		expect(matrix).toBeGreaterThan(-1);
		expect(matrix).toBeLessThan(ratio);
	});
});

describe("a point conversion exists, because two axes cannot express a turn", () => {
	it("offers point() alongside the scalar x/y", () => {
		expect(strip(fcb)).toMatch(/point:\s*\(/);
		expect(strip(fcb)).toMatch(/\.inverse\(\)/);
	});
});

describe("the quad measures its runway in page axes", () => {
	it("never subtracts one raw rect edge from another", () => {
		const body = strip(atv);
		expect(body).not.toMatch(
			/(hostRect|hr)\.(right|left)\s*-\s*(btnRect|br)\.(right|left)/,
		);
		expect(body).not.toMatch(
			/(btnRect|br)\.(top|bottom)\s*-\s*(hostRect|hr)\.(top|bottom)/,
		);
	});

	it("converts both corners before comparing them", () => {
		expect(strip(atv)).toMatch(/point\([^)]*\.right[^)]*\.bottom[^)]*\)/);
	});

	// Turned, the conversion can flip which end is larger.
	it("sorts the converted edges instead of trusting their order", () => {
		const body = strip(atv);
		expect(body).toMatch(/Math\.min\(/);
		expect(body).toMatch(/Math\.max\(/);
	});
});

describe("the overlay home follows the turn", () => {
	// The frame is not rotated and the screen inside it is, so an overlay given
	// the frame rides along an axis the page does not share.
	it("prefers the turned screen box over the frame that holds it", () => {
		const body = strip(portal);
		expect(body).toContain("mobile-preview-screen");
		const screen = body.indexOf("mobile-preview-screen");
		const frame = body.indexOf("mobile-preview-frame");
		expect(screen).toBeGreaterThan(-1);
		expect(frame).toBeGreaterThan(-1);
		expect(screen).toBeLessThan(frame);
	});
});

describe("the quad does not re-invent the conversion", () => {
	// overlayCoordLaw scans only ReTreever/src, so rapper needs its own guard.
	it("uses localFrom rather than its own scale", () => {
		const body = strip(atv);
		expect(body).toMatch(/localFrom\(/);
		expect(body).not.toMatch(/hr\.width\s*\/\s*home\.offsetWidth/);
	});
});
