// Drag a row up or down its list by its grip: the inbox's maps and features, Ops' plugins.
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
