// @vitest-environment happy-dom
// The dev bar names the child serving this page, lights the current view,
// links both repos, and greys the tier pill only when the other side says no.
import { cleanup, render } from "@testing-library/svelte";
import { flushSync } from "svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import SharedNav from "./SharedNav.svelte";

const base = { owner: "ReTreever", name: "solo", logo: "/l.webp", repo: "fallback_repo", ghIcon: "/gh.png", tier: "ReTreever", otherTier: "rapper" };
afterEach(() => {
	cleanup();
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
});

describe("SharedNav", () => {
	it("names the serving child, lights the current view and carries the query into each view", () => {
		const { container } = render(SharedNav, { ...base, pathname: "/where/orgs", search: "?q=1", tierSlot: "right" });
		expect(container.querySelector(".child-name")!.textContent).toBe("where");
		expect(container.querySelector<HTMLAnchorElement>("a.home")!.getAttribute("href")).toBe("/where");
		const views = [...container.querySelectorAll<HTMLAnchorElement>("nav.views a")];
		expect(views.map((a) => a.textContent!.trim())).toEqual(["where", "orgs", "projects"]);
		expect(views[1]!.getAttribute("href")).toBe("/where/orgs?q=1");
		expect(views.filter((a) => a.classList.contains("on")).map((a) => a.textContent!.trim())).toEqual(["orgs"]);
		const gh = [...container.querySelectorAll<HTMLAnchorElement>("a.gh")].map((a) => a.href);
		expect(gh).toEqual(["https://github.com/Ground-Truth-Data/rapper", "https://github.com/Ground-Truth-Data/ReTreever_where"]);
	});

	it("off the registry it falls back to the props' views, marks a missing one, and a param view is current only with its param", () => {
		const views = [{ href: "/x", label: "all" }, { href: "/x?mine=1", label: "mine" }, { href: "/y", label: "soon", missing: true }];
		const { container } = render(SharedNav, { ...base, pathname: "/x", search: "?mine=1", views, selfRepo: "nobody" });
		expect(container.querySelector(".child-name")!.textContent).toBe("solo");
		expect(container.querySelector(".btn.dead")!.textContent!.trim()).toBe("soon");
		expect([...container.querySelectorAll("nav a.on")].map((a) => a.textContent!.trim())).toEqual(["mine"]);
		expect([...container.querySelectorAll<HTMLAnchorElement>("a.gh")].map((a) => a.href)).toEqual([
			"https://github.com/Ground-Truth-Data/nobody",
			"https://github.com/Ground-Truth-Data/fallback_repo",
		]);
	});

	it("probes the other side on the left slot and says when a mounted child does not serve the page", async () => {
		vi.stubEnv("VITE_MOUNTED_CHILD", "ReTreever_who_what");
		const fetchFn = vi.fn(async () => ({ status: 404, ok: false }) as Response);
		vi.stubGlobal("fetch", fetchFn);
		const routes = [{ path: "/who", otherPath: "/who" }];
		const probe = render(SharedNav, { ...base, pathname: "/who/acme", tierSlot: "left", otherHost: "http://o", routes });
		await vi.waitFor(() => expect(fetchFn).toHaveBeenCalledWith("http://o/who", expect.objectContaining({ method: "HEAD" })));
		probe.unmount();
		const { container } = render(SharedNav, { ...base, pathname: "/elsewhere", tierSlot: "left", otherHost: "http://o", routes });
		flushSync();
		expect(fetchFn).toHaveBeenCalledTimes(1);
		expect(container.querySelector(".off-mount")!.textContent!.trim()).toBe("not served here");
		expect(container.querySelector<HTMLAnchorElement>("a.home")!.getAttribute("href")).toBe("/who");
	});
});
