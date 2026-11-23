import { readFileSync } from "node:fs";
import { relative } from "node:path";
import type { Plugin } from "vite";

/**
 * Camera mutations go through safeMap.ts, enforced by `vite build`: a NaN
 * reaching the renderer's projection math corrupts the camera permanently and
 * the crash surfaces deep in renderer internals with no trace of the caller.
 * A source scan, not resolveId, because a method call never reaches a hook.
 */

const CAMERA_METHODS = [
	"flyTo",
	"fitBounds",
	"easeTo",
	"jumpTo",
	"panTo",
	"setCenter",
	"setZoom",
	"setBearing",
	"setPitch",
] as const;

const CALL = new RegExp(`\\.(${CAMERA_METHODS.join("|")})\\s*\\(`, "g");

// safeMap/safeEase ARE the wrappers; mapInit writes the camera before any wrapper exists.
const ALLOWED = /(?:safeMap|safeEase|mapInit)\.ts$/;

const SKIP =
	/node_modules|\.svelte-kit|[/\\]_rapper[/\\]|\.(?:test|spec)\.[tj]s$|[/\\]tests?[/\\]/;

/** `// camera-allow-raw: <reason>` on the call's line or the one above it. */
function hasEscape(lines: string[], lineIdx: number): boolean {
	const here = lines[lineIdx] ?? "";
	const above = lines[lineIdx - 1] ?? "";
	return /camera-allow-raw:/.test(here) || /camera-allow-raw:/.test(above);
}

// A deliberate approximation: a parser is a large dependency for a guard whose
// false positives are one annotation away from silenced.
function stripNonCode(src: string): string {
	return src
		.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
		.replace(/\/\/[^\n]*/g, (m) => m.replace(/[^\n]/g, " "))
		.replace(/(['"`])(?:\\.|(?!\1)[^\\\n])*\1/g, (m) =>
			m.replace(/[^\n]/g, " "),
		);
}

/** `file`'s raw camera calls as `  <path>:<line>  .<method>(`, or none when the guard does not look at it. */
export function rawCameraCalls(file: string, workspaceRoot: string): string[] {
	if (SKIP.test(file) || ALLOWED.test(file)) return [];
	if (!/\.(?:ts|svelte)$/.test(file)) return [];
	let src: string;
	try {
		src = readFileSync(file, "utf8");
	} catch {
		return [];
	}
	if (!CAMERA_METHODS.some((m) => src.includes(`.${m}`))) return [];

	const lines = src.split("\n");
	const found: string[] = [];
	stripNonCode(src)
		.split("\n")
		.forEach((line, i) => {
			for (const m of line.matchAll(CALL)) {
				if (!hasEscape(lines, i)) found.push(`  ${relative(workspaceRoot, file)}:${i + 1}  .${m[1]}(`);
			}
		});
	return found;
}

export function noRawCamera(workspaceRoot: string): Plugin {
	const violations: string[] = [];

	return {
		name: "no-raw-camera",
		apply: "build",
		enforce: "pre",

		// From disk, not `code`: post-transform line numbers no longer match the file.
		transform(_code, id) {
			violations.push(...rawCameraCalls(id.split("?")[0]!, workspaceRoot));
			return null;
		},

		buildEnd() {
			if (violations.length === 0) return;
			const seen = [...new Set(violations)].sort();
			this.error(
				`Direct renderer camera calls bypass safeMap.ts (${seen.length}):\n\n` +
					`${seen.join("\n")}\n\n` +
					"A NaN reaching the camera corrupts it for every later call, and the\n" +
					"crash surfaces deep in renderer internals with no trace of the caller.\n\n" +
					"Fix: safeFlyTo(map, …) / safeFitBounds(map, …) / safeEaseTo(map, …) /\n" +
					"safeJumpTo(map, …) from safeMap.ts. Build coords with toCoord() at the\n" +
					"boundary so validation happens once, where the value is born.\n\n" +
					"Genuinely unavoidable? Annotate the line with\n" +
					"  // camera-allow-raw: <why this one cannot go through safeMap>",
			);
		},
	};
}
