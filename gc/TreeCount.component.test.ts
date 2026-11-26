// @vitest-environment happy-dom
import { cleanup, render } from "@testing-library/svelte";
import { afterEach, expect, it } from "vitest";
import TreeCount from "./TreeCount.svelte";

afterEach(cleanup);

it("draws the tree before its number in one element, with the label when given, and carries the caller's attributes", () => {
	const { container } = render(TreeCount, { n: "1,200", label: "planted", "data-trees": "" });
	const unit = container.querySelector("[data-trees]")!;
	expect(unit.children.length).toBe(2);
	expect(unit.children[0]!.matches(".tg")).toBe(true);
	expect(unit.textContent).toBe("1,200");
	expect(unit.children[1]!.getAttribute("data-label")).toBe("planted");
	cleanup();
	expect(render(TreeCount, { n: 7 }).container.textContent).toBe("7");
});
