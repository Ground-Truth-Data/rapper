import { describe, expect, it } from "vitest";
import { kitAlias } from "./kitAlias.ts";

const table = {
	"$parent/siblings/child": "../child",
	"$parent/siblings/child/*": "../child/*",
	"$parent/siblings": "../",
	"$parent/siblings/*": "../*",
	$parent: ".",
	"$parent/*": "./*",
	$solo: "./solo",
};

// Vite's rule: the first alias that matches rewrites the id.
const resolveId = (id: string) => {
	for (const { find, replacement } of kitAlias("/w/tier", table)) {
		if (typeof find === "string" ? id === find || id.startsWith(`${find}/`) : find.test(id)) return id.replace(find, replacement);
	}
	return id;
};

describe("the tier alias table", () => {
	it("sends a child's own entry to the child, ahead of the siblings fallback", () => {
		expect(resolveId("$parent/siblings/child/lib/x.ts")).toBe("/w/child/lib/x.ts");
		expect(resolveId("$parent/siblings/other/y.ts")).toBe("/w/other/y.ts");
	});

	it("points $parent at the serving tier", () => {
		expect(resolveId("$parent/src/app.unique.css")).toBe("/w/tier/src/app.unique.css");
		expect(resolveId("$parent")).toBe("/w/tier");
	});

	it("matches a bare key as a prefix, and never a longer name", () => {
		expect(resolveId("$solo/a.ts")).toBe("/w/tier/solo/a.ts");
		expect(resolveId("$parentx/a.ts")).toBe("$parentx/a.ts");
	});
});
