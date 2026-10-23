// @vitest-environment happy-dom
// A tapped share button arms the quad; the export it caused makes it ride out
// of the button toward the side with room, then the layer cleans itself up.
// The roam crosses the phone on its own clock and skips a hidden tab.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { atvShare, playAtvRoam, playAtvShare, startAtvRoam } from "./atvShare";
import { announceExport } from "./fileEvents";

type Anim = { frames: Keyframe[]; finish?: () => void };
let anims: Anim[] = [];
const rect = (left: number, top: number, width: number, height: number) =>
	({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON: () => ({}) }) as DOMRect;

function button(left: number, width = 80, height = 40) {
	document.body.innerHTML = `<div class="mobile-shell"><button id="b"></button></div>`;
	const shell = document.querySelector<HTMLElement>(".mobile-shell")!;
	shell.getBoundingClientRect = () => rect(0, 0, 390, 844);
	const b = document.getElementById("b")!;
	Object.defineProperties(b, { offsetHeight: { value: height }, offsetWidth: { value: width } });
	b.getBoundingClientRect = () => rect(left, 400, width, height);
	return b;
}
const sprite = () => document.querySelector<HTMLImageElement>(".mobile-shell img");

beforeEach(() => {
	vi.useFakeTimers();
	anims = [];
	HTMLElement.prototype.animate = function (frames: Keyframe[]) {
		const a: Anim = { frames };
		anims.push(a);
		return { addEventListener: (_: string, fn: () => void) => void (a.finish = fn) } as unknown as Animation;
	};
});
afterEach(() => {
	vi.useRealTimers();
	document.body.innerHTML = "";
});

describe("the share ride", () => {
	it("arms on tap, rides 200 ms after the export, and leaves nothing behind once it finishes", () => {
		const b = button(20);
		const action = atvShare(b, { exit: "right" });
		b.click();
		announceExport("tally.csv");
		expect(sprite()).toBeNull();
		vi.advanceTimersByTime(200);
		expect(sprite()!.src).toContain("share_atv_tread_right.webp");
		expect(anims).toHaveLength(2);
		const [turns, moves] = anims;
		expect(turns!.frames.at(-1)!.offset).toBe(1);
		expect(moves!.frames.map((f) => f.offset)).toEqual([...moves!.frames.map((f) => f.offset)].sort());
		moves!.finish!();
		vi.advanceTimersByTime(120);
		expect(sprite()).toBeNull();
		action.update({ exit: "left" });
		action.destroy();
		b.click();
		announceExport("again.csv");
		vi.advanceTimersByTime(500);
		expect(anims).toHaveLength(2);
	});

	it("auto picks the side with room, and a stale or detached arm never rides", () => {
		const b = button(330, 50);
		playAtvShare(b);
		expect(sprite()!.src).toContain("tread_left");
		const again = button(20);
		atvShare(again).update();
		again.click();
		vi.advanceTimersByTime(3 * 60_000 + 1);
		announceExport("late.csv");
		vi.advanceTimersByTime(500);
		expect(sprite()).toBeNull();
		const gone = button(20);
		gone.click();
		gone.remove();
		announceExport("x.csv");
		vi.advanceTimersByTime(500);
		expect(document.querySelectorAll("img")).toHaveLength(0);
	});

	it("a button with no height throws nothing, a tall strip feathers its edge, and a broken animate cleans up", () => {
		playAtvShare(button(20, 80, 0), "right");
		expect(document.querySelectorAll(".mobile-shell > div")).toHaveLength(0);
		playAtvShare(button(20, 80, 20), "right");
		expect(sprite()!.style.height).toBe("36px");
		expect(sprite()!.style.maskImage).toContain("to right");
		vi.advanceTimersByTime(60_000);
		expect(sprite()).toBeNull();
		HTMLElement.prototype.animate = () => {
			throw new Error("no WAAPI");
		};
		expect(() => playAtvShare(button(20), "left")).toThrow("no WAAPI");
		expect(sprite()).toBeNull();
	});
});

describe("the roam", () => {
	it("crosses the shell left to right inside the visible band, then removes itself", () => {
		button(20);
		playAtvRoam();
		const img = sprite()!;
		expect(img.style.height).toBe("48px");
		expect(Number.parseFloat(img.style.left)).toBeLessThan(0);
		const moves = anims[1]!.frames;
		const xs = moves.map((f) => Number.parseFloat(String(f.translate)));
		expect(xs).toEqual([...xs].sort((a, b) => a - b));
		vi.advanceTimersByTime(120_000);
		expect(sprite()).toBeNull();
		document.querySelector<HTMLElement>(".mobile-shell")!.getBoundingClientRect = () => rect(0, 0, 0, 0);
		playAtvRoam();
		expect(sprite()).toBeNull();
	});

	it("waits at least a minute between crossings, skips a hidden tab, and stops", () => {
		button(20);
		const stop = startAtvRoam();
		vi.advanceTimersByTime(59_999);
		expect(anims).toHaveLength(0);
		Object.defineProperty(document, "hidden", { configurable: true, value: true });
		vi.advanceTimersByTime(60 * 60_000);
		expect(anims).toHaveLength(0);
		Object.defineProperty(document, "hidden", { configurable: true, value: false });
		vi.advanceTimersByTime(60 * 60_000);
		expect(anims.length).toBeGreaterThan(0);
		stop();
		const n = anims.length;
		vi.advanceTimersByTime(60 * 60_000);
		expect(anims).toHaveLength(n);
	});
});
