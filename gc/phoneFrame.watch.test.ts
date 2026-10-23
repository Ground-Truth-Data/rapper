// @vitest-environment happy-dom
// The frame is reported when the layout draws it, again only when it changes,
// and null when it goes away.
import { describe, expect, it, vi } from "vitest";
import { watchPhoneFrame } from "./phoneFrame.svelte";

describe("watchPhoneFrame on a live page", () => {
	it("reports a frame the layout adds later, ignores unrelated changes, and null once it is gone", async () => {
		vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
		const onChange = vi.fn();
		const stop = watchPhoneFrame(onChange);
		expect(onChange).toHaveBeenLastCalledWith(null);
		const frame = document.createElement("div");
		frame.className = "mobile-preview-frame";
		document.body.append(frame);
		await vi.waitFor(() => expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ frameLeft: expect.any(Number) })));
		const n = onChange.mock.calls.length;
		document.body.append(document.createElement("p"));
		await new Promise((r) => setTimeout(r, 0));
		expect(onChange).toHaveBeenCalledTimes(n);
		frame.remove();
		await vi.waitFor(() => expect(onChange).toHaveBeenLastCalledWith(null));
		stop();
		vi.unstubAllGlobals();
	});
});
