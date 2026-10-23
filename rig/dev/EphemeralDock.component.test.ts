// @vitest-environment happy-dom
// A page's own dev column: its content in a side card, never on a wiki or admin page.
import { page } from "$app/state";
import { cleanup, render } from "@testing-library/svelte";
import { createRawSnippet, flushSync } from "svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import EphemeralDock from "./EphemeralDock.svelte";

const children = createRawSnippet(() => ({ render: () => `<p class="inst">gauges</p>` }));
afterEach(() => {
	cleanup();
	document.body.innerHTML = "";
	vi.unstubAllGlobals();
	page.url = new URL("http://x/app/menu");
});

describe("EphemeralDock", () => {
	it("docks its instruments on an ordinary page and stays off an admin page", () => {
		vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
		page.url = new URL("http://x/app/map");
		render(EphemeralDock, { side: "right", top: "40px", children });
		flushSync();
		const dock = document.querySelector<HTMLElement>("[data-ephemeral-dock]")!;
		expect(dock.classList.contains("dock")).toBe(true);
		expect(dock.style.getPropertyValue("--nudge")).toBe("40px");
		expect(dock.querySelector(".inst")).not.toBeNull();
		cleanup();
		document.body.innerHTML = "";
		page.url = new URL("http://x/admin/users");
		render(EphemeralDock, { children });
		expect(document.querySelector("[data-ephemeral-dock]")).toBeNull();
	});
});
