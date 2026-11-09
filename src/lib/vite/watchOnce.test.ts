import { describe, expect, it } from "vitest";
import { addOnce } from "./watchOnce";

const fakeWatcher = () => {
	const added: string[][] = [];
	const w = {
		add(p: string | readonly string[]) {
			added.push([p].flat());
			return w;
		},
		unwatch(_p: string | readonly string[]) {
			return w;
		},
	};
	return { w, added };
};

describe("addOnce", () => {
	it("hands chokidar each path once, however often a plugin asks", () => {
		const { w, added } = fakeWatcher();
		w.add = addOnce(w);
		for (let edit = 0; edit < 3; edit++) w.add(["/fetch/rapper/gc/a.ts", "/fetch/rapper/gc/b.ts"]);
		w.add("/fetch/rapper/gc/a.ts");
		w.add(["/fetch/rapper/gc/a.ts", "/fetch/rapper/gc/c.ts"]);
		expect(added).toEqual([["/fetch/rapper/gc/a.ts", "/fetch/rapper/gc/b.ts"], ["/fetch/rapper/gc/c.ts"]]);
	});

	it("a path unwatched can be watched again", () => {
		const { w, added } = fakeWatcher();
		w.add = addOnce(w);
		w.add("/x.ts");
		w.unwatch("/x.ts");
		w.add("/x.ts");
		expect(added).toEqual([["/x.ts"], ["/x.ts"]]);
	});
});
