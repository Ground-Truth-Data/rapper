// The wall must see $app/env reads: varlock's audit scans only process.env and import.meta.env.
// Run with bws off the PATH and VERCEL set, so the committed block stands and no vault is asked.
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, it } from "vitest";

const SCRIPT = path.join(import.meta.dirname, "envFromBitwarden.mjs");

function wall(source: string) {
	const dir = mkdtempSync(path.join(tmpdir(), "envwall-"));
	mkdirSync(path.join(dir, "src"));
	writeFileSync(
		path.join(dir, ".env.schema"),
		"# @sensitive @internal @required\nSECRET_TOKEN=\n# @required\nMUST_HAVE=\nPUBLIC_KNOB=\n" +
			"# --- Bitwarden block: written from `bws secret list` by rapper/scripts/envFromBitwarden.mjs. Hand edits here are overwritten. ---\n" +
			"# @auditIgnore @sensitive\nIN_VAULT=\n# --- end Bitwarden block ---\n",
	);
	writeFileSync(path.join(dir, "src/server.ts"), source);
	return { dir, ...spawnSync(process.execPath, [SCRIPT], { cwd: dir, encoding: "utf8", env: { HOME: dir, PATH: "/nonexistent", VERCEL: "1" } }) };
}

it("refuses a name read through $app/env that the vault lacks", () => {
	const run = wall('import * as env from "$app/env/private";\nexport const a = env.IN_VAULT;\nexport const b = env.NOT_IN_VAULT;\n');
	expect(run.status).toBe(1);
	expect(run.stderr).toContain("NOT_IN_VAULT");
	expect(run.stderr).not.toContain("IN_VAULT,");
});

it("refuses a named import from $app/env/private too", () => {
	const run = wall('import { IN_VAULT, MISSPELT_KEY } from "$app/env/private";\n');
	expect(run.status).toBe(1);
	expect(run.stderr).toContain("MISSPELT_KEY");
});

it("passes every env read the schema declares", () => {
	const run = wall('import * as env from "$app/env/private";\nexport const a = env.IN_VAULT;\n');
	expect(run.stderr).not.toContain("$app/env");
});

it("writes src/env.ts from the schema: PUBLIC_ and marked names required, the rest optional", () => {
	const run = wall("export {};\n");
	const env = readFileSync(path.join(run.dir, "src/env.ts"), "utf8");
	expect(env).toContain("\tIN_VAULT: { schema: optional },");
	expect(env).toContain("\tMUST_HAVE: {},");
	expect(env).toContain("\tPUBLIC_KNOB: { public: true, static: true },");
	expect(env).not.toContain("SECRET_TOKEN");
});
