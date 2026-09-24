/**
 * Where this page lives under the other tier. The two tiers serve different
 * routes, so each parent passes its own translation table in; this file names
 * no tier, host or repo, and a child cloned alone hands none and gets no pill.
 */

/** One route this tier serves, and what it corresponds to elsewhere. */
export type TierRoute = {
	/** A pathname on THIS tier, matched longest-prefix. */
	path: string;
	/** The pathname on the OTHER tier showing the same thing; omit when none. */
	otherPath?: string;
	/** The child repo backing this view, for the GitHub link. */
	repo?: string;
	/** The origin serving `otherPath` when a tier splits by hostname. */
	otherOrigin?: string;
};

/** Last-resort fallback: "/" resolves to something on any server. */
export const TIER_HOME = "/";

/** Longest-prefix match, so /who/acme finds the /who entry. */
function matchRoute(pathname: string, routes: TierRoute[]): TierRoute | undefined {
	let best: TierRoute | undefined;
	for (const r of routes) {
		const hit = r.path === "/" ? pathname === "/" : pathname === r.path || pathname.startsWith(r.path + "/");
		if (!hit) continue;
		if (!best || r.path.length > best.path.length) best = r;
	}
	return best;
}

/**
 * The other tier's pathname for the current page; unlisted falls back to
 * `otherHome`, which only the tier being linked to knows.
 */
export function otherTierPath(
	pathname: string,
	routes: TierRoute[],
	otherHome: string = TIER_HOME,
): string {
	return matchRoute(pathname, routes)?.otherPath ?? otherHome ?? TIER_HOME;
}

/** The origin serving this page on the other tier; undefined = the tier's default. */
export function otherTierOrigin(
	pathname: string,
	routes: TierRoute[],
): string | undefined {
	return matchRoute(pathname, routes)?.otherOrigin;
}

/** The child repo backing the current page, or undefined for a parent's own page. */
export function currentRepo(pathname: string, routes: TierRoute[]): string | undefined {
	return matchRoute(pathname, routes)?.repo;
}

/** Whether the table maps this page across, as opposed to substituting home. */
export function servesOtherSide(pathname: string, routes: TierRoute[]): boolean {
	return matchRoute(pathname, routes)?.otherPath !== undefined;
}

export type OtherSideStatus = "serves" | "missing" | "unknown";

/**
 * HEAD the page on the other tier: a rapper install serves one child, a subset
 * of what the table lists. Dev only — the sole caller is behind
 * `import.meta.env.DEV`. Failure is "unknown", never "missing", so the pill
 * stays live rather than greying out a destination that may be fine.
 */
export async function probeOtherSide(
	origin: string,
	path: string,
	fetchImpl: typeof fetch = fetch,
): Promise<OtherSideStatus> {
	try {
		const res = await fetchImpl(origin + path, {
			method: "HEAD",
			credentials: "omit",
			cache: "no-store",
		});
		if (res.status === 404) return "missing";
		if (res.ok) return "serves";
		// A 5xx means the route exists and is broken, not that it is missing.
		return res.status >= 500 ? "serves" : "unknown";
	} catch {
		return "unknown";
	}
}
