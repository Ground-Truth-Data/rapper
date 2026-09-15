import { sveltekit } from "@sveltejs/kit/vite";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import { noEscapeHatch } from "./src/lib/guards/noEscapePlugin";
import { noRawCamera } from "./src/lib/guards/noRawCameraPlugin";
import { CHILDREN, childByRepo, mountPath } from "./rig/childRegistry";
import { mountedChild } from "./scripts/mounted.mjs";

// No PWA plugin here on purpose — Get Cache is a Capacitor native app, no service worker/manifest needed; one left here before silently shipped an unused SW until it crossed workbox's precache limit and broke the build.

const mountedChildRepo = (): string | undefined => mountedChild();

// The scaffold's one child, or every non-tier record in the workspace checkout.
function mountedChildRepos(): string[] {
	const one = mountedChildRepo();
	return one ? [one] : CHILDREN.filter((c) => !c.tier).map((c) => c.repo);
}

function mountedChildRoutes() {
	// Other tier is split across THREE hostnames, not one origin — VITE_OTHER_ORIGIN alone is wrong for routes like /offline that live on the getcache host instead.
	const GETCACHE_ORIGIN = "http://getcache.localhost:5173";

	return mountedChildRepos().flatMap((repo) => {
		const rec = childByRepo(repo);
		if (!rec) return [];
		const solo = rec.soloPaths ?? [];
		// Mirrored views are spelled identically across tiers, so each row is the identity; "/" and solo paths exist only on this side and would 404 on the other.
		return rec.paths
			.filter((p) => p !== "/" && !solo.includes(p))
			.map((p) => ({
				path: mountPath(rec, p),
				otherPath: mountPath(rec, p),
				repo,
				...(rec.app ? { otherOrigin: GETCACHE_ORIGIN } : {}),
			}));
	});
}

// First MIRRORED path — a solo path exists only on this side and would 404 on the other; none at all → "/".
function otherHome(): string {
	return mountedChildRoutes()[0]?.otherPath ?? "/";
}

// Vite's printed URL isn't where the app starts — "/" reroutes to the landing view. Workspace mode lands on the first child, which src/hooks.ts must agree with.
function childLandingPath(): string | undefined {
	const rec = childByRepo(mountedChildRepos()[0] ?? "");
	return rec ? mountPath(rec) : undefined;
}

// Reads the OS-granted port after "listening", not the configured one — Vite falls back to 5175/5176+ when 5174 is taken, exactly when two instances are running and the ports most need telling apart.
function printLandingUrl() {
	return {
		name: "rapper-landing-url",
		apply: "serve" as const,
		configureServer(server: {
			httpServer: { once: (e: string, cb: () => void) => void } | null;
			config: { logger: { info: (msg: string) => void } };
		}) {
			const landing = childLandingPath();
			if (!landing || !server.httpServer) return;
			server.httpServer.once("listening", () => {
				const addr = (server.httpServer as unknown as {
					address: () => { port: number } | null;
				}).address();
				if (!addr) return;
				// setTimeout(0) so this lands after Vite's own "ready in" banner, not in the middle of it.
				setTimeout(() => {
					server.config.logger.info(
						`  \x1b[32m➜\x1b[0m  \x1b[1mStart here:\x1b[0m http://localhost:${addr.port}${landing}`,
					);
				}, 0);
			});
		},
	};
}

