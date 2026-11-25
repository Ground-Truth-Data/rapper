// @vitest-environment happy-dom
import { cleanup, render } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { afterEach, expect, it } from "vitest";
import BlockHead from "./BlockHead.svelte";

afterEach(cleanup);

const base = { icon: "/block.webp", name: "North 7", unpickLabel: "unpick", ha: "99", rate: "1,800", total: "178,200", onUnpick: () => {} };
const rateLink = createRawSnippet(() => ({ render: () => `<button class="rate">1,800</button>` }));

it("the host's rate link stands in for the plain rate, worked out or allocated", () => {
	for (const allocated of [undefined, "allocated"]) {
		const { container } = render(BlockHead, { ...base, allocated, rateLink });
		const line = container.querySelector(".bh-rate")!;
		expect(line.querySelector("button.rate")).not.toBeNull();
		expect(line.textContent!.match(/1,800/g)).toHaveLength(1);
		cleanup();
	}
});

it("without one, the rate is plain text", () => {
	const { container } = render(BlockHead, base);
	expect(container.querySelector(".bh-rate button")).toBeNull();
	expect(container.querySelector(".bh-rate")!.textContent).toContain("1,800");
});
