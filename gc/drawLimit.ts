// The draw tool's vertex cap. Only drawing adds vertices — an edit moves
// them — so an imported shape, however detailed, is never held to it.

import { toast } from "svelte-sonner";

export const DRAWN_SHAPE_MAX_POINTS = 50;

/** False, with a toast saying why, once a drawn shape holds the cap. */
export function mayAddVertex(held: number): boolean {
	if (held < DRAWN_SHAPE_MAX_POINTS) return true;
	toast(`${DRAWN_SHAPE_MAX_POINTS} points is the limit for a drawn shape`, { id: "draw-limit" });
	return false;
}
