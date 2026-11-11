// Law (fetch TreePS/KANBAN.md): money shows plain "$", never US$, CA$ or AU$. rapper's pre-push hook
// (gitEr/installHooks.sh) runs this file and refuses the push on red.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";

// A country's letters glued to a $, but not a template's `${` or a rune's `$state`.
const PREFIXED = /(?<![\p{L}\p{N}_])\p{Lu}{1,3}\$(?![{\p{L}_])/u;
const UI = /\.(svelte|ts|js|mjs|html|css|json)$/;
const SKIP = new Set(["node_modules", ".git", ".svelte-kit", "build", "dist", "package-lock.json", "plainDollar.test.ts"]);

test("no UI source writes a prefixed dollar", () => {
	const hits: string[] = [];
	const walk = (dir: string) => {
		for (const e of readdirSync(dir, { withFileTypes: true })) {
			if (SKIP.has(e.name)) continue;
			const p = join(dir, e.name);
			if (e.isDirectory()) walk(p);
			else if (UI.test(e.name))
				readFileSync(p, "utf8").split("\n").forEach((line, i) => PREFIXED.test(line) && hits.push(`${p}:${i + 1}: ${line.trim()}`));
		}
	};
	walk(join(import.meta.dirname, ".."));
	expect(hits).toEqual([]);
});
