// @vitest-environment happy-dom
// The item's icon sits beside the name plaque, outside it on the left; the meta line runs full width beneath both.
import { render } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { expect, it } from "vitest";
import NameTag from "./NameTag.svelte";

// NameTag re-fits the name once fonts load; rapper's own run has no document.fonts.
Object.defineProperty(document, "fonts", { configurable: true, value: { ready: Promise.resolve() } });

it("puts the icon outside the plaque, on its left", () => {
	const art = createRawSnippet(() => ({ render: () => `<img src="x.webp" alt="" />` }));
	const { container } = render(NameTag, { name: "Pickerel point", date: "261122", art });
	const plaque = container.querySelector(".plaque--name-tag")!;
	const icon = container.querySelector(".name-tag-art")!;
	expect(plaque.contains(icon), "not inside the grey plaque").toBe(false);
	expect(icon.nextElementSibling?.contains(plaque), "right before the plaque").toBe(true);
	expect(container.querySelector(".name-tag-foot")!.contains(icon), "the meta line is its own row").toBe(false);
});
