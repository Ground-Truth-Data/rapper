// Where each parent pill goes: the last TOOL you used under it, so switching
// ReTreever → Foundr → ReTreever lands you back on the screen you left rather
// than on the parent's default. Path plus query, because ?site= (Foundr) and
// ?type= (Orgs) are part of where you were.
//
// localStorage, not the URL or a cookie: this is one browser's habit, not a
// link worth sending anyone and not something the server needs to know.

import { activeParent, activeTool } from "./adminRoutes";

const hasStorage = () => typeof localStorage !== "undefined";
const key = (parent: string) => `admin:lastTool:${parent}`;

export function rememberTool(parent: string, pathWithSearch: string): void {
	if (!hasStorage()) return;
	try {
		localStorage.setItem(key(parent), pathWithSearch);
	} catch {
		/* private mode / quota — the pill just falls back to home */
	}
}

/** Null for a page no tool of this parent owns any more: a remembered address outlives the page it named. */
export function lastTool(parent: string): string | null {
	if (!hasStorage()) return null;
	let t: string | null;
	try {
		t = localStorage.getItem(key(parent));
	} catch {
		return null;
	}
	const path = t?.split(/[?#]/)[0] ?? "";
	return t && activeTool(path) && activeParent(path).key === parent ? t : null;
}
