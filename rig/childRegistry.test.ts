// The child that serves a path is the longest matching prefix, with or without
// /app; tiers serve nothing; a Get Cache child mounts under /app.
import { describe, expect, it } from "vitest";
import { APP_PREFIX, CHILDREN, childByRepo, childForPath, githubUrl, mountPath } from "./childRegistry";

describe("childRegistry", () => {
	it("finds the serving child by longest prefix, stripping /app, and none for an unknown page", () => {
		expect(childForPath("/who/acme")?.repo).toBe("ReTreever_who_what");
		expect(childForPath("/where/orgs")?.repo).toBe("ReTreever_where");
		expect(childForPath(`${APP_PREFIX}/offlinev10/x`)?.repo).toBe("getCache_OfflineMap");
		expect(childForPath("/georef")?.repo).toBe("getCache_OnlineMap");
		expect(childForPath(APP_PREFIX)?.repo).toBe("ReTreever_who_what");
		expect(childForPath("/nowhere-at-all")).toBeUndefined();
		expect(CHILDREN.filter((c) => c.tier).every((t) => childForPath(`/${t.name}`)?.repo !== t.repo)).toBe(true);
	});

	it("mounts Get Cache children under /app and links each repo on GitHub", () => {
		const app = CHILDREN.find((c) => c.app)!;
		expect(mountPath(app, "/")).toBe(APP_PREFIX);
		expect(mountPath(app, "/x")).toBe(`${APP_PREFIX}/x`);
		const who = childByRepo("ReTreever_who_what")!;
		expect(mountPath(who)).toBe("/who");
		expect(childByRepo("nope")).toBeUndefined();
		expect(githubUrl(who)).toBe("https://github.com/Ground-Truth-Data/ReTreever_who_what");
	});
});
