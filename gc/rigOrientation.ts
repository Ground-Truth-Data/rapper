/**
 * WHICH WAY UP THE PHONE IS, FOR A GIVEN ROUTE — asked once, answered here.
 *
 * Three separate layouts mount <PhoneRig> (ReTreever's (getcache) layout,
 * rapper's (gc) layout, and each child's standalone layout), and the page that
 * wants the turn is a DESCENDANT of whichever one is running, so it cannot
 * pass a prop up. Left to the layouts, the same route would be listed three
 * times and drift the first time one of them was edited — which is exactly how
 * the debug-route frame rule already reads in ReTreever.
 *
 * A route is listed because its CONTENT is wide, not because of anything about
 * the tier serving it, so the answer is a property of the path and belongs in
 * one table that every mount consults.
 */

/**
 * Routes that read better with the phone turned a quarter turn.
 *
 * /app/georef puts a PDF sheet and the satellite side by side and asks you to
 * match points between them. Stacked in a portrait frame they are each half a
 * phone wide, which is smaller than the features being matched.
 */
const LANDSCAPE_ROUTES = new Set(["/app/georef", "/georef"]);

/**
 * Both spellings of every route are listed: a child served standalone mounts
 * its pages at the bare path, and the same page mounted by a tier gains the
 * /app prefix. One table, so a route cannot be landscape in one tier and
 * portrait in another.
 */
export function isLandscapeRoute(pathname: string): boolean {
	return LANDSCAPE_ROUTES.has(pathname.replace(/\/+$/, "") || "/");
}
