import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Alias } from "vite";

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Vite aliases from a `$name` → path table, matched as Kit's retired `config.alias` matched them: first match wins. */
export function kitAlias(root: string, table: Record<string, string>): Alias[] {
	return Object.entries(table).map(([key, target]) => {
		const to = resolve(root, target.replace(/\/\*$/, ""));
		if (key.endsWith("/*")) return { find: new RegExp(`^${esc(key.slice(0, -2))}/(.+)$`), replacement: `${to}/$1` };
		return { find: `${key}/*` in table ? new RegExp(`^${esc(key)}$`) : key, replacement: to };
	});
}

/** tsconfig.json's `paths`, so the types and the bundle read one table. Whole-line `//` comments only: anything else throws. */
export function tsconfigPaths(root: string): Record<string, string> {
	const json = readFileSync(resolve(root, "tsconfig.json"), "utf8").replace(/^\s*\/\/.*$/gm, "");
	const paths: Record<string, string[]> = JSON.parse(json).compilerOptions.paths;
	return Object.fromEntries(Object.entries(paths).map(([k, [v]]) => [k, v]));
}
