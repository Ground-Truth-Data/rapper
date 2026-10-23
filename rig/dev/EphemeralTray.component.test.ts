// @vitest-environment happy-dom
// The dev tray folds to a tab by default, remembers its fold per tab, opens
// to a card titled by the route, and stays off wiki pages.
import { page } from "$app/state";
import { cleanup, fireEvent, render } from "@testing-library/svelte";
import { flushSync } from "svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import EphemeralTray from "./EphemeralTray.svelte";

vi.mock("$app/state", () => ({ page: { url: new URL("http://x/app/menu") } }));

beforeEach(() => {
	sessionStorage.clear();
	vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
	page.url = new URL("http://x/app/stats/plots");
});
afterEach(() => {
	cleanup();
	document.body.innerHTML = "";
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
	page.url = new URL("http://x/app/menu");
});

describe("EphemeralTray", () => {
	it("starts as a tab on <body>, opens to a card named for the route, and folds back", async () => {
		render(EphemeralTray, {});
		flushSync();
		const tab = document.querySelector<HTMLButtonElement>("body > button.ephem-tab")!;
		expect(tab.getAttribute("aria-label")).toBe("Show dev tray");
		await fireEvent.click(tab);
		flushSync();
		expect(sessionStorage.getItem("rt-ephem-collapsed")).toBe("0");
		const card = document.querySelector("[data-ephemeral-dock] [data-ephemeral]")!;
		expect(card.querySelector(".title")!.textContent).toBe("app / stats / plots");
		await fireEvent.click(card.querySelector<HTMLButtonElement>("button.fold")!);
		flushSync();
		expect(sessionStorage.getItem("rt-ephem-collapsed")).toBe("1");
		expect(document.querySelector("[data-ephemeral]")).toBeNull();
	});

	it("?ephem=1 opens it with the tier pill; a remembered unfold opens it; a wiki page shows no dock", () => {
		vi.stubEnv("VITE_RAPPER_TIER", "rapper");
		vi.stubEnv("VITE_OTHER_TIER", "ReTreever");
		vi.stubEnv("VITE_OTHER_ORIGIN", "http://rt");
		vi.stubEnv("VITE_TIER_ROUTES", JSON.stringify([{ path: "/app", otherPath: "/where" }]));
		page.url = new URL("http://x/app/stats?ephem=1");
		render(EphemeralTray, { title: "Plots" });
		flushSync();
		expect(document.querySelector("[data-ephemeral] .title")!.textContent).toBe("Plots");
		const pill = document.querySelector<HTMLAnchorElement>("[data-ephemeral] a.host-pill")!;
		expect(pill.getAttribute("href")).toBe("http://rt/where?ephem=1");
		expect(pill.querySelector(".on")!.textContent).toBe("rapper");
		cleanup();
		document.body.innerHTML = "";
		vi.stubEnv("VITE_TIER_ROUTES", "{broken");
		page.url = new URL("http://x/app/stats");
		sessionStorage.setItem("rt-ephem-collapsed", "0");
		render(EphemeralTray, {});
		flushSync();
		expect(document.querySelector("[data-ephemeral]")).not.toBeNull();
		cleanup();
		document.body.innerHTML = "";
		page.url = new URL("http://x/wiki/plots?ephem=1");
		render(EphemeralTray, {});
		flushSync();
		expect(document.querySelector("[data-ephemeral-dock]")).toBeNull();
	});
});
