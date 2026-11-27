// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from "@testing-library/svelte";
import { afterEach, expect, it, vi } from "vitest";
import SurveyRows from "./SurveyRows.svelte";

afterEach(cleanup);

const words = { planted: "p", spots: "s", missed: "m", excess: "e", density: "density", quality: "quality" };
const who = (label: string) => ({ key: label, label, color: "#abc", self: false, picked: true });
const survey = { kind: "survey" as const, name: "survey3", count: 9, surveyors: [who("Carlie")], density: 91 as number | null, quality: 88 as number | null };
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

it("a plot's tap opens it; a survey's left half folds it and its right half opens it, chips included", async () => {
	const ongo = vi.fn();
	const p = render(SurveyRows, { row: plot(), words, ongo }).container;
	await fireEvent.click(p.querySelector("[data-no]")!);
	expect(ongo).toHaveBeenCalledTimes(1);

	const ontoggle = vi.fn();
	const s = render(SurveyRows, { row: { ...survey, density: 104, quality: null }, words, ongo, ontoggle }).container;
	const wide = (c: Element) => (c.querySelector<HTMLElement>(".np")!.getBoundingClientRect = () => ({ left: 0, width: 300 }) as DOMRect);
	wide(s);
	await fireEvent.click(s.querySelector("[data-name]")!, { clientX: 100 });
	expect(ontoggle).toHaveBeenCalledTimes(1);
	await fireEvent.click(s.querySelector(".np-side")!);
	expect(ongo).toHaveBeenCalledTimes(2);
	expect(s.querySelector("[data-pct=quality]")).toBeNull();
	await fireEvent.click(s.querySelector("[data-pct=density]")!, { clientX: 250 });
	expect(ongo).toHaveBeenCalledTimes(3);
	expect(ontoggle).toHaveBeenCalledTimes(1);

	const still = render(SurveyRows, { row: survey, words, ontoggle }).container;
	wide(still);
	await fireEvent.click(still.querySelector("[data-name]")!, { clientX: 250 });
	expect(ontoggle, "no right chevron: the whole pill folds").toHaveBeenCalledTimes(2);
});

it("a survey counts its plots, names each surveyor once and rounds its percentages to whole numbers", () => {
	const c = render(SurveyRows, { row: { ...survey, surveyors: [who("Carlie"), who("Carlie"), who("Sam")], density: 90.9, quality: 87.5 }, words }).container;
	expect(c.querySelector("[data-count]")!.textContent).toBe("9");
	expect([...c.querySelectorAll("[data-role=surveyor] .id-pill")].map((e) => e.getAttribute("title"))).toEqual(["Carlie", "Sam"]);
	expect(c.querySelector("[data-pct=density]")!.textContent).toMatch(/\b91%/);
	expect(c.querySelector("[data-pct=quality]")!.textContent).toMatch(/\b88%/);
});

it("a plot with a split folds its species under it; one without has nothing to fold", async () => {
	const bare = render(SurveyRows, { row: plot(), words }).container;
	expect(bare.querySelector(".np-main")!.getAttribute("aria-expanded")).toBeNull();
	const c = render(SurveyRows, { row: plot({ species: [{ code: "PL", name: "Lodgepole pine", count: 20 }, { code: "", name: "Hybrid spruce", count: 13 }] }), words }).container;
	expect(c.querySelector("[data-row=species]")).toBeNull();
	await fireEvent.click(c.querySelector("[data-no]")!);
	const rows = [...c.querySelectorAll("[data-row=species]")];
	expect(rows.map((r) => [r.querySelector("[data-code]")?.textContent, r.querySelector("[data-species]")!.textContent, r.querySelector("[data-trees]")!.textContent])).toEqual([
		["PL", "Lodgepole pine", "20"],
		[undefined, "Hybrid spruce", "13"],
	]);
});
