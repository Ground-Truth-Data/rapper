/** The build stops when a path climbs out of its repo, a child reaches outside itself, or an import's case is wrong. */

import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, expect, test } from "vitest";
import { noEscapeHatch } from "./noEscapePlugin";

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
