/**
 * A dev tab that loses a module (route renamed or deleted under it) RELOADS
 * instead of going blank. Retries are capped in sessionStorage so a
 * permanently missing module can't spin.
 */

const MAX = 8;
/** Backs off (0.7s, 1.4s, 2.8s …) so the budget spans a real mid-edit rename, not five seconds. */
const DELAY_MS = 700;
const MAX_DELAY_MS = 20_000;
const backoff = (n: number) => Math.min(DELAY_MS * 2 ** n, MAX_DELAY_MS);
const KEY = "rt-dev-reload-tries";
/** Past when a missing route module throws (measured: <300ms). */
const GRACE_MS = 2500;

let healedThisLoad = false;

/** A DELETED file surfaces as "reading 'default'" (HMR swapped the record for
 * undefined); a missing route as "failed to fetch dynamically imported module". */
const LOST_MODULE =
	/Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unable to preload|dynamically imported module|reading 'default'|reading "default"/i;

function tries(): number {
	try {
		return Number.parseInt(sessionStorage.getItem(KEY) ?? "0", 10) || 0;
	} catch {
		return 0;
	}
}

function heal(why: string): void {
	const n = tries();
	if (n >= MAX) {
		console.error(
			`[dev-reload] a module is still missing after ${MAX} reloads — not reloading again. ` +
				`Restart the dev server, then hard-reload this tab.\n  ${why}`,
		);
		return;
	}
	try {
		sessionStorage.setItem(KEY, String(n + 1));
	} catch {
		/* private mode — proceed; the cap just won't hold */
	}
	healedThisLoad = true;
	console.warn(
		`[dev-reload] lost a module, reloading (${n + 1}/${MAX}): ${why}`,
	);
	setTimeout(() => location.reload(), backoff(n));
}

/** Call from `handleError` in hooks.client.ts — SvelteKit catches a failed route import itself, so no `unhandledrejection` ever fires. */
export function healLostModule(error: unknown): boolean {
	if (!import.meta.hot) return false;
	const msg = String((error as Error)?.message ?? error ?? "");
	if (!LOST_MODULE.test(msg)) return false;
	heal(msg);
	return true;
}

export function installDevReloadGuard(): void {
	if (!import.meta.hot) return;

	// Only a boot that stays up may clear the budget — clearing at install or in a rAF wiped the count on the healing reload itself. A broken boot throws within a few hundred ms, so wait past that.
	setTimeout(() => {
		if (healedThisLoad) return;
		try {
			sessionStorage.removeItem(KEY);
		} catch (e) {
			console.warn("[devReloadGuard:clear]", e);
		}
	}, GRACE_MS);

	window.addEventListener("unhandledrejection", (e) => {
		const msg = String((e.reason as Error)?.message ?? e.reason ?? "");
		if (LOST_MODULE.test(msg)) heal(msg);
	});

	// Browsers disagree whether a failed module script is a rejection or an error.
	window.addEventListener("error", (e) => {
		const msg = String(e.message ?? "");
		if (LOST_MODULE.test(msg)) heal(msg);
	});

	import.meta.hot.on(
		"vite:error",
		(payload: { err?: { message?: string } }) => {
			const msg = String(payload?.err?.message ?? "");
			if (LOST_MODULE.test(msg)) heal(msg);
		},
	);

	// Vite logs "[hmr] Failed to reload <path>" when a file is deleted under a tab
	// and exposes no event for it, so the log is the only seam.
	const realError = console.error;
	console.error = (...args: unknown[]) => {
		realError.apply(console, args);
		const first = String(args[0] ?? "");
		if (first.includes("[hmr]") && /failed to reload/i.test(first)) {
			heal(first.slice(0, 160));
		}
	};
}
