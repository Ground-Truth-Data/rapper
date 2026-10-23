// @vitest-environment happy-dom
// A child served alone reserves the bars its tier will draw — none on georef.
import { page } from "$app/state";
import { render } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import HostChrome from "./HostChrome.svelte";

vi.mock("$app/state", () => ({ page: { url: new URL("http://x/app/menu") } }));

const body = createRawSnippet(() => ({ render: () => `<p id="c">child</p>` }));
afterEach(() => void (page.url = new URL("http://x/app/menu")));

describe("HostChrome", () => {
	it("reserves both bands with their text on an ordinary route", () => {
		page.url = new URL("http://x/app/map");
		const { container } = render(HostChrome, { children: body, header: "Top", footer: "" });
		expect(container.querySelector(".bar.top")!.textContent).toBe("Top");
		expect(container.querySelector(".bar.bottom")!.textContent).toBe("");
		expect(container.querySelector(".slot > #c")).not.toBeNull();
	});

	it("reserves nothing on georef", () => {
		page.url = new URL("http://x/georef");
		const { container } = render(HostChrome, { children: body });
		expect(container.querySelector(".bar")).toBeNull();
		expect(container.querySelector(".host")!.className).toMatch(/no-top.*no-bottom/);
	});
});
