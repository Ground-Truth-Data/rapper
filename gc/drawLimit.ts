// The draw tool's vertex cap. Only drawing adds vertices — an edit moves
// them — so an imported shape, however detailed, is never held to it.

export const DRAWN_SHAPE_MAX_POINTS = 50;

/** Shown on the shape's total while it holds the cap. */
export const DRAW_LIMIT_NOTE = `${DRAWN_SHAPE_MAX_POINTS} points is the limit for a drawn shape`;

export const mayAddVertex = (held: number): boolean => held < DRAWN_SHAPE_MAX_POINTS;
