import { beforeEach, describe, expect, it } from "vitest";
import { lastTool, rememberTool } from "./lastTool";

describe("parent pills remember the last tool", () => {
	beforeEach(() => {
		const store = new Map<string, string>();
		Object.defineProperty(globalThis, "localStorage", {
			configurable: true,
			value: {
				getItem: (k: string) => store.get(k) ?? null,
				setItem: (k: string, v: string) => void store.set(k, v),
			},
		});
	});

	it("is empty until a tool has been visited", () => {
		expect(lastTool("retreever")).toBeNull();
	});

	it("keeps path AND query, per parent", () => {
		rememberTool("retreever", "/decisions/retreever?status=proposed");
		rememberTool("foundr", "/foundr_dash/tool/missmeta?site=restor");
		expect(lastTool("retreever")).toBe("/decisions/retreever?status=proposed");
		expect(lastTool("foundr")).toBe("/foundr_dash/tool/missmeta?site=restor");
	});

	it("forgets a page no tool of that parent owns any more", () => {
		rememberTool("retreever", "/retreever_dash/tool/projects/record?p=a-1");
		rememberTool("foundr", "/foundr_dash/tool/upkeep");
		expect(lastTool("retreever")).toBeNull();
		expect(lastTool("foundr")).toBeNull();
	});
});
