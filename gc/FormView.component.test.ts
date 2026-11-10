// @vitest-environment happy-dom
// A company form drawn by our own components: survey-core checks it, and a saved answer is header data plus one
// row per repeating entry.
import { cleanup, fireEvent, render, waitFor } from "@testing-library/svelte";
import { afterEach, expect, it, vi } from "vitest";
import { type Definition, FIX, refused, split } from "./form";
import FormView from "./FormView.svelte";

afterEach(cleanup);

const form: Definition = {
	title: "Tree survey",
	elements: [
		{ type: "text", inputType: "date", name: "date", title: "Date", isRequired: true },
		{ type: "paneldynamic", name: "trees", title: "Trees", panelCount: 1, panelAddText: "+ Tree", templateElements: [{ type: "text", inputType: "number", name: "dbh", title: "DBH", max: 100 }] },
	],
};

it("refuses a missing required field and an out-of-range number, then saves", async () => {
	const onsubmit = vi.fn();
	const { container, findByText, getByText, getByLabelText } = render(FormView, { definition: form, onsubmit });
	await findByText("Tree survey");
	await fireEvent.change(getByLabelText("DBH"), { target: { value: "140" } });
	await fireEvent.click(getByText("Save"));
	await waitFor(() => expect([...container.querySelectorAll("[data-error]")].map((e) => e.textContent)).toEqual(["Response required.", "The value should not be greater than 100"]));
	expect(onsubmit).not.toHaveBeenCalled();
	await fireEvent.change(getByLabelText("Date"), { target: { value: "2026-11-05" } });
	await fireEvent.change(getByLabelText("DBH"), { target: { value: "12.5" } });
	await fireEvent.click(getByText("Tree"));
	await waitFor(() => expect(container.querySelectorAll("[data-entry]")).toHaveLength(2));
	await fireEvent.click(getByText("Save"));
	await waitFor(() => expect(onsubmit).toHaveBeenCalledOnce());
	expect(split(form, onsubmit.mock.calls[0][0])).toEqual({ data: { date: "2026-11-05" }, fix: null, rows: [{ groupKey: "trees", n: 1, data: { dbh: 12.5 }, fix: null }] });
});

it("refuses what Central would: a key from elsewhere, a group in the header, a wrong shape", () => {
	expect(refused(form, { date: "2026-11-05" })).toBeNull();
	expect(refused(form, { colour: "red" })).toMatch(/colour is not a field/);
	expect(refused(form, { trees: [] })).toMatch(/trees is not a field/);
	expect(refused(form, { dbh: 12 }, "trees")).toBeNull();
	expect(refused(form, { dbh: "big" }, "trees")).toMatch(/dbh does not hold a text:number/);
	expect(refused(form, { date: "x" }, "trees")).toMatch(/date is not a field/);
});

const paged: Definition = {
	title: "Special tree finder",
	elements: [
		{ type: "text", name: "species", title: "Species", isRequired: true },
		{ type: "panel", name: "size", title: "Measurements", elements: [
			{ type: "paneldynamic", name: "tree", title: "Tree", panelCount: 1, templateElements: [
				{ type: "text", inputType: "number", name: "dbh", title: "DBH" },
				{ type: "text", name: "cute", title: "Cuteness" },
			] },
		] },
	],
};

