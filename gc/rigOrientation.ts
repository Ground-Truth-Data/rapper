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
	return LANDSCAPE_ROUTES.has(normalise(pathname));
}

/**
 * Routes that take the whole screen, with no top bar over them.
 *
 * The top bar is navigation, and a route here is one where the content needs
 * the height more than the page needs a way out: /app/georef fits a fixed-size
 * sheet-and-satellite spread into a landscape phone, where the bar is a sixth
 * of the screen. The BOTTOM bar stays — the tab strip is the way back, so
 * dropping the top one costs nothing that is not still on screen.
 */
const NO_TOP_BAR_ROUTES = new Set(["/app/georef", "/georef"]);

export function hasTopBar(pathname: string): boolean {
	return !NO_TOP_BAR_ROUTES.has(normalise(pathname));
}

const normalise = (pathname: string) => pathname.replace(/\/+$/, "") || "/";
