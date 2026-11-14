// What a looked-up name may be saved as: an accepted species of the right kingdom, or no GBIF key at all.
import { afterEach, describe, expect, it, vi } from "vitest";
import { lookupSpecies } from "./lookup";

const replies = (by: Record<string, unknown>) =>
	vi.stubGlobal("fetch", async (url: string) => {
		const hit = Object.keys(by).find((k) => url.includes(k));
		return hit ? { ok: true, json: async () => by[hit] } : { ok: false, status: 404 };
	});
const signal = new AbortController().signal;
afterEach(() => vi.unstubAllGlobals());

describe("looking a species up", () => {
	it("takes GBIF's accepted species of the group's kingdom, never a synonym or another kingdom", async () => {
		replies({
			"/suggest": [
				{ key: 1, canonicalName: "Agaricus silvaticus", family: "Russulaceae", kingdom: "Fungi", status: "SYNONYM" },
				{ key: 2, canonicalName: "Agaricus silvaticus", family: "Agaricaceae", kingdom: "Fungi", status: "ACCEPTED" },
				{ key: 3, canonicalName: "Agaricus fly", family: "Agromyzidae", kingdom: "Animalia", status: "ACCEPTED" },
			],
		});
		expect(await lookupSpecies("agaricus sil", "mushroom", signal)).toEqual([{ key: "gbif:2", scientific: "Agaricus silvaticus", common: "Agaricus silvaticus", family: "Agaricaceae" }]);
	});

	it("falls back to iNaturalist for a common name, and keys it only on an exact accepted GBIF match", async () => {
		replies({
			"/suggest": [],
			"taxa/autocomplete": {
				results: [
					{ name: "Amelanchier alnifolia", preferred_common_name: "Saskatoon", iconic_taxon_name: "Plantae" },
					{ name: "Amelanchier cusickii", preferred_common_name: "Cusick's serviceberry", iconic_taxon_name: "Plantae" },
					{ name: "Oemopteryx fosketti", preferred_common_name: "Saskatoon Willowfly", iconic_taxon_name: "Insecta" },
				],
			},
			"name=Amelanchier%20alnifolia": { usageKey: 8168485, family: "Rosaceae", matchType: "EXACT", status: "ACCEPTED", rank: "SPECIES" },
			"name=Amelanchier%20cusickii": { usageKey: 9, family: "Rosaceae", matchType: "FUZZY", status: "ACCEPTED", rank: "SPECIES" },
		});
		expect(await lookupSpecies("saskatoon", "tree", signal)).toEqual([
			{ key: "gbif:8168485", scientific: "Amelanchier alnifolia", common: "Saskatoon", family: "Rosaceae" },
			{ key: "", scientific: "Amelanchier cusickii", common: "Cusick's serviceberry", family: "" },
		]);
	});

	it("fails loudly when the service does, so the caller can leave the typed name", async () => {
		replies({});
		await expect(lookupSpecies("anything", "tree", signal)).rejects.toThrow("404");
	});
});
