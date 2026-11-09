// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type RowDrag, rowDragHandle, rowHoldDrag, rowShift, rowSwipe } from "./rowDrag";

const drag = (o: Partial<RowDrag> = {}): RowDrag => ({ rowId: "b", fromIndex: 1, targetIndex: 3, rowHeight: 50, deltaY: 0, ...o });

describe("rowShift", () => {
	it("slides the rows between a downward drag's start and target up one row", () => {
		const d = drag();
		expect([0, 1, 2, 3, 4].map((i) => rowShift(d, `r${i}`, i))).toEqual([0, 0, -50, -50, 0]);
	});
	it("slides the rows between an upward drag's target and start down one row", () => {
		const d = drag({ fromIndex: 3, targetIndex: 1 });
		expect([0, 1, 2, 3, 4].map((i) => rowShift(d, `r${i}`, i))).toEqual([0, 50, 50, 0, 0]);
	});
	it("never moves the dragged row, nor anything when nothing is dragged", () => {
		expect(rowShift(drag(), "b", 2)).toBe(0);
		expect(rowShift(null, "a", 2)).toBe(0);
	});
});

describe("rowHoldDrag", () => {
	let el: HTMLElement;
	let held: RowDrag | null;
	let moves: RowDrag[];
	let drops: RowDrag[];
	let action: ReturnType<typeof rowHoldDrag<RowDrag>>;
	const ptr = (target: EventTarget, type: string, x: number, y: number, pointerId = 1) =>
		target.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, pointerId, button: 0, bubbles: true }));
	const click = () => {
		const e = new MouseEvent("click", { bubbles: true, cancelable: true });
		el.dispatchEvent(e);
		return e.defaultPrevented;
	};

	beforeEach(() => {
		vi.useFakeTimers();
		el = document.createElement("div");
		el.getBoundingClientRect = () => ({ height: 40 }) as DOMRect;
		document.body.append(el);
		held = null;
		moves = [];
		drops = [];
		action = rowHoldDrag(el, {
			rowId: "b",
			index: 1,
			count: 4,
			drag: () => held,
			move: (d) => void moves.push((held = d)),
			drop: (d) => void drops.push(d),
		});
	});
	afterEach(() => {
		action.destroy();
		el.remove();
		vi.useRealTimers();
	});

	it("after a still hold, drags the row by whole rows, clamped to the list, and drops it", () => {
		ptr(el, "pointerdown", 10, 100);
		vi.advanceTimersByTime(350);
		expect(moves[0]).toEqual({ rowId: "b", fromIndex: 1, targetIndex: 1, rowHeight: 40, deltaY: 0 });
		ptr(window, "pointermove", 10, 185);
		expect(held).toMatchObject({ targetIndex: 3, deltaY: 85 });
		ptr(window, "pointermove", 10, 400);
		expect(held!.targetIndex).toBe(3);
		ptr(window, "pointermove", 10, -400);
		expect(held!.targetIndex).toBe(0);
		ptr(window, "pointerup", 10, -400);
		expect(drops).toHaveLength(1);
		expect(click()).toBe(true);
		vi.advanceTimersByTime(400);
		expect(click()).toBe(false);
	});

	it("a finger that moves before the hold is a scroll: no drag, the tap goes through", () => {
		ptr(el, "pointerdown", 10, 100);
		ptr(window, "pointermove", 10, 109);
		vi.advanceTimersByTime(350);
		expect(moves).toEqual([]);
		ptr(window, "pointerup", 10, 109);
		expect(drops).toEqual([]);
		expect(click()).toBe(false);
	});

	it("ignores a second finger, and a drag its owner cancels ends without a drop", () => {
		ptr(el, "pointerdown", 10, 100);
		vi.advanceTimersByTime(350);
		ptr(window, "pointermove", 10, 300, 2);
		expect(moves).toHaveLength(1);
		held = null;
		ptr(window, "pointermove", 10, 150);
		ptr(window, "pointerup", 10, 150);
		expect(drops).toEqual([]);
	});
});

const gesture = (el: HTMLElement, path: [number, number][], id = 1) => {
	const fire = (t: EventTarget, type: string, [x, y]: [number, number]) =>
		t.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, pointerId: id, button: 0, buttons: 1, bubbles: true, isPrimary: true, pointerType: "touch" }));
	fire(el, "pointerdown", path[0]!);
	for (const p of path.slice(1, -1)) fire(el, "pointermove", p);
	fire(el, "pointerup", path.at(-1)!);
};
const tapped = (el: HTMLElement) => {
	const e = new MouseEvent("click", { bubbles: true, cancelable: true });
	el.dispatchEvent(e);
	return !e.defaultPrevented;
};

describe("rowSwipe", () => {
	let el: HTMLElement;
	beforeEach(() => {
		el = document.createElement("div");
		document.body.append(el);
	});
	afterEach(() => el.remove());

	it("a swipe left past 96 px runs swiped and springs back; the click that ends it is not a tap", () => {
		const swiped = vi.fn();
		const a = rowSwipe(el, { swiped })!;
		gesture(el, [[300, 10], [260, 12], [180, 14], [180, 14]]);
		expect(swiped).toHaveBeenCalledTimes(1);
		expect(el.style.transform).toBe("");
		expect(tapped(el)).toBe(false);
		a.destroy();
	});

	it("a short swipe springs back without running it", () => {
		const swiped = vi.fn();
		rowSwipe(el, { swiped })!;
		gesture(el, [[300, 10], [260, 10], [250, 10]]);
		expect(swiped).not.toHaveBeenCalled();
		expect(el.style.transform).toBe("");
	});

	it("with hold, rests open past half of it, and the next tap closes it instead of going through", async () => {
		const a = rowSwipe(el, { hold: 80 })!;
		gesture(el, [[300, 10], [270, 10], [250, 10], [250, 10]]);
		expect(el.style.transform).toBe("translateX(-80px)");
		await new Promise((r) => setTimeout(r, 260));
		expect(tapped(el)).toBe(false);
		expect(el.style.transform).toBe("");
		expect(tapped(el)).toBe(true);
		a.update({ hold: 80 });
		a.update(null);
		expect(el.style.transform).toBe("");
	});

	it("null leaves the row put", () => {
		expect(rowSwipe(el, null)).toBeUndefined();
	});
});

describe("rowDragHandle", () => {
	it("starts at the grip's row height, steps the target by whole rows and drops it", () => {
		const row = document.createElement("div");
		row.dataset.rowId = "b";
		row.getBoundingClientRect = () => ({ height: 40 }) as DOMRect;
		const grip = document.createElement("span");
		grip.setPointerCapture = () => {};
		grip.releasePointerCapture = () => {};
		grip.hasPointerCapture = () => false;
		row.append(grip);
		document.body.append(row);
		let held: RowDrag | null = null;
		const drops: RowDrag[] = [];
		const opts = { rowId: "b", index: 0, count: 3, drag: () => held, move: (d: RowDrag) => void (held = d), drop: (d: RowDrag) => void drops.push(d) };
		const a = rowDragHandle(grip, opts);
		a.update(opts);
		gesture(grip, [[5, 100], [5, 110], [5, 190], [5, 190]]);
		expect(drops).toMatchObject([{ rowId: "b", fromIndex: 0, targetIndex: 2, rowHeight: 40 }]);
		a.destroy();
		row.remove();
	});
});