it("pages by section: Next refuses an empty required field, Save on the last page sends every answer", async () => {
	const onsubmit = vi.fn();
	const { container, findByText, getByText, getByLabelText, getAllByLabelText, queryByText } = render(FormView, { definition: paged, onsubmit });
	await findByText("Section 1 of 2");
	expect(queryByText("Back")).toBeNull();
	await fireEvent.click(getByText("Next"));
	await findByText("Response required.");
	expect(container.querySelector("[data-section]")?.getAttribute("data-section")).toBe("1");
	await fireEvent.change(getByLabelText("Species"), { target: { value: "cedar" } });
	await fireEvent.click(getByText("Next"));
	await findByText("Section 2 of 2");
	await fireEvent.change(getByLabelText("DBH"), { target: { value: "34" } });
	await fireEvent.change(getByLabelText("Cuteness"), { target: { value: "very" } });
	await fireEvent.click(getByText("Add another"));
	// Adding folds the others to a one-line summary.
	await waitFor(() => expect(container.querySelector("[data-entry='1'] [data-summary]")?.textContent).toBe("DBH 34 · very"));
	expect(getAllByLabelText("DBH")).toHaveLength(1);
	await fireEvent.click(getByText("Tree 1"));
	await waitFor(() => expect(getAllByLabelText("DBH")).toHaveLength(2));
	await fireEvent.click(getByText("Save"));
	await waitFor(() => expect(onsubmit).toHaveBeenCalledOnce());
	expect(onsubmit.mock.calls[0][0]).toEqual({ species: "cedar", tree: [{ dbh: 34, cute: "very" }, {}] });
	await fireEvent.click(getByText("Back"));
	await findByText("Section 1 of 2");
});

it("reports each change as a draft, and a draft reopens the form where it was left", async () => {
	const onchange = vi.fn();
	const first = render(FormView, { definition: paged, onsubmit: vi.fn(), onchange });
	await first.findByText("Section 1 of 2");
	expect(onchange).not.toHaveBeenCalled();
	await fireEvent.change(first.getByLabelText("Species"), { target: { value: "cedar" } });
	await fireEvent.click(first.getByText("Next"));
	await first.findByText("Section 2 of 2");
	await waitFor(() => expect(onchange.mock.lastCall?.[0]).toMatchObject({ data: { species: "cedar" }, path: [0, 1] }));
	cleanup();

	const again = render(FormView, { definition: paged, onsubmit: vi.fn(), draft: onchange.mock.lastCall![0] });
	await again.findByText("Section 2 of 2");
	await fireEvent.click(again.getByText("Back"));
	await waitFor(() => expect((again.getByLabelText("Species") as HTMLInputElement).value).toBe("cedar"));
});

const branching: Definition = {
	title: "Planting check",
	elements: [
		{ type: "radiogroup", name: "planted", title: "Planted?", choices: ["yes", "no", "burnt"] },
		{ type: "panel", name: "why", title: "Why not", elements: [{ type: "text", name: "reason", title: "Reason", isRequired: true }] },
		{ type: "panel", name: "count", title: "Count", elements: [{ type: "text", inputType: "number", name: "trees", title: "Trees" }] },
		{ type: "panel", name: "close", title: "Close", elements: [{ type: "text", name: "note", title: "Note" }] },
	],
	triggers: [
		{ type: "skip", expression: "{planted} = 'yes'", gotoName: "count" },
		{ type: "complete", expression: "{planted} = 'burnt'" },
	],
};

it("follows a skip past a section, Back retraces the path, and the skipped section is never required", async () => {
	const onsubmit = vi.fn();
	const { container, findByText, getByText, getByLabelText } = render(FormView, { definition: branching, onsubmit });
	await findByText("Section 1 of 4");
	await fireEvent.click(getByLabelText("yes"));
	await fireEvent.click(getByText("Next"));
	await findByText("Section 3 of 4");
	expect(container.querySelector("[data-step]")?.textContent).toBe("2 / 3");
	await fireEvent.click(getByText("Back"));
	await findByText("Section 1 of 4");
	await fireEvent.click(getByText("Next"));
	await findByText("Section 3 of 4");
	await fireEvent.click(getByText("Next"));
	await findByText("Section 4 of 4");
	await fireEvent.click(getByText("Back"));
	await findByText("Section 3 of 4");
	await fireEvent.click(getByText("Next"));
	await fireEvent.click(getByText("Save"));
	await waitFor(() => expect(onsubmit).toHaveBeenCalledOnce());
	expect(onsubmit.mock.calls[0][0]).toEqual({ planted: "yes" });
});

it("a complete trigger turns Next into Save and ends there", async () => {
	const onsubmit = vi.fn();
	const { findByText, getByText, getByLabelText, queryByText } = render(FormView, { definition: branching, onsubmit });
	await findByText("Section 1 of 4");
	await fireEvent.click(getByLabelText("burnt"));
	await fireEvent.click(getByText("Save"));
	await waitFor(() => expect(onsubmit).toHaveBeenCalledWith({ planted: "burnt" }));
	expect(queryByText("Why not")).toBeNull();
});

