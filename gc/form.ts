// A company form: one SurveyJS JSON definition of our field types. Ops builds it; the phone and Ops draw it with
// FormView.svelte, and Central keeps its answers as header data plus one row per repeating entry.

export type El = Record<string, unknown> & { type: string; name: string; title?: string };
export type Definition = { title?: string; elements: El[] };

/** SurveyJS answers split the way they are kept: header data, and one row per repeating entry. */
export function split(d: Definition, data: Record<string, unknown>) {
	const groups = new Set(d.elements.filter((e) => e.type === "paneldynamic").map((e) => e.name));
	const header = Object.fromEntries(Object.entries(data).filter(([k]) => !groups.has(k)));
	// An entry added and left empty holds no tree.
	const rows = [...groups].flatMap((g) =>
		((data[g] as Record<string, unknown>[]) ?? []).filter((r) => Object.keys(r).length).map((r, n) => ({ groupKey: g, n: n + 1, data: r })),
	);
	return { data: header, rows };
}
