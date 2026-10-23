// @vitest-environment happy-dom
// The tier pill lights the side you are on, links to the other with the
// map's camera hash carried at the click, greys out when there is nothing there.
import { cleanup, fireEvent, render } from "@testing-library/svelte";
import { afterEach, describe, expect, it } from "vitest";
import ParentPill from "./ParentPill.svelte";

afterEach(() => {
	cleanup();
	location.hash = "";
});

describe("ParentPill", () => {
	it("links to the other tier, lit on the current half, carrying the hash at the click", async () => {
		const { getByRole } = render(ParentPill, { leftLabel: "ReTreever", rightLabel: "rapper", current: "rapper", href: "http://o/who" });
		const a = getByRole("link") as HTMLAnchorElement;
		expect(a.title).toContain("under ReTreever");
		expect(a.querySelector(".on")!.textContent).toBe("rapper");
		location.hash = "#14/50/-119";
		await fireEvent.click(a);
		expect(a.hash).toBe("#14/50/-119");
	});

	it("draws nothing without a link", () => {
		const none = render(ParentPill, { leftLabel: "A", rightLabel: "B", current: "A" }).container;
		expect(none.querySelector(".host-pill")).toBeNull();
	});
});
