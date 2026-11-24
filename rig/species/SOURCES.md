# Species data: sources

`species.csv` and `names/<lang>.tsv` are built by Get Cache's species scripts and never edited by hand.
`species.csv` is standard CSV: every cell quoted, a quote inside a cell doubled, no line break inside a cell.

**Order:** row order is display order. Parents keep the order of their sources. Under a parent, a starred species
comes first (lodgepole pine, white spruce), then the species seen most often in North America, then by the world's count: iNaturalist observation counts
(`/v1/observations/species_counts`, place 97394 for North America), fetched 14 Nov 2026. A species iNaturalist
has no observations of keeps its source order, last.

Every row's `source` column holds one or more of the keys below, `;`-separated. Downloaded 14 Nov 2026.

| Key | What it is | What was taken | Licence |
|---|---|---|---|
| `inat-morchella` | iNaturalist, every active species under *Morchella* (taxon 56830). https://www.inaturalist.org/taxa/56830 | Species names only | None claimed: iNaturalist's taxonomy archive says taxonomic information "should not represent creative work and thus may not be subject to intellectual property restrictions" |
| `fra` | FAO. 2026. *Global Forest Resources Assessment.* https://fra-data.fao.org/ . Accessed on 14 Nov 2026. Table 2b, growing stock composition, 2020 and 2025 cycles. | Each country's ten commonest native and five commonest introduced tree species. The `countries` column lists the ISO codes of the countries that named the species. The table ranks by standing volume in all forest, not by trees planted. | CC BY 4.0, under FAO's statistical database terms; citation as given |
| `retreever` | ReTreever's `SpeciesTable` (dev database), scraped from Tree-Nation's catalogue by Foundr in Sep 2026. | Scientific names. The `retreever` column holds that table's own ID, so the two join one to one. | Ours |
| `getcache` | The 200 trees Get Cache shipped on 14 Nov 2026 (commit 51a9b8a3, in a `seed.ts` since deleted), chosen by hand. | Their order (they lead the tree group) and their English names | Ours |
| `gbif-genus` | A genus row, parent of the species under it. | | |
| `made` | A parent people say that GBIF has no record for; its id is `name:<slug>`, fixed for life, and its rank is `group`. Aspen: *Populus tremuloides* and *P. tremula*. Black morel and Yellow morel: *Morchella* sect. Distantes and sect. Morchella, as listed in Wikipedia's "Morchella" article after Richard et al. 2015 (`scripts/species/morelSections.json`). A species in none of them stays under its genus. | | Wikipedia text CC BY-SA 4.0; only the grouping is used |

**IDs and scientific names:** GBIF Backbone Taxonomy (GBIF Secretariat, dataset
`d7dddbf4-2cf0-4f39-9b2a-bb099caae36c`, CC BY 4.0). `gbif:<n>` is the backbone key of the accepted species or
genus. A name a source spells differently, or that has since been renamed, is in `listedAs`.

**Names** (`names/<lang>.tsv`, and the English `common` column where we wrote none ourselves): `inat` is
iNaturalist's first-placed name in that language; `gbif` is the name most GBIF checklists agree on, used only for a
language iNaturalist lacks. GBIF vernacular names come from many checklists with their own licences (mostly CC BY
or CC0). The file name is the language code: two letters where one exists, iNaturalist's `zh` for traditional and
`zh-CN` for simplified Chinese.