it("every answer and every entry carries where it was taken, with no GPS field in the form", async () => {
	const trees: Definition = {
		title: "Trees",
		elements: [{ type: "paneldynamic", name: "tree", title: "Tree", panelCount: 0, templateElements: [{ type: "text", name: "species", title: "Species" }] }],
	};
	const spots = [
		{ latitude: 55.1, longitude: -120.1, accuracy: 4 },
		{ latitude: 55.2, longitude: -120.2, accuracy: 9 },
		{ latitude: 55.3, longitude: -120.3, accuracy: 5 },
	];
	const getCurrentPosition = vi.fn((ok: PositionCallback) => ok({ coords: spots[getCurrentPosition.mock.calls.length - 1] } as GeolocationPosition));
	vi.stubGlobal("navigator", { ...navigator, geolocation: { getCurrentPosition } });
	const onsubmit = vi.fn();
	const { container, findByText, getByText, getAllByLabelText } = render(FormView, { definition: trees, onsubmit });
	await findByText("Trees");
	await fireEvent.click(getByText("Add another"));
	await waitFor(() => expect(getCurrentPosition).toHaveBeenCalledTimes(1));
	await fireEvent.change(getAllByLabelText("Species")[0], { target: { value: "cedar" } });
	await fireEvent.click(getByText("Add another"));
	await waitFor(() => expect(getCurrentPosition).toHaveBeenCalledTimes(2));
	await waitFor(() => expect(container.querySelectorAll("[data-entry]")).toHaveLength(2));
	const second = getAllByLabelText("Species").at(-1)!;
	await fireEvent.change(second, { target: { value: "pine" } });
	await fireEvent.click(getByText("Save"));
	await waitFor(() => expect(onsubmit).toHaveBeenCalledOnce());
	const { fix, rows } = split(trees, onsubmit.mock.calls[0][0]);
	expect(fix).toEqual({ lat: 55.3, lng: -120.3, accuracyM: 5 });
	expect(rows).toEqual([
		{ groupKey: "tree", n: 1, data: { species: "cedar" }, fix: { lat: 55.1, lng: -120.1, accuracyM: 4 } },
		{ groupKey: "tree", n: 2, data: { species: "pine" }, fix: { lat: 55.2, lng: -120.2, accuracyM: 9 } },
	]);
	vi.unstubAllGlobals();
});

it("stamps each entry with where it was added, the one the form opens with too, and marks it once folded", async () => {
	const nested: Definition = {
		title: "Trees",
		elements: [{ type: "paneldynamic", name: "tree", title: "Tree", panelCount: 1, templateElements: [{ type: "text", name: "species", title: "Species" }] }],
	};
	const getCurrentPosition = vi.fn((ok: PositionCallback) => ok({ coords: { latitude: -19.41, longitude: 146.81, accuracy: 6 } } as GeolocationPosition));
	vi.stubGlobal("navigator", { ...navigator, geolocation: { getCurrentPosition } });
	const onsubmit = vi.fn();
	const { container, findByText, getByText, getByLabelText } = render(FormView, { definition: nested, onsubmit });
	await findByText("Trees");
	expect(container.querySelector("[data-gps-stamp]")).not.toBeNull();
	await waitFor(() => expect(getCurrentPosition).toHaveBeenCalledOnce());
	await fireEvent.change(getByLabelText("Species"), { target: { value: "cedar" } });
	await fireEvent.click(getByText("Add another"));
	await waitFor(() => expect(container.querySelector("[data-entry='1'] [data-gps-mark]")).not.toBeNull());
	await fireEvent.click(getByText("Save"));
	await waitFor(() => expect(onsubmit).toHaveBeenCalledOnce());
	const fix = { lat: -19.41, lng: 146.81, accuracyM: 6 };
	expect(onsubmit.mock.calls[0][0]).toEqual({ [FIX]: fix, tree: [{ species: "cedar", [FIX]: fix }, { [FIX]: fix }] });
	expect(split(nested, onsubmit.mock.calls[0][0]).rows).toEqual([{ groupKey: "tree", n: 1, data: { species: "cedar" }, fix }]);
	vi.unstubAllGlobals();
});

