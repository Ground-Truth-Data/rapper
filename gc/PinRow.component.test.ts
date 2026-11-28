// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from "@testing-library/svelte";
import { afterEach, expect, it, vi } from "vitest";
import PinRow from "./PinRow.svelte";

afterEach(cleanup);

const items = [{ src: "/a.webp" }, { src: "/b.webp" }, { src: "/c.webp", label: "c3" }];

it("puts the current pin on the placard and hands each half to the host", async () => {
	const onleft = vi.fn();
	const onright = vi.fn();
	const { container } = render(PinRow, { items, current: 1, onleft, onright, leftLabel: "next", rightLabel: "library", more: "more" });
	const pins = [...container.querySelectorAll(".pc:not(.pm)")];
	expect(pins.map((p) => p.classList.contains("on"))).toEqual([false, true, false]);
	expect(container.querySelector(".pm")?.textContent).toBe("more");
	const [l, r] = container.querySelectorAll<HTMLButtonElement>("button");
	await fireEvent.click(l!);
	await fireEvent.click(r!);
	expect([onleft.mock.calls.length, onright.mock.calls.length]).toEqual([1, 1]);
});

it("has nothing tappable but its two halves, and a half with nothing to do is disabled", () => {
	const { container } = render(PinRow, { items, leftLabel: "prev", rightLabel: "next" });
	const buttons = [...container.querySelectorAll<HTMLButtonElement>("button")];
	expect(buttons).toHaveLength(2);
	expect(buttons.every((b) => b.disabled)).toBe(true);
});
