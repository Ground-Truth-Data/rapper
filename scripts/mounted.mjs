// The ONE child this rapper mounts, or undefined in the workspace checkout (every child served from src/routes).
// Written by the installer as rapper/mounted.json; kept inside rapper so nothing here reaches above its own folder.
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const FILE = fileURLToPath(new URL("../mounted.json", import.meta.url));

/** @returns {string | undefined} the child's folder name, e.g. "getCache_OfflineMap" */
export function mountedChild() {
	if (!existsSync(FILE)) return undefined;
	const { child } = JSON.parse(readFileSync(FILE, "utf8"));
	if (typeof child !== "string" || !child) throw new Error(`${FILE}: "child" must name a folder beside rapper`);
	return child;
}

/**
 * SvelteKit's `files` for this rapper. The three keys follow the tree together:
 * pointing `routes` alone loses a child's matchers and, silently, its reroute hook.
 */
export function kitFiles() {
	const tree = mountedChild() ? `../${mountedChild()}` : "src";
	return {
		routes: `${tree}/routes`,
		params: `${tree}/params`,
		hooks: { universal: `${tree}/hooks`, server: "src/hooks.server" },
	};
}