it("a version published with a hidden gps field keeps location only in the columns, never in data", async () => {
	const old: Definition = {
		title: "Old trees",
		elements: [
			{ type: "gps", name: "where", title: "Where" },
			{ type: "paneldynamic", name: "tree", title: "Tree", panelCount: 1, templateElements: [{ type: "text", name: "species", title: "Species" }, { type: "gps", name: "tree_gps", title: "Tree GPS" }] },
		],
	};
	const getCurrentPosition = vi.fn((ok: PositionCallback) => ok({ coords: { latitude: 55.1, longitude: -120.1, accuracy: 4 } } as GeolocationPosition));
	vi.stubGlobal("navigator", { ...navigator, geolocation: { getCurrentPosition } });
	const onsubmit = vi.fn();
	const { container, findByText, getByText, getByLabelText } = render(FormView, { definition: old, onsubmit });
	await findByText("Old trees");
	expect(container.querySelector("[data-field=where], [data-field=tree_gps]")).toBeNull();
	await fireEvent.change(getByLabelText("Species"), { target: { value: "cedar" } });
	await fireEvent.click(getByText("Save"));
	await waitFor(() => expect(onsubmit).toHaveBeenCalledOnce());
	const fix = { lat: 55.1, lng: -120.1, accuracyM: 4 };
	expect(split(old, onsubmit.mock.calls[0][0])).toEqual({ data: {}, fix, rows: [{ groupKey: "tree", n: 1, data: { species: "cedar" }, fix }] });
	vi.unstubAllGlobals();
});

it("says where a photo is kept only when its ⓘ is tapped", async () => {
	const shot: Definition = { title: "Shot", elements: [{ type: "file", name: "pic", title: "Photo" }] };
	const { container, findByText, queryByText } = render(FormView, { definition: shot, onsubmit: vi.fn() });
	await findByText("Photo");
	expect(queryByText("Only on this phone until you send it.")).toBeNull();
	await fireEvent.click(container.querySelector("[data-photo-info]")!);
	await findByText("Only on this phone until you send it.");
	await fireEvent.click(container.querySelector("[data-photo-info]")!);
	expect(queryByText("Only on this phone until you send it.")).toBeNull();
});

it("a Person question offers only the people it is given, searchable, and takes no free text", async () => {
	const onsubmit = vi.fn();
	const def: Definition = { title: "Crew", elements: [{ type: "dropdown", name: "boss", title: "Boss", contacts: true }] };
	const people = [
		{ key: "p1", name: "Carlie", color: "#3fb8af", picked: true },
		{ key: "p2", name: "Pete", color: "#e07a9a", picked: false },
	];
	const { container, findByText, getByLabelText, getByText } = render(FormView, { definition: def, onsubmit, people });
	await findByText("Crew");
	const offered = () => [...container.querySelectorAll("[data-person]")].map((e) => e.textContent?.trim());
	expect(offered()).toEqual(["Carlie", "Pete"]);
	expect(container.querySelector("select")).toBeNull();
	await fireEvent.input(getByLabelText("Boss"), { target: { value: "pe" } });
	await waitFor(() => expect(offered()).toEqual(["Pete"]));
	await fireEvent.click(getByText("Pete"));
	await fireEvent.click(getByText("Save"));
	await waitFor(() => expect(onsubmit).toHaveBeenCalledOnce());
	expect(onsubmit.mock.calls[0][0]).toEqual({ boss: "p2" });
});

it("speaks the planter's language: a French planter is refused in French", async () => {
	const { container, findByText, getByText } = render(FormView, { definition: form, onsubmit: vi.fn(), locale: "fr-CA" });
	await findByText("Tree survey");
	await fireEvent.click(getByText("Save"));
	await waitFor(() => expect(container.querySelector("[data-error]")?.textContent).toBe("La réponse à cette question est obligatoire."));
});
