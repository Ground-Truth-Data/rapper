// areaLabels.ts paints area-name text with this when a piece has no overlap-cycle colour.
export const POLYGON_FILL = "#e8a06a";
export const POLYGON_OUTLINE = "#d97c33";
// A border reaches this far either side of its line, in screen px: a tap or hover on it, and a snake node snapping to it, all use the one reach. The hover glow is that band, so you can see it.
export const BORDER_REACH_PX = 8;
export const BORDER_RUST = "#e8763a";

// A FAMILY: each shape's weight is RELATIVE to the others; `casing` is the dark line UNDER `line`, ~1.5px wider a side.
export const STROKE = {
    block: { line: 5, casing: 9 },
    polygon: { line: 1.5, casing: 3.5 },
    line: { line: 2, casing: 4 },
    /** Recorded GPS breadcrumbs — dashed, with its own gap geometry. */
    track: { line: 1.5, casing: 3, gap: 3, casingGap: 1.5 },
} as const;
