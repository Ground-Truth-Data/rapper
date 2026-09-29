// Prefs are keyed by table name only, so the IndexedDB and GC Supabase
// viewers share one arrangement per table.

// Not $app/environment, so the module stays importable outside SvelteKit.
const hasStorage = () => typeof localStorage !== "undefined";

// Which columns are SHOWN lives in the URL, not here — see `hiddenFromParams`.
export type ColumnPrefs = {
	order?: string[];
	widths?: Record<string, number>;
};

const storageKey = (table: string) => `rtAdminCols:${table}`;

export function loadColumnPrefs(table: string): ColumnPrefs {
	if (!hasStorage()) return {};
	try {
		return JSON.parse(
			localStorage.getItem(storageKey(table)) ?? "{}",
		) as ColumnPrefs;
	} catch {
		return {};
	}
}

export function saveColumnPrefs(table: string, prefs: ColumnPrefs): void {
	if (!hasStorage()) return;
	if (!hasPrefs(prefs)) localStorage.removeItem(storageKey(table));
	else localStorage.setItem(storageKey(table), JSON.stringify(prefs));
}

function hasPrefs(prefs: ColumnPrefs): boolean {
	return (
		(prefs.order?.length ?? 0) > 0 || Object.keys(prefs.widths ?? {}).length > 0
	);
}

// A column choice IS a report ("orgs with their scores") and has to be a
// link: sendable, bookmarkable, the same on another machine — so it rides in
// the query string, not localStorage. Order and widths stay in localStorage:
// those are fiddling, not a report.
const HIDE_PARAM = "hide";
// The other spelling, for the narrow case. See `hiddenToParams`.
const SHOW_PARAM = "cols";

/**
 * The columns hidden by a URL, or undefined when it says nothing.
 *
 * The param names what is OFF, not what is on — so a new column appears in
 * every old report automatically, instead of `?cols=a,b,c` freezing a report
 * at three columns forever.
 *
 * Absent means the table's `defaults`, or everything when it has none. An
 * EMPTY `?hide=` is the explicit "everything", since absence is taken.
 */
export function hiddenFromParams(
	params: URLSearchParams,
	columns: string[],
	defaults?: readonly string[],
): string[] {
	const names = (raw: string) =>
		raw
			.split(",")
			.map((c) => c.trim())
			.filter(Boolean);

	// `?cols=` is a CLOSED report; read first so a link carrying both is
	// unambiguous.
	const show = params.get(SHOW_PARAM);
	if (show) {
		const wanted = new Set(names(show));
		return columns.filter((c) => !wanted.has(c));
	}

	const raw = params.get(HIDE_PARAM);
	if (raw === null) return defaults ? showOnly(columns, defaults) : [];
	if (!raw) return [];
	// A stale/typo'd name is dropped rather than carried through copied links.
	const known = new Set(columns);
	return names(raw).filter((c) => known.has(c));
}

/**
 * Write the column choice, in whichever of the two spellings is shorter.
 *
 * `?hide=` is the default and stays live as the schema grows. But picking 5
 * of 32 columns writes the 27 you didn't pick — long enough to wrap and break
 * in mail/chat clients — so a choice that hides MORE than half is written the
 * other way, as `?cols=` naming what to show. That form is deliberately
 * CLOSED: it won't pick up columns added later.
 *
 * The table's own default writes NO param. With `defaults`, "everything" is
 * an empty `?hide=`; without, it is absence.
 */
export function hiddenToParams(
	params: URLSearchParams,
	hidden: string[],
	columns: string[],
	defaults?: readonly string[],
): URLSearchParams {
	params.delete(HIDE_PARAM);
	params.delete(SHOW_PARAM);
	const byDefault = defaults ? showOnly(columns, defaults) : [];
	const off = new Set(hidden);
	if (off.size === byDefault.length && byDefault.every((c) => off.has(c)))
		return params;
	if (hidden.length === 0) {
		params.set(HIDE_PARAM, "");
		return params;
	}

	const shown = columns.filter((c) => !hidden.includes(c));
	if (shown.length < hidden.length) params.set(SHOW_PARAM, shown.join(","));
	else params.set(HIDE_PARAM, hidden.join(","));
	return params;
}

/**
 * The columns to render: the ordered list minus whatever is switched off.
 *
 * Never empty — the picker that restores a column is reached from the header
 * itself, so the first column survives any denylist.
 */
export function visibleColumns(cols: string[], hidden: string[]): string[] {
	const off = new Set(hidden);
	const shown = cols.filter((c) => !off.has(c));
	return shown.length > 0 ? shown : cols.slice(0, 1);
}

/** Flip one column, returning the next hidden set. */
export function toggleColumn(hidden: string[], col: string): string[] {
	const off = new Set(hidden);
	if (off.has(col)) off.delete(col);
	else off.add(col);
	return [...off];
}

/** The denylist that shows exactly `keep`. Used by the picker's shortcuts. */
export function showOnly(cols: string[], keep: readonly string[]): string[] {
	const wanted = new Set(keep);
	return cols.filter((c) => !wanted.has(c));
}

// A column the saved pref doesn't know (e.g. a schema addition) is inserted
// after its nearest preceding default-order neighbour that IS placed.
export function applyColumnOrder(
	defaultCols: string[],
	saved?: string[],
): string[] {
	if (!saved || saved.length === 0) return [...new Set(defaultCols)];
	// De-duped: a repeated name renders as two columns with one key, which
	// kills the keyed {#each} and blanks the whole table.
	const known = new Set(defaultCols);
	const placed = [...new Set(saved)].filter((c) => known.has(c));
	for (let i = 0; i < defaultCols.length; i++) {
		const col = defaultCols[i];
		if (placed.includes(col)) continue;
		let at = 0;
		for (let j = i - 1; j >= 0; j--) {
			const idx = placed.indexOf(defaultCols[j]);
			if (idx >= 0) {
				at = idx + 1;
				break;
			}
		}
		placed.splice(at, 0, col);
	}
	return placed;
}

// Dragging rightward lands after `target`, leftward lands before it.
export function moveColumn(
	cols: string[],
	col: string,
	target: string,
): string[] {
	const from = cols.indexOf(col);
	const to = cols.indexOf(target);
	if (from < 0 || to < 0 || from === to) return cols;
	const next = cols.filter((c) => c !== col);
	next.splice(to, 0, col);
	return next;
}

// Beats the stylesheet's 200px max-width cap. Undefined → stylesheet rules apply.
export function widthStyle(
	prefs: ColumnPrefs,
	col: string,
): string | undefined {
	const w = prefs.widths?.[col];
	return w ? `width:${w}px;min-width:${w}px;max-width:${w}px` : undefined;
}
