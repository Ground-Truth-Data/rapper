// @vitest-environment happy-dom
import { cleanup, render } from "@testing-library/svelte";
import { afterEach, expect, it } from "vitest";
import PeopleGrid from "./PeopleGrid.svelte";

afterEach(cleanup);

const who = (label: string) => ({ key: label, label, color: "#abc", self: false, picked: true });
const names = (c: HTMLElement, role: string) => [...c.querySelectorAll(`[data-role=${role}] .id-pill`)].map((p) => p.getAttribute("title"));

it("names everyone in each role once, and both roles even for the same person", () => {
	const { container } = render(PeopleGrid, { surveyors: [who("Carlie"), who("Carlie")], planters: [who("Carlie"), who("Pete"), who("Pete")], words: { surveyor: "s", planter: "p" } });
	expect(names(container, "surveyor")).toEqual(["Carlie"]);
	expect(names(container, "planter")).toEqual(["Carlie", "Pete"]);
});
