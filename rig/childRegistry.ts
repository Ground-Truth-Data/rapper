/**
 * Every child, one record each, keyed by path. Names no tier, host, port or
 * parent repo, so either tier reads it verbatim.
 */

export type ChildRecord = {
	/** The repo name exactly as on GitHub; also the display label. */
	repo: string;
	org: string;
	/** Short human name for the bar. */
	name: string;
	/** The product this child belongs to — the bar's title beside the logo. */
	owner: string;
	/** Logo filename inside sharedAssets/ — a name, not a path, resolved by the mounting parent. */
	logo: string;
	/** Tab-icon filename, resolved like `logo`; absent means the logo is the icon. */
	icon?: string;
	/** Every pathname this child serves, longest-prefix matched; mirrors its routes/ folder. */
	paths: string[];
	/** A mounting tier: in the lookup for its link, excluded from every path-driven answer. */
	tier?: boolean;
	/** Served under APP_PREFIX by every parent; `paths` still spell the flat routes/ folder. */
	app?: true;
	/** Where this child starts when mounted alone. Declared, never inferred. */
	defaultPath?: string;
	/** Paths no parent mirrors — the standalone preview; excluded from the tier table. */
	soloPaths?: string[];
	/** This child's nav buttons, resolved by which child owns the live pathname. */
	views?: NavView[];
};

export type NavView = {
	/** Pathname on the mounting tier; must be one in `paths`. */
	href: string;
	/** Lowercase, terse: dev chrome, not product UI. */
	label: string;
};

/** Where every tier mounts the Get Cache app — one prefix, every environment. */
export const APP_PREFIX = "/app";

export const CHILDREN: ChildRecord[] = [
	{
		repo: "rapper",
		org: "Ground-Truth-Data",
		name: "rapper",
		owner: "rapper",
		logo: "rapper.webp",
		paths: [],
		tier: true,
	},
	{
		repo: "ReTreever",
		org: "Ground-Truth-Data",
		name: "ReTreever",
		owner: "ReTreever",
		logo: "ReTreever_logo_sm.webp",
		paths: [],
		tier: true,
	},
	{
		repo: "ReTreever_who_what",
		org: "Ground-Truth-Data",
		name: "who_what",
		owner: "ReTreever",
		logo: "ReTreever_logo_sm.webp",
		paths: ["/", "/who", "/what"],
		defaultPath: "/who",
		soloPaths: ["/"],
		views: [
			{ href: "/who", label: "who" },
			{ href: "/what", label: "what" },
		],
	},
	{
		repo: "getCache_OfflineMap",
		app: true,
		org: "Ground-Truth-Data",
		name: "offline map",
		owner: "Get Cache",
		logo: "GC_fly_logo_transparent.webp",
		icon: "favicon.png",
		paths: ["/", "/offlinev10"],
		defaultPath: "/offlinev10",
		soloPaths: ["/"],
		views: [],
	},
	{
		repo: "getCache_OnlineMap",
		app: true,
		org: "Ground-Truth-Data",
		name: "online map",
		owner: "Get Cache",
		logo: "GC_fly_logo_transparent.webp",
		icon: "favicon.png",
		paths: ["/", "/map", "/georef"],
		defaultPath: "/map",
		soloPaths: ["/"],
		views: [],
	},
	{
		repo: "ReTreever_where",
		org: "Ground-Truth-Data",
		name: "where",
		owner: "ReTreever",
		logo: "ReTreever_logo_sm.webp",
		// /where/orgs and /where/projects come from one dynamic route ([view=whereView]).
		paths: ["/", "/where", "/where/orgs", "/where/projects"],
		defaultPath: "/where",
		soloPaths: ["/"],
		views: [
			{ href: "/where", label: "where" },
			{ href: "/where/orgs", label: "orgs" },
			{ href: "/where/projects", label: "projects" },
		],
	},
];

/** The child serving this pathname, longest-prefix; undefined for a parent's own page. */
export function childForPath(pathname: string): ChildRecord | undefined {
	if (pathname === APP_PREFIX || pathname.startsWith(APP_PREFIX + "/")) {
		pathname = pathname.slice(APP_PREFIX.length) || "/";
	}
	let best: ChildRecord | undefined;
	let bestLen = -1;
	for (const c of CHILDREN) {
		if (c.tier) continue;
		for (const p of c.paths) {
			const hit = pathname === p || pathname.startsWith(p + "/");
			if (hit && p.length > bestLen) {
				best = c;
				bestLen = p.length;
			}
		}
	}
	return best;
}

/** Where a parent serves one of a child's paths: `/app/offlinev10` for a Get Cache child, `/who` otherwise. */
export function mountPath(child: ChildRecord, path: string = child.defaultPath ?? "/"): string {
	if (!child.app) return path;
	return path === "/" ? APP_PREFIX : APP_PREFIX + path;
}

export function childByRepo(repo: string): ChildRecord | undefined {
	return CHILDREN.find((c) => c.repo === repo);
}

export function githubUrl(child: ChildRecord): string {
	return `https://github.com/${child.org}/${child.repo}`;
}

