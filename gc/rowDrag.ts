// Drag a row up or down its list, by its grip (bags, Ops' plugins) or a long press (the inbox), or left to dismiss it
// or uncover what sits behind it.
import { DragGesture } from "@use-gesture/vanilla";

export type RowDrag = { rowId: string; fromIndex: number; targetIndex: number; rowHeight: number; deltaY: number };

export type RowDragOpts<D extends RowDrag> = {
    rowId: string;
    index: number;
    count: number;
    /** The owner holds the drag; null mid-gesture cancels it. */
    drag: () => D | null;
    move: (d: D, xy: [number, number]) => void;
    drop: (d: D) => void;
};

/** `use:` action for a row's grip; the row is the grip's closest `[data-row-id]`. */
export function rowDragHandle<D extends RowDrag>(el: HTMLElement, opts: RowDragOpts<D>) {
    let o = opts;
    const gesture = new DragGesture(
        el,
        ({ first, last, movement: [, my], xy, cancel }) => {
            if (first) {
                const row = el.closest("[data-row-id]") ?? el;
                const h = row.getBoundingClientRect().height || 54;
                o.move({ rowId: o.rowId, fromIndex: o.index, targetIndex: o.index, rowHeight: h, deltaY: 0 } as D, xy as [number, number]);
                return;
            }
            const d = o.drag();
            if (!d) return cancel();
            if (last) return o.drop(d);
            o.move(step(d, my, o.count), xy as [number, number]);
        },
        { pointer: { keys: false }, axis: "y" },
    );
    return {
        update: (next: RowDragOpts<D>) => {
            o = next;
        },
        destroy: () => gesture.destroy(),
    };
}

const step = <D extends RowDrag>(d: D, my: number, count: number): D => ({
    ...d,
    deltaY: my,
    targetIndex: Math.max(0, Math.min(count - 1, d.fromIndex + Math.round(my / d.rowHeight))),
});

const HOLD_MS = 350;
const SLOP_PX = 8;

/** `use:` action: hold the row itself still for HOLD_MS, then drag it. A finger that moves first is scrolling. */
export function rowHoldDrag<D extends RowDrag>(el: HTMLElement, opts: RowDragOpts<D>) {
    let o = opts;
    let id = -1;
    let x0 = 0;
    let y0 = 0;
    let timer = 0;
    let live = false;
    let swallowUntil = 0;
    const end = () => {
        clearTimeout(timer);
        id = -1;
        live = false;
        removeEventListener("pointermove", move);
        removeEventListener("pointerup", up);
        removeEventListener("pointercancel", up);
    };
    const down = (e: PointerEvent) => {
        if (id !== -1 || e.button !== 0) return;
        id = e.pointerId;
        x0 = e.clientX;
        y0 = e.clientY;
        addEventListener("pointermove", move);
        addEventListener("pointerup", up);
        addEventListener("pointercancel", up);
        timer = window.setTimeout(() => {
            live = true;
            navigator.vibrate?.(10);
            const h = el.getBoundingClientRect().height || 54;
            o.move({ rowId: o.rowId, fromIndex: o.index, targetIndex: o.index, rowHeight: h, deltaY: 0 } as D, [x0, y0]);
        }, HOLD_MS);
    };
    const move = (e: PointerEvent) => {
        if (e.pointerId !== id) return;
        if (!live) return void (Math.hypot(e.clientX - x0, e.clientY - y0) > SLOP_PX && end());
        const d = o.drag();
        if (!d) return end();
        o.move(step(d, e.clientY - y0, o.count), [e.clientX, e.clientY]);
    };
    const up = (e: PointerEvent) => {
        if (e.pointerId !== id) return;
        const d = live ? o.drag() : null;
        if (live) swallowUntil = Date.now() + 400;
        end();
        if (d) o.drop(d);
    };
    // Once held, the finger moves the row, not the page, and letting go is not a tap.
    const stopScroll = (e: TouchEvent) => live && e.preventDefault();
    const stopTap = (e: Event) => {
        if (!live && Date.now() >= swallowUntil) return;
        e.preventDefault();
        e.stopPropagation();
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("touchmove", stopScroll, { passive: false });
    el.addEventListener("click", stopTap, true);
    el.addEventListener("contextmenu", stopTap, true);
    return {
        update: (next: RowDragOpts<D>) => {
            o = next;
        },
        destroy: () => {
            end();
            el.removeEventListener("pointerdown", down);
            el.removeEventListener("touchmove", stopScroll);
            el.removeEventListener("click", stopTap, true);
            el.removeEventListener("contextmenu", stopTap, true);
        },
    };
}

/** How far (px) a sibling not being dragged slides to make room for the one that is. */
export function rowShift(d: RowDrag | null, rowId: string, index: number): number {
    if (!d || rowId === d.rowId) return 0;
    const { fromIndex: from, targetIndex: to, rowHeight: h } = d;
    if (from < to && index > from && index <= to) return -h;
    if (from > to && index >= to && index < from) return h;
    return 0;
}

const SWIPE_PX = 96;

/** `use:` action: drag a row left. Past SWIPE_PX `swiped` runs and the row springs back; with `hold` it rests open
 *  that many px instead, uncovering what sits behind it, until it is tapped or dragged back. Null: it stays put. */
export function rowSwipe(el: HTMLElement, opts: { swiped?: () => void; hold?: number } | null) {
    let o = opts;
    if (!o) return;
    let open = 0;
    let swallowUntil = 0;
    const rest = (x: number) => {
        open = x;
        el.style.transform = x ? `translateX(${x}px)` : "";
    };
    const swallow = (e: Event) => {
        if (Date.now() < swallowUntil || open) {
            e.preventDefault();
            e.stopPropagation();
            if (Date.now() >= swallowUntil) rest(0);
        }
    };
    el.addEventListener("click", swallow, true);
    const gesture = new DragGesture(
        el,
        ({ last, movement: [mx], tap }) => {
            if (tap || !o) return;
            const dx = Math.min(0, open + mx);
            if (!last) {
                el.style.transform = `translateX(${dx}px)`;
                return;
            }
            swallowUntil = Date.now() + 250;
            if (o.hold) return rest(dx <= -o.hold / 2 ? -o.hold : 0);
            rest(0);
            if (dx <= -SWIPE_PX) o.swiped?.();
        },
        // No axis latch: a slightly vertical start would drop the whole swipe.
        { threshold: 10, filterTaps: true, pointer: { keys: false, capture: false } },
    );
    return {
        update: (next: typeof opts) => {
            o = next;
            if (!o) rest(0);
        },
        destroy: () => {
            el.removeEventListener("click", swallow, true);
            gesture.destroy();
        },
    };
}
