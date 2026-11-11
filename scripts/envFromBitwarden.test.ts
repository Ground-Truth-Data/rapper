// The wall must see SvelteKit's $env reads: varlock's audit scans only process.env and import.meta.env.
// Run with bws off the PATH and VERCEL set, so the committed block stands and no vault is asked.
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, it } from "vitest";

const SCRIPT = path.join(import.meta.dirname, "envFromBitwarden.mjs");

function wall(source: string) {
	const dir = mkdtempSync(path.join(tmpdir(), "envwall-"));
	mkdirSync(path.join(dir, "src"));
	writeFileSync(
		path.join(dir, ".env.schema"),
		"# --- Bitwarden block: written from `bws secret list` by rapper/scripts/envFromBitwarden.mjs. Hand edits here are overwritten. ---\n" +
			"# @auditIgnore @sensitive\nIN_VAULT=\n# --- end Bitwarden block ---\n",
	);
	writeFileSync(path.join(dir, "src/server.ts"), source);
	return spawnSync(process.execPath, [SCRIPT], { cwd: dir, encoding: "utf8", env: { HOME: dir, PATH: "/nonexistent", VERCEL: "1" } });
}

it("refuses a name read through $env that the vault lacks", () => {
	const run = wall('import { env } from "$env/dynamic/private";\nexport const a = env.IN_VAULT;\nexport const b = env.NOT_IN_VAULT;\n');
	expect(run.status).toBe(1);
	expect(run.stderr).toContain("NOT_IN_VAULT");
	expect(run.stderr).not.toContain("IN_VAULT,");
});

it("refuses a named import from $env/static/private too", () => {
	const run = wall('import { IN_VAULT, MISSPELT_KEY } from "$env/static/private";\n');
	expect(run.status).toBe(1);
	expect(run.stderr).toContain("MISSPELT_KEY");
});

it("passes every $env read the schema declares", () => {
	const run = wall('import { env } from "$env/dynamic/private";\nexport const a = env.IN_VAULT;\n');
	expect(run.stderr).not.toContain("$env");
});
