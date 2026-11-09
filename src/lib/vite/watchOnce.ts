import type { Plugin } from "vite";

type Paths = string | readonly string[];
type Watcher = { add(p: Paths): unknown; unwatch(p: Paths): unknown };

/** The watcher's `add`, passing each path through once. */
export function addOnce<W extends Watcher>(w: W): W["add"] {
	const seen = new Set<string>();
	const add = w.add.bind(w);
	const unwatch = w.unwatch.bind(w);
	w.unwatch = (p: Paths) => {
		for (const x of [p].flat()) seen.delete(x);
		return unwatch(p);
	};
	return (p: Paths) => {
		const fresh = [p].flat().filter((x) => !seen.has(x) && seen.add(x));
		return fresh.length ? add(fresh) : w;
	};
}

/**
 * Chokidar's macOS (fsevents) watcher adds a fresh listener every time it is
 * asked to watch a path it already watches, and every file event runs every
 * listener. Tailwind re-adds each scanned file, and Vite each import outside
 * the root, on every CSS regeneration: two hours of edits grew :5173 to 585,779
 * listeners and 100% CPU, answering nothing (9 Nov 2026).
 */
export function watchOnce(): Plugin {
	return {
		name: "watch-once",
		apply: "serve",
		configureServer(server) {
			server.watcher.add = addOnce(server.watcher);
		},
	};
}
