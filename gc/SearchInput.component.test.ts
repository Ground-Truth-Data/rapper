// @vitest-environment happy-dom
// A search field: typing shows the clear button, which empties it and tells
// the owner; read-only it never takes typing but still answers a tap.
import { cleanup, fireEvent, render } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import SearchInput from "./SearchInput.svelte";

afterEach(cleanup);

describe("SearchInput", () => {
	it("shows the clear button only with text, and clearing empties the field", async () => {
		const oninput = vi.fn();
		const onclear = vi.fn();
		const { getByRole, queryByRole, getByLabelText } = render(SearchInput, { oninput, onclear, clearLabel: "Wipe", placeholder: "Find a block" });
		const input = getByRole("searchbox") as HTMLInputElement;
		expect(input.placeholder).toBe("Find a block");
		expect(queryByRole("button")).toBeNull();
		await fireEvent.input(input, { target: { value: "CP 12" } });
		expect(oninput).toHaveBeenCalled();
		await fireEvent.click(getByLabelText("Wipe"));
		expect(input.value).toBe("");
		expect(onclear).toHaveBeenCalledOnce();
		expect(queryByRole("button")).toBeNull();
	});

	it("read-only with a prefix control: no typing, the tap goes to the owner", async () => {
		const onclick = vi.fn();
		const prefix = createRawSnippet(() => ({ render: () => `<span class="pill">Species</span>` }));
		const { getByRole, container } = render(SearchInput, { readonly: true, onclick, prefix, value: "pine" });
		const input = getByRole("searchbox") as HTMLInputElement;
		expect(input.readOnly).toBe(true);
		expect(input.value).toBe("pine");
		expect(container.querySelector(".rt-search .pill")!.textContent).toBe("Species");
		expect(container.querySelector("label")!.getAttribute("for")).toBe(input.id);
		await fireEvent.click(input);
		expect(onclick).toHaveBeenCalledOnce();
	});
});
