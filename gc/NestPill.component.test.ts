// @vitest-environment happy-dom
import { cleanup, render } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { afterEach, expect, it } from "vitest";
import NestPill from "./NestPill.svelte";

afterEach(cleanup);

const children = createRawSnippet(() => ({ render: () => `<span>Pl</span>` }));
const star = createRawSnippet(() => ({ render: () => `<span class="star">★</span>` }));
const go = () => {};

it("a bare right half opens its drawer with no chevron; its mark is the pill's own", () => {
	const { container: c } = render(NestPill, { children, values: star, ongo: go, ontoggle: go, bare: true });
	expect(c.querySelector(".np-end")).toBeNull();
	expect(c.querySelector(".star")).not.toBeNull();
	expect(c.querySelector<HTMLButtonElement>(".np-side")!.disabled).toBe(false);
	cleanup();
	const { container: d } = render(NestPill, { children, ongo: go });
	expect(d.querySelector(".np-go svg, .np-go *")).not.toBeNull();
});

it("a fold with no chevron still says whether it is open", () => {
	for (const expanded of [true, false]) {
		const { container: c } = render(NestPill, { children, steel: true, expanded, ontoggle: go, ongo: go });
		expect(c.querySelector(".np-main")!.getAttribute("aria-expanded")).toBe(String(expanded));
		expect(c.querySelector(".np-fold")).toBeNull();
		cleanup();
	}
});
