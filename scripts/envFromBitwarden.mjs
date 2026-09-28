#!/usr/bin/env node
// Regenerates the current repo's .env from .env.schema and fails the build
// when schema, code and Bitwarden disagree. npm runs it as `prebuild` with the
// repo root as cwd.
//
// Vite inlines PUBLIC_*/VITE_* values by scanning .env on disk, before any
// process (varlock included) can inject them — so those keys, and only those,
// are written to a generated .env. Everything else reaches the process through
// `varlock run` and never touches disk.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const SCHEMA = ".env.schema";
const ENV = ".env";
// Names a framework forces onto the browser side; the rest of the key is still Bitwarden's name.
const FORCED_PREFIXES = ["PUBLIC_", "VITE_"];
const KEY_LINE = /^([A-Za-z_][A-Za-z0-9_]*)=/gm;

const BANNER = `# ############################################################################
# #  GENERATED — DO NOT EDIT. THIS FILE IS OVERWRITTEN ON EVERY BUILD.       #
# #  Written by rapper/scripts/envFromBitwarden.mjs from .env.schema.        #
# #  Secrets go in Bitwarden Secrets Manager. Names go in .env.schema.       #
# #  A key here that .env.schema does not declare FAILS the next build.      #
# ############################################################################
`;

const fail = (msg) => {
	console.error(`\n✘ envFromBitwarden: ${msg}\n`);
	process.exit(1);
};

// varlock exports no package.json; walk up from its entry file to its bin.
let varlockDir = path.dirname(createRequire(import.meta.url).resolve("varlock"));
while (!existsSync(path.join(varlockDir, "bin/cli.js"))) {
	const up = path.dirname(varlockDir);
	if (up === varlockDir) fail("cannot locate varlock's bin/cli.js from its package entry.");
	varlockDir = up;
}
const varlockBin = path.join(varlockDir, "bin/cli.js");
const varlock = (args, opts = {}) =>
	spawnSync(process.execPath, [varlockBin, ...args], { encoding: "utf8", ...opts });

if (!existsSync(SCHEMA)) {
	fail(`${process.cwd()} has no ${SCHEMA}. Every repo that reads a secret declares it there.`);
}
const schemaSrc = readFileSync(SCHEMA, "utf8");
const schemaKeys = [...schemaSrc.matchAll(KEY_LINE)].map((m) => m[1]);
const bitwardenKeys = new Map(
	[...schemaSrc.matchAll(/^([A-Za-z_][A-Za-z0-9_]*)=bitwarden\("([0-9a-f-]{36})"\)/gm)].map(
		(m) => [m[1], m[2]],
	),
);
if (schemaKeys.length === 0) fail(`${SCHEMA} declares no keys — this proves nothing.`);

// A hand-added key would be silently lost on regeneration; refuse instead.
if (existsSync(ENV)) {
	const declared = new Set(schemaKeys);
	const stray = [...readFileSync(ENV, "utf8").matchAll(KEY_LINE)]
		.map((m) => m[1])
		.filter((k) => !declared.has(k));
	if (stray.length) {
		fail(
			`${ENV} holds ${stray.join(", ")}, not declared in ${SCHEMA}.\n` +
				`  ${ENV} is generated. Put the secret in Bitwarden and its name in ${SCHEMA}, never here.`,
		);
	}
}

// -p resolves from the schema ALONE. A value already sitting in .env would
// otherwise win over Bitwarden, and a rotated secret would never arrive.
const load = varlock(["load", "--format", "json", "-p", SCHEMA]);
if (load.status !== 0) fail(`varlock could not resolve ${SCHEMA}:\n${load.stderr || load.stdout}`);
const resolved = JSON.parse(load.stdout);

const unresolved = [...bitwardenKeys.keys()].filter((k) => !resolved[k]);
if (unresolved.length) {
	fail(
		`Bitwarden returned no value for: ${unresolved.join(", ")}.\n` +
			"  Check the UUID and that this machine account can read that secret.",
	);
}

const audit = varlock(["audit"], { stdio: "inherit", encoding: undefined });
if (audit.status !== 0) fail("varlock audit found schema/code drift (above).");

const buildTime = schemaKeys.filter(
	(k) => FORCED_PREFIXES.some((p) => k.startsWith(p)) && resolved[k],
);
writeFileSync(ENV, BANNER + buildTime.map((k) => `${k}=${resolved[k]}`).join("\n") + "\n");
console.log(
	`✓ envFromBitwarden: ${bitwardenKeys.size} Bitwarden pointers resolved, audit clean, ` +
		`${ENV} regenerated with ${buildTime.length} build-time keys.`,
);

// Last, so everything above is proven first. Bitwarden's name is THE name: a
// mismatch is fixed in the schema and the code, never by renaming the secret.
// Needs the bws CLI; where it is absent (Vercel) this is reported as skipped,
// never as passed.
const bws = spawnSync("bws", ["secret", "list", "--output", "json"], {
	encoding: "utf8",
	env: { ...process.env, BWS_ACCESS_TOKEN: resolved.BWS_ACCESS_TOKEN ?? process.env.BWS_ACCESS_TOKEN },
});
if (bws.error?.code === "ENOENT") {
	console.warn("⚠ envFromBitwarden: bws CLI not on PATH — schema-name vs Bitwarden-name check SKIPPED.");
	process.exit(0);
}
if (bws.status !== 0) fail(`bws secret list failed:\n${bws.stderr}`);
const nameByUuid = new Map(JSON.parse(bws.stdout).map((s) => [s.id, s.key]));
const wrong = [];
for (const [key, uuid] of bitwardenKeys) {
	const name = nameByUuid.get(uuid);
	if (!name) {
		wrong.push(`${key}: no Bitwarden secret has UUID ${uuid}`);
		continue;
	}
	const bare = FORCED_PREFIXES.reduce((k, p) => (k.startsWith(p) ? k.slice(p.length) : k), key);
	if (key !== name && bare !== name) {
		wrong.push(
			`${key}: Bitwarden calls it "${name}" — rename the KEY in ${SCHEMA} and the code to "${name}" ` +
				`(prefix allowed: ${FORCED_PREFIXES.map((p) => p + name).join(" / ")}). Never rename the secret.`,
		);
	}
}
if (wrong.length) fail(`schema names do not match Bitwarden:\n  ${wrong.join("\n  ")}`);
console.log(`✓ envFromBitwarden: ${bitwardenKeys.size} schema keys match their Bitwarden name.`);
