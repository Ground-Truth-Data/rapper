/**
 * WHETHER THE SIDE DOCKS ARE ON SCREEN — one answer, shared by every dock.
 *
 * NOT A DELETE SWITCH. The docks are working instruments; this decides only
 * whether they are in the way right now. `import.meta.env.DEV` already keeps
 * them out of every build, so nothing here affects what ships — a reader who
 * finds the docks hidden is looking at a folded panel, not dead code.
 *
 * ONE MODULE, NOT A PROP, for the reason trayHost is one: the docks mount deep
 * inside a page's own markup, several components apart, and the tab that
 * unfolds them lives outside all of them. A prop would have to be threaded
 * through every ancestor of both.
 *
 * `?docks=1` / `?docks=0` force the state for one load; otherwise the last
 * fold is remembered per tab. sessionStorage, not local: a fresh tab starts
 * open, so the instruments cannot go missing for a week because of a fold
 * nobody remembers making. Read after mount — the docks render on the server
 * too, and the URL is the only input both sides can agree on.
 */
const KEY = "rt-docks-folded";

export const dockFold = $state<{ folded: boolean }>({ folded: false });

/** Call once, after mount, with the page URL. Later calls are ignored. */
let settled = false;
export function initDockFold(url: URL): void {
	if (settled) return;
	settled = true;
	const param = url.searchParams.get("docks");
	if (param !== null) {
		dockFold.folded = param === "0";
		return;
	}
	try {
		dockFold.folded = sessionStorage.getItem(KEY) === "1";
	} catch {
		// Private windows throw on access; an unreadable preference is just "open".
	}
}

export function toggleDockFold(): void {
	dockFold.folded = !dockFold.folded;
	try {
		sessionStorage.setItem(KEY, dockFold.folded ? "1" : "0");
	} catch {
		// Fold still applies for this page; only the memory of it is lost.
	}
}