export default defineConfig(({ command }) => {
// Tier facts must be gated HERE, at the define substitution — gating only the consuming component's markup still leaves dev-only origins inlined into the production bundle.
// Gated on a filesystem fact (sibling ReTreever checkout), not command === "serve" — an npm install is a dev build with exactly one tier, and gating on dev mode alone pointed the pill at a nonexistent retreever.localhost origin.
const hasSiblingParent = existsSync(
	fileURLToPath(new URL("../ReTreever/svelte.config.js", import.meta.url)),
);

const dev = command === "serve" && hasSiblingParent;
const tierFacts = dev
	? {
		"import.meta.env.VITE_RAPPER_TIER": JSON.stringify("rapper"),
		"import.meta.env.VITE_OTHER_TIER": JSON.stringify("retreever"),
		"import.meta.env.VITE_OTHER_ORIGIN": JSON.stringify(
			"http://retreever.localhost:5173",
		),
		// NOT "/" — ReTreever's "/" is its marketing homepage, not the search this child mirrors (that's /who), so falling back to "/" would land on a working but wrong page.
		"import.meta.env.VITE_OTHER_HOME": JSON.stringify(otherHome()),
		// Route table is derived from the mounted child (svelte.config.js + registry), not hand-typed — hand-typed rows drift from whichever child is actually mounted. Double JSON.stringify: define pastes this as literal source, so it must serialize to valid JS.
		"import.meta.env.VITE_TIER_ROUTES": JSON.stringify(
			JSON.stringify(mountedChildRoutes()),
		),
		// Slot is FIXED per tier (retreever left, rapper right), not by "me" — otherwise the halves swap sides between ports and the control moves under the cursor.
		"import.meta.env.VITE_TIER_SLOT": JSON.stringify("right"),
	}
	: {};

// UNGATED: which child this install serves is true in every build, so it must
// not ride the two-tier `dev` check above — a scaffold has no sibling ReTreever,
// and with this undefined the nav fell back to childForPath("/"), which
// who_what claims, labelling every solo install "who_what".
// Empty in the workspace checkout, where rapper serves every child and the bar
// looks the live path up instead.
const mountedFact = {
	"import.meta.env.VITE_MOUNTED_CHILD": JSON.stringify(
		mountedChildRepo() ?? "",
	),
};

return {

	plugins: [
		printLandingUrl(),
		// noEscapeHatch guard, rooted at the WORKSPACE (not rapper/) — children are siblings of both parents, so scoping to rapper/ would make every child look "outside" and the guard vacuous.
		noEscapeHatch(fileURLToPath(new URL("..", import.meta.url))),
		// Camera mutations go through safeMap.ts — see the plugin for why this is a
		// build step and not the lint script it replaces.
		noRawCamera(fileURLToPath(new URL("..", import.meta.url))),
		sveltekit(),
	],

	// Parent name/origin injected here by RAPPER only — a child has two possible parents and ships standalone, so it must never hardcode this (see noParentNames.test.ts). Keys MUST be import.meta.env.VITE_*, not bare globals: a bare __X__ throws in a child cloned without rapper, and typeof __X__ === "string" makes Vite skip the substitution entirely.
	define: { ...tierFacts, ...mountedFact },
	server: {
		fs: {
			// SvelteKit replaces Vite's default allow-list with src/, .svelte-kit and node_modules — the workspace root is never consulted — so rig/, gc/, rt/ and every sibling child 404 in dev without this. Kit appends to a list you set.
			allow: [".."],
		},
	},
	test: {
		// Without the sibling globs a scaffold has the whole child suite beside rapper and
		// nothing that runs it. Scoped to lib/ + routes/: a bare ../<child>/** reaches worker
		// node_modules, whose vendored test files vitest's default excludes miss outside the root.
		include: [
			"src/**/*.{test,spec}.{js,ts}",
			// The shared tree is rapper's own furniture and carries its own
			// tests; without these two globs they are collected by nothing and
			// pass by never running — rig/nav/tierRoutes.test.ts sat unrun.
			"rig/**/*.{test,spec}.{js,ts}",
			"gc/**/*.{test,spec}.{js,ts}",
			...mountedChildRepos().flatMap((r) => [
				`../${r}/lib/**/*.{test,spec}.{js,ts}`,
				`../${r}/routes/**/*.{test,spec}.{js,ts}`,
			]),
		],
		// Scoping the globs to lib/ was meant to keep vendored tests out, but a
		// child's own service can have its own node_modules UNDER lib/ — the
		// GDAL service does — and vitest's default excludes only cover the
		// project root. Eight third-party suites were being collected and
		// failing on missing chai/puppeteer, noise that reads as a broken repo.
		// The leading ../ matters: these globs are matched against paths that
		// resolve OUTSIDE this project, and a root-anchored "**/node_modules/**"
		// does not reach them.
		exclude: [
			"**/node_modules/**",
			"../**/node_modules/**",
			"**/dist/**",
			"**/.svelte-kit/**",
		],
		// Same as ReTreever's runner — without it a spy leaks across tests and
		// bakeService's geolocation/indexedDB stubs bleed into the next file.
		clearMocks: true,
	},
};
});
