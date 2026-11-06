// @vitest-environment happy-dom
// A company form drawn by our own components: survey-core checks it, and a saved answer is header data plus one
// row per repeating entry.
import { cleanup, fireEvent, render, waitFor } from "@testing-library/svelte";
import { afterEach, expect, it, vi } from "vitest";
import { type Definition, refused, split } from "./form";
import FormView from "./FormView.svelte";

afterEach(cleanup);

const form: Definition = {
	title: "Tree survey",
	elements: [
		{ type: "text", inputType: "date", name: "date", title: "Date", isRequired: true },
		{ type: "gps", name: "where", title: "Where" },
		{ type: "paneldynamic", name: "trees", title: "Trees", panelCount: 1, panelAddText: "+ Tree", templateElements: [{ type: "text", inputType: "number", name: "dbh", title: "DBH", max: 100 }] },
	],
};

it("refuses a missing required field and an out-of-range number, then saves", async () => {
	const onsubmit = vi.fn();
	const { container, findByText, getByText, getByLabelText } = render(FormView, { definition: form, onsubmit });
	await findByText("Tree survey");
	expect(container.querySelector("[data-field=where]")).toBeNull();
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
	expect(split(form, onsubmit.mock.calls[0][0])).toEqual({ data: { date: "2026-11-05" }, rows: [{ groupKey: "trees", n: 1, data: { dbh: 12.5 } }] });
});

it("refuses what Central would: a key from elsewhere, a group in the header, a wrong shape", () => {
	expect(refused(form, { date: "2026-11-05", where: { lat: 49.2, lng: -123.1 } })).toBeNull();
	expect(refused(form, { colour: "red" })).toMatch(/colour is not a field/);
	expect(refused(form, { trees: [] })).toMatch(/trees is not a field/);
	expect(refused(form, { where: "here" })).toMatch(/where does not hold a gps/);
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

it("stamps an added entry with where it was added, and marks it once folded", async () => {
	const nested: Definition = {
		title: "Trees",
		elements: [{ type: "paneldynamic", name: "tree", title: "Tree", panelCount: 0, templateElements: [
			{ type: "text", name: "species", title: "Species" },
			{ type: "gps", name: "tree_gps" },
		] }],
	};
	const getCurrentPosition = vi.fn((ok: PositionCallback) => ok({ coords: { latitude: -19.41, longitude: 146.81, accuracy: 6 } } as GeolocationPosition));
	vi.stubGlobal("navigator", { ...navigator, geolocation: { getCurrentPosition } });
	const onsubmit = vi.fn();
	const { container, findByText, getByText, getByLabelText } = render(FormView, { definition: nested, onsubmit });
	await findByText("Trees");
	await fireEvent.click(getByText("Add another"));
	await waitFor(() => expect(getCurrentPosition).toHaveBeenCalledOnce());
	expect(container.querySelector("[data-field=tree_gps]")).toBeNull();
	await fireEvent.change(getByLabelText("Species"), { target: { value: "cedar" } });
	await fireEvent.click(getByText("Add another"));
	await waitFor(() => expect(container.querySelector("[data-entry='1'] [data-gps-mark]")).not.toBeNull());
	await fireEvent.click(getByText("Save"));
	await waitFor(() => expect(onsubmit).toHaveBeenCalledOnce());
	const spot = { lat: -19.41, lng: 146.81, accuracy: 6 };
	expect(onsubmit.mock.calls[0][0]).toEqual({ tree: [{ species: "cedar", tree_gps: spot }, { tree_gps: spot }] });
	expect(split(nested, onsubmit.mock.calls[0][0]).rows[0]).toEqual({ groupKey: "tree", n: 1, data: { species: "cedar", tree_gps: spot } });
	expect(refused(nested, { species: "cedar", tree_gps: spot }, "tree")).toBeNull();
	vi.unstubAllGlobals();
});
