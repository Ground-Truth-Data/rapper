// @vitest-environment happy-dom
// The phone: hand, frame and the page inside it; turned only on request, and
// the legal line under it carries this year and the privacy link.
import { render } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { describe, expect, it } from "vitest";
import PhoneRig from "./PhoneRig.svelte";

const page = createRawSnippet(() => ({ render: () => `<p id="pg">page</p>` }));

describe("PhoneRig", () => {
	it("puts the page in the frame, upright by default", () => {
		const { container } = render(PhoneRig, { children: page });
		expect(container.querySelector(".mobile-preview-frame > #pg")).not.toBeNull();
		expect(container.querySelector(".rig-landscape")).toBeNull();
		expect(container.querySelector(".phone-viewport")).toBeNull();
		expect(container.querySelector(".rig-legal")!.textContent).toContain(`© ${new Date().getFullYear()} Get Cache`);
		expect(container.querySelector<HTMLAnchorElement>(".rig-legal a")!.getAttribute("href")).toBe("/getcache/privacy");
	});

	it("landscape wraps the page in a turned screen; viewport fills the page", () => {
		const { container } = render(PhoneRig, { children: page, landscape: true, viewport: true });
		expect(container.querySelector(".rig-landscape .mobile-preview-screen > #pg")).not.toBeNull();
		expect(container.querySelector(".phone-viewport > .mobile-preview-backdrop")).not.toBeNull();
	});
});
