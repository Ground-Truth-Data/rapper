// A company form: one SurveyJS JSON definition of our field types. Ops builds it; the phone and Ops draw it with
// FormView.svelte, and Central keeps its answers as header data plus one row per repeating entry.

export type El = Record<string, unknown> & { type: string; name: string; title?: string };
export type Definition = { title?: string; description?: string; elements: El[] };

/** Every field: its key, its kind (type, plus inputType for text) and its repeating group. Central's ops.fields twin. */
export function fields(d: Definition): { key: string; kind: string; group?: string }[] {
	const walk = (els: El[], group?: string): { key: string; kind: string; group?: string }[] =>
		els.flatMap((e) => [
			{ key: e.name, kind: e.type + (e.inputType ? `:${e.inputType}` : ""), group },
			...walk((e.templateElements ?? e.elements ?? []) as El[], e.type === "paneldynamic" ? e.name : group),
		]);
	return walk(d.elements);
}

const fits: Record<string, (v: unknown) => boolean> = {
	"text:number": (v) => typeof v === "number",
	checkbox: Array.isArray,
	file: Array.isArray,
	gps: (v) => typeof (v as { lat?: unknown })?.lat === "number" && typeof (v as { lng?: unknown })?.lng === "number",
	dropdown: (v) => typeof v === "string" || typeof v === "number",
	radiogroup: (v) => typeof v === "string" || typeof v === "number",
};

/** Why Central would refuse this answer of this version, or null: only its keys, each in its field type's shape.
 *  Central's ops.data_refused twin, so an answer saved offline never meets a refusal at upload. */
export function refused(d: Definition, data: Record<string, unknown>, group?: string): string | null {
	const at = new Map(fields(d).filter((f) => f.group === group && f.kind !== "panel" && f.kind !== "paneldynamic").map((f) => [f.key, f.kind]));
	for (const [k, v] of Object.entries(data)) {
		const kind = at.get(k);
		if (!kind) return `${k} is not a field here in this form version`;
		if (v != null && !(fits[kind] ?? ((x) => typeof x === "string"))(v)) return `${k} does not hold a ${kind}`;
	}
	return null;
}

/** SurveyJS answers split the way they are kept: header data, and one row per repeating entry. */
export function split(d: Definition, data: Record<string, unknown>) {
	const groups = new Set(fields(d).filter((f) => f.kind === "paneldynamic").map((f) => f.key));
	const header = Object.fromEntries(Object.entries(data).filter(([k]) => !groups.has(k)));
	// An entry added and left empty holds no tree.
	const rows = [...groups].flatMap((g) =>
		((data[g] as Record<string, unknown>[]) ?? []).filter((r) => Object.keys(r).length).map((r, n) => ({ groupKey: g, n: n + 1, data: r })),
	);
	return { data: header, rows };
}
