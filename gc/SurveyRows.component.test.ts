// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from "@testing-library/svelte";
import { afterEach, expect, it, vi } from "vitest";
import SurveyRows from "./SurveyRows.svelte";

afterEach(cleanup);

const words = { planted: "p", spots: "s", missed: "m", excess: "e", surveyor: "sv", planter: "pl", density: "density", quality: "quality" };
const who = (label: string) => ({ key: label, label, color: "#abc", self: false, picked: true });
const plot = (o = {}) => ({ kind: "plot" as const, plotNo: 3, planted: 7, spots: 8, missed: 0, excess: 0, faults: [] as string[], ...o });

it("a plot shows its miss or its excess, never both, and neither on target", () => {
	const delta = (o: object) => render(SurveyRows, { row: plot(o), words }).container.querySelector("[data-delta]")?.getAttribute("data-delta");
	expect(delta({ missed: 2 })).toBe("missed");
	expect(delta({ excess: 3 })).toBe("excess");
	expect(delta({})).toBeUndefined();
});

it("fault codes are counted per code; past two, the most called shows with how many more", () => {
	const codes = (faults: string[]) => {
		const c = render(SurveyRows, { row: plot({ faults }), words }).container;
		return [[...c.querySelectorAll("[data-code]")].map((e) => e.getAttribute("data-code")), c.querySelector("[data-more]")?.textContent];
	};
	expect(codes([])).toEqual([[], undefined]);
	expect(codes(["C3", "C9", "C3"])).toEqual([["C3", "C9"], undefined]);
	expect(codes(["C9", "C3", "C3", "B1"])).toEqual([["C3"], "+2"]);
});

it("a plot's tap opens it; a survey's tap folds it, its chevron opens it and a chip reports its kind", async () => {
	const ongo = vi.fn();
	const p = render(SurveyRows, { row: plot(), words, ongo }).container;
	await fireEvent.click(p.querySelector("[data-no]")!);
	expect(ongo).toHaveBeenCalledTimes(1);

	const ontoggle = vi.fn();
	const onchip = vi.fn();
	const s = render(SurveyRows, { row: { kind: "survey", name: "Kintail", density: 104, quality: null, planted: 9, spots: 8 }, words, ongo, ontoggle, onchip }).container;
	await fireEvent.click(s.querySelector("[data-name]")!);
	expect(ontoggle).toHaveBeenCalledTimes(1);
	await fireEvent.click(s.querySelector("[data-go]")!);
	expect(ongo).toHaveBeenCalledTimes(2);
	expect(s.querySelector("[data-act=quality]")).toBeNull();
	await fireEvent.click(s.querySelector("[data-act=density]")!);
	expect(onchip).toHaveBeenCalledWith("density");
	expect(ontoggle).toHaveBeenCalledTimes(1);
});

it("a day counts its plots and names each surveyor and planter once", () => {
	const c = render(SurveyRows, { row: { kind: "date", date: "2 Nov", count: 9, surveyors: [who("Carlie"), who("Carlie")], planters: [who("Pete"), who("Sam"), who("Pete")] }, words }).container;
	const names = (role: string) => [...c.querySelectorAll(`[data-role=${role}] .id-pill`)].map((e) => e.getAttribute("title"));
	expect(c.querySelector("[data-count]")!.textContent).toBe("9");
	expect(names("surveyor")).toEqual(["Carlie"]);
	expect(names("planter")).toEqual(["Pete", "Sam"]);
});
