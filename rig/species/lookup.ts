// A name the shipped list lacks, looked up on GBIF and then iNaturalist, so a planter's own species carries
// the public id and scientific name. Both are keyless public services, and only the typed text is sent.

/** `key` is '' when GBIF has no accepted species of that exact name. */
export type Found = { key: string; scientific: string; common: string; family: string };

const GBIF = "https://api.gbif.org/v1/species";
const BACKBONE = "d7dddbf4-2cf0-4f39-9b2a-bb099caae36c";
const SHOWN = 4;

type Suggested = { key: number; canonicalName: string; family?: string; kingdom?: string; status?: string };
type Matched = { usageKey?: number; family?: string; matchType?: string; status?: string; rank?: string };
type Taxon = { name: string; preferred_common_name?: string; iconic_taxon_name?: string };

async function get<T>(url: string, signal: AbortSignal): Promise<T> {
	const r = await fetch(url, { signal });
	if (!r.ok) throw new Error(`${r.status} ${url}`);
	return (await r.json()) as T;
}

/** `group`: "mushroom" searches fungi; anything else, plants. */
export async function lookupSpecies(text: string, group: string, signal: AbortSignal): Promise<Found[]> {
	const q = encodeURIComponent(text.trim());
	const kingdom = group === "mushroom" ? "Fungi" : "Plantae";
	// Accepted names only: a synonym's key can belong to a different species of the same name.
	const suggested = (await get<Suggested[]>(`${GBIF}/suggest?q=${q}&datasetKey=${BACKBONE}&rank=SPECIES&limit=20`, signal)).filter(
		(s) => s.kingdom === kingdom && s.status === "ACCEPTED",
	);
	if (suggested.length)
		return suggested.slice(0, SHOWN).map((s) => ({ key: `gbif:${s.key}`, scientific: s.canonicalName, common: s.canonicalName, family: s.family ?? "" }));
	// GBIF's suggest reads scientific names; a common name ("saskatoon") is iNaturalist's to find.
	const taxa = (await get<{ results: Taxon[] }>(`https://api.inaturalist.org/v1/taxa/autocomplete?q=${q}&rank=species&per_page=10`, signal)).results
		.filter((t) => t.iconic_taxon_name === kingdom)
		.slice(0, SHOWN);
	return Promise.all(
		taxa.map(async (t) => {
			const m = await get<Matched>(`${GBIF}/match?name=${encodeURIComponent(t.name)}&kingdom=${kingdom}&strict=true`, signal);
			const sure = m.matchType === "EXACT" && m.status === "ACCEPTED" && m.rank === "SPECIES" && m.usageKey;
			return { key: sure ? `gbif:${m.usageKey}` : "", scientific: t.name, common: t.preferred_common_name ?? t.name, family: sure ? (m.family ?? "") : "" };
		}),
	);
}
