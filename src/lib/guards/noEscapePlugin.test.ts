/** The build stops when a path climbs out of its repo, a child reaches outside itself, or an import's case is wrong. */

import { existsSync, mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { beforeAll, expect, test } from "vitest";
import { noEscapeHatch } from "./noEscapePlugin";
import { workspaceRoot } from "./workspaceRoot";

// A workspace: a parent repo, a child (it has lib/), and a package.
let ws: string;
let resolve: (source: string, importer?: string) => unknown;
const file = (p: string) => {
	mkdirSync(join(ws, p, ".."), { recursive: true });
	writeFileSync(join(ws, p), "");
	return join(ws, p);
};

beforeAll(() => {
	ws = mkdtempSync(join(tmpdir(), "noescape-"));
	for (const p of ["parent/src/a.ts", "parent/src/Shared.ts", "child/lib/x.ts", "child/lib/y.ts", "child/routes/r.ts", "parent/node_modules/pkg/i.js", "outside.ts"]) file(p);
	const plugin = noEscapeHatch(ws);
	resolve = (source, importer) => (plugin.resolveId as (s: string, i?: string) => unknown)(source, importer);
});

const a = () => join(ws, "parent/src/a.ts");
const x = () => join(ws, "child/lib/x.ts");

test("it only watches: an allowed import resolves to nothing of its own", () => {
	expect(resolve("./Shared.ts", a())).toBeNull();
	expect(resolve("../../child/lib/x.ts", a())).toBeNull();
	expect(resolve("./y.ts", x())).toBeNull();
	expect(resolve("../routes/r.ts?raw", x())).toBeNull();
});

test("packages, entry points, virtual modules and code inside node_modules are not its business", () => {
	expect(resolve("svelte", a())).toBeNull();
	expect(resolve("/src/lib/x.ts", a())).toBeNull();
	expect(resolve("./a.ts")).toBeNull();
	expect(resolve("./z.ts", "\0virtual:thing")).toBeNull();
	expect(resolve("../../../../anywhere.js", join(ws, "parent/node_modules/pkg/i.js"))).toBeNull();
	expect(resolve("../../parent/node_modules/pkg/i.js", x())).toBeNull();
});

test("a parent's raw climb out of the workspace stops the build", () => {
	expect(() => resolve("../../../elsewhere.ts", a())).toThrow("RAW PATH ESCAPED THE REPO");
});

test("a child reaching into a parent, or anywhere outside itself, stops the build", () => {
	expect(() => resolve("../../parent/src/a.ts", x())).toThrow("A CHILD REACHED OUTSIDE ITSELF");
	expect(() => resolve("../../outside.ts", x())).toThrow(/A CHILD REACHED OUTSIDE ITSELF[\s\S]*allowed: child\/\*\*/);
});

// Only a case-insensitive disk opens the wrong spelling; on Linux the import fails on its own.
test.skipIf(!existsSync(tmpdir().toUpperCase()))("an import whose case differs from the disk stops the build", () => {
	expect(() => resolve("./shared.ts", a())).toThrow("IMPORT CASE DOES NOT MATCH DISK");
	expect(() => resolve("./shared.ts?url", a())).toThrow("IMPORT CASE DOES NOT MATCH DISK");
	expect(resolve("./Shared.ts", a())).toBeNull();
});

// A tab's worktree (`fetch/.wt/<tab>/<tier>`) links the siblings into the live workspace, and vite hands the guard
// their real paths, so the guard must be given the workspace a config finds by search, not by its own position.
test("a tab worktree's linked sibling may import itself; a child cloned alone still may not climb out", () => {
	const fetch = mkdtempSync(join(tmpdir(), "noescape-tab-"));
	writeFileSync(join(fetch, "package.json"), JSON.stringify({ workspaces: ["tier", "sib"] }));
	for (const p of ["sib/lib/a.ts", "sib/lib/b.ts", "tier/src/x.ts", ".wt/t/tier/src/x.ts"]) {
		mkdirSync(join(fetch, p, ".."), { recursive: true });
		writeFileSync(join(fetch, p), "");
	}
	symlinkSync(join(fetch, "sib"), join(fetch, ".wt/t/sib"));
	const tab = noEscapeHatch(workspaceRoot(pathToFileURL(join(fetch, ".wt/t/tier/vite.config.ts")).href));
	const inTab = (source: string, importer: string) => (tab.resolveId as (s: string, i?: string) => unknown)(source, importer);
	expect(inTab("./b.ts", join(fetch, "sib/lib/a.ts"))).toBeNull();
	expect(inTab("../../sib/lib/a.ts", join(fetch, ".wt/t/tier/src/x.ts"))).toBeNull();

	const alone = mkdtempSync(join(tmpdir(), "noescape-alone-"));
	mkdirSync(join(alone, "child/lib"), { recursive: true });
	const lone = noEscapeHatch(alone);
	expect(() => (lone.resolveId as (s: string, i?: string) => unknown)("../../outside.ts", join(alone, "child/lib/x.ts"))).toThrow(
		"A CHILD REACHED OUTSIDE ITSELF",
	);
});
