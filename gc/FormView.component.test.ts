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
	expect(container.querySelector("[data-field=where]")).not.toBeNull();
	await fireEvent.change(getByLabelText("DBH"), { target: { value: "140" } });
	await fireEvent.click(getByText("Save"));
	await waitFor(() => expect([...container.querySelectorAll("[data-error]")].map((e) => e.textContent)).toEqual(["Response required.", "The value should not be greater than 100"]));
	expect(onsubmit).not.toHaveBeenCalled();
	await fireEvent.change(getByLabelText("Date"), { target: { value: "2026-11-05" } });
	await fireEvent.change(getByLabelText("DBH"), { target: { value: "12.5" } });
	await fireEvent.click(getByText("+ Tree"));
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
