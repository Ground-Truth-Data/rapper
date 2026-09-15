/**
 * The precondition every map layer shares: a style that will ACCEPT sources.
 *
 * `addSource`/`addLayer` throw "Style is not done loading" whenever the style
 * is mid-flight — first load, or a basemap swap, which drops every custom
 * layer and rebuilds. 115 call sites across the two maps depend on that
 * timing, and before this file each feature hand-rolled its own guard: 15
 * files, four different mechanisms, several of them subtly wrong. `mapDraw.ts`
 * had a comment PROMISING it deferred and no code that did, which is how a
 * tile landing mid-boot put a red error card on the user's screen.
 *
 * Four lessons were each recorded in exactly one file and unknown to the rest.
 * They are encoded here so no caller has to know them:
 *
 *  1. `styledata`, NOT `style.load`. `style.load` fires once per style and
 *     BEFORE the style will accept a symbol layer, so a guarded callback
 *     returns early and nothing ever puts the layer back. `styledata` keeps
 *     firing as the style settles, so one landing is ready.
 *     (learned in hospitalLayer.ts)
 *  2. `isStyleLoaded()`, NOT `getStyle()`/`.style`. A Map assigns `.style` in
 *     its constructor and `getStyle()` is truthy the moment a Style object
 *     exists — long before `addSource` will accept anything.
 *     (learned in mobMapWaitingBox.ts, mapMarker.ts)
 *  3. Re-check AFTER every await. A style swap landing between an await and
 *     its resolve makes a check taken before the await a lie.
 *     (learned in hospitalLayer.ts, gridTile.svelte.ts)
 *  4. The callback runs on EVERY ready style, not once. A basemap swap
 *     destroys custom layers, so a one-shot subscription silently loses them.
 *     Callbacks must be idempotent — they re-run per style by design.
 *
 * Idempotence is the caller's half of the contract: guard with
 * `map.getSource(id)` and early-return, as every layer module already does.
 */

/** The slice of mapbox-gl / maplibre-gl Map this needs. Both satisfy it structurally, so neither renderer is imported here — this file stays dependency-free and usable from either map. */
type StyleAwareMap = {
	isStyleLoaded?: () => boolean;
	on: (type: string, listener: () => void) => unknown;
	off: (type: string, listener: () => void) => unknown;
};

/** Stop listening; safe to call more than once. */
export type StyleReadyDisposer = () => void;

/**
 * True when the style will accept `addSource`/`addLayer` right now.
 *
 * Call this after any await inside a callback — lesson 3. A check taken before
 * the await says nothing about the style that exists after it.
 */
export function isStyleReady(map: StyleAwareMap | null | undefined): boolean {
	return typeof map?.isStyleLoaded === "function" && map.isStyleLoaded();
}

/**
 * Run `fn` whenever the map's style is ready to accept sources and layers —
 * immediately if it already is, and again after every style swap.
 *
 * `fn` must be idempotent: it runs once per ready style, and `styledata` can
 * deliver several ready ticks for one style. Guard with `map.getSource(id)`.
 *
 * Returns a disposer; call it on teardown or the listener outlives the map.
 */
export function whenStyleReady(
	map: StyleAwareMap | null | undefined,
	fn: () => void,
): StyleReadyDisposer {
	if (!map) return () => {};

	let disposed = false;

	const run = (): void => {
		if (disposed || !isStyleReady(map)) return;
		fn();
	};

	// styledata, not style.load — lesson 1. It also covers the first load, so
	// there is no separate initial-load subscription to forget.
	map.on("styledata", run);
	// Already-ready maps emit no further styledata until something changes, so
	// a subscription alone would never fire for a caller attaching late.
	run();

	return () => {
		if (disposed) return;
		disposed = true;
		map.off("styledata", run);
	};
}
