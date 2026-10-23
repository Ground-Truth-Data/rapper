// @vitest-environment happy-dom
// A child's page under the dev bar and tray, titled by its owner and name.
import { page } from "$app/state";
import { cleanup, render } from "@testing-library/svelte";
import { createRawSnippet, flushSync } from "svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import Layout from "./Layout.svelte";

vi.mock("$app/state", () => ({ page: { url: new URL("http://x/app/menu") } }));

afterEach(() => {
	cleanup();
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
});

describe("Layout", () => {
	it("titles the tab, links the icon, draws the dev bar and puts the page in <main>", () => {
		vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
		vi.stubEnv("VITE_RAPPER_TIER", "rapper");
		vi.stubEnv("VITE_TIER_ROUTES", "[not json");
		page.url = new URL("http://x/who");
		const children = createRawSnippet(() => ({ render: () => `<p id="pg">page</p>` }));
		const child = { name: "who_what", owner: "ReTreever", repo: "ReTreever_who_what" };
		const { container } = render(Layout, { child, logo: "/logo.webp", children });
		flushSync();
		expect(document.title).toBe("ReTreever — who_what");
		expect(document.head.querySelector<HTMLLinkElement>('link[rel="icon"]')!.getAttribute("href")).toBe("/logo.webp");
		expect(container.querySelector("header .child-name")!.textContent).toBe("who_what");
		expect(container.querySelector("main > #pg")).not.toBeNull();
		page.url = new URL("http://x/app/menu");
	});
});
