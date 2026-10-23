// @vitest-environment happy-dom
// A hand lives in its target's phone frame, else the only frame on the page,
// else <body> — never a guess between two frames.
import { afterEach, describe, expect, it } from "vitest";
import { frameFor, handPortal } from "./handPortal";

afterEach(() => void (document.body.innerHTML = ""));

describe("handPortal", () => {
	it("follows the target into its frame, takes the innermost lone frame, and falls back to body", () => {
		document.body.innerHTML = `<div class="mobile-preview-frame" id="f1"><div class="mobile-preview-screen" id="s1"><button id="t"></button></div></div>`;
		const t = document.getElementById("t")!;
		expect(frameFor(t)!.id).toBe("s1");
		expect(frameFor(null)!.id).toBe("s1");
		document.body.insertAdjacentHTML("beforeend", `<div class="mobile-shell" id="f2"></div>`);
		expect(frameFor(undefined)).toBeNull();

		const hand = document.createElement("i");
		const a = handPortal(hand, () => t);
		expect(hand.parentElement!.id).toBe("s1");
		a.destroy();
		expect(hand.isConnected).toBe(false);
		handPortal(hand);
		expect(hand.parentElement).toBe(document.body);
	});
});
