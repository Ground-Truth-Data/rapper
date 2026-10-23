// @vitest-environment happy-dom
// Two tabs, people and orgs; the picked one is selected and gold.
import { fireEvent, render } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import PeopleOrgsTabs from "./PeopleOrgsTabs.svelte";

describe("PeopleOrgsTabs", () => {
	it("starts on people and moves the selection on a tap", async () => {
		const { getAllByRole } = render(PeopleOrgsTabs, {});
		const [people, orgs] = getAllByRole("tab");
		expect(people!.getAttribute("aria-selected")).toBe("true");
		expect(people!.classList.contains("rt-fancy-btn")).toBe(true);
		expect(orgs!.querySelector("img")).not.toBeNull();
		await fireEvent.click(orgs!);
		expect(orgs!.getAttribute("aria-selected")).toBe("true");
		expect(people!.getAttribute("aria-selected")).toBe("false");
	});
});
