// Drag a row up or down its list by its grip (the inbox's maps and features, Ops' plugins), or left to dismiss it
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
            const targetIndex = Math.max(0, Math.min(o.count - 1, d.fromIndex + Math.round(my / d.rowHeight)));
            o.move({ ...d, deltaY: my, targetIndex }, xy as [number, number]);
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
