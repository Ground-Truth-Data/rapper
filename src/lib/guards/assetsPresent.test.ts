import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// rapper must serve its own /mobileAssets/worldBase — a missing tile 404s here even though the identical URL 200s under ReTreever, and it draws nothing rather than announcing itself.
// worldBase is the ONLY thing left under this URL: every other map image is imported by the child that owns it, so the bundler carries it. Nothing new belongs in this list.
// ⚠️ This test FAILS on a missing asset (skips only when the whole folder is absent); it does not copy them. Fix: npm run predev (runs the child's fetchAssets.sh).
// ⚠️ rapper never reaches into ReTreever at runtime — assets must be rapper's own real files, never a fallback path into ReTreever's static/.

const RAPPER_ROOT = fileURLToPath(new URL("../../..", import.meta.url));
const ASSETS = join(RAPPER_ROOT, "static", "mobileAssets");

// witness = one real file per group, not just the folder — cp -R interrupted halfway leaves an empty dir that a folder-only check would pass.
const REQUIRED: ReadonlyArray<{ group: string; witness: string; why: string }> = [
	{
		group: "worldBase",
		witness: "worldBase/base/tiles/6/18/23.pbf",
		why: "the offline basemap draws nothing without the tile pyramid",
	},
	{
		group: "worldBase glyphs",
		witness: "worldBase/glyphs/Noto Sans Regular/0-255.pbf",
		why: "MapLibre re-requests a missing glyph range on every tile, forever",
	},
];

// A fresh clone has no copied assets (the folder is gitignored), so the presence checks skip there instead of
// failing every suite run that never ran predev; a half-copied folder still fails.
const PRESENT = existsSync(ASSETS);
if (!PRESENT) {
	console.warn(
		`assetsPresent: skipped, ${ASSETS} is absent (a fresh clone). ` +
			"Fix before serving the map: npm run predev  (runs getCache_OfflineMap/fetchAssets.sh)",
	);
}

// The title carries the reason too: rapper's silent "passed-only" hides the warning above.
const SERVES = PRESENT
	? "rapper serves the assets its mounted child asks for"
	: "rapper serves the assets its mounted child asks for — SKIPPED: static/mobileAssets is absent, run npm run predev";

describe.skipIf(!PRESENT)(SERVES, () => {
	for (const { group, witness, why } of REQUIRED) {
		it(`serves ${group}`, () => {
			const path = join(ASSETS, witness);
			expect(
				existsSync(path),
				`Missing ${witness} — ${why}.\n` +
					"Fix: npm run predev  (runs getCache_OfflineMap/fetchAssets.sh)",
			).toBe(true);
			// ⚠️ A 0-byte file passes existsSync but is still broken — the browser can't decode an empty reply.
			expect(statSync(path).size, `${witness} is 0 bytes — a placeholder, not the asset`).toBeGreaterThan(0);
		});
	}

	it("does not reach into ReTreever at runtime", () => {
		// ⚠️ Assets must be rapper's own files, never symlinks — a symlink passes here but breaks for everyone else, and SvelteKit dies at build time on a dangling one.
		for (const entry of readdirSync(ASSETS, { withFileTypes: true })) {
			expect(
				entry.isSymbolicLink(),
				`static/mobileAssets/${entry.name} is a symlink. These must be real ` +
					"files inside rapper: a link makes the app depend on a sibling " +
					"checkout existing at a particular path on one machine.",
			).toBe(false);
		}
	});
});

describe("rapper keeps its copied assets out of git", () => {
	it("keeps the copied assets out of git", () => {
		const gitignore = join(RAPPER_ROOT, ".gitignore");
		const text = existsSync(gitignore) ? readFileSync(gitignore, "utf8") : "";
		expect(
			/^static\/mobileAssets\/?$/m.test(text),
			"static/mobileAssets/ is not in rapper/.gitignore.\n" +
				"It is ~49 MB across ~3600 binary files, copied from ReTreever/static, " +
				"which stays the single source of truth. Committing it forks that source.",
		).toBe(true);
	});
});
