<script lang="ts">
import { m } from "$parent/src/lib/paraglide/messages";
import darkTilt from "./assets/diamond_darkRose_tilt.webp";
import darkVert from "./assets/diamond_darkRose_vert.webp";
import lightTilt from "./assets/diamond_lightRose_tilt.webp";
import lightVert from "./assets/diamond_lightRose_vert.webp";

const ART = { light: { tilt: lightTilt, vert: lightVert }, dark: { tilt: darkTilt, vert: darkVert } };

/** The one "location confirmed" mark. `muted`: a delivery no longer out
 *  there — planted or removed. `far`: swiped away from the cache, dark red.
 *  `size` in px, else three-quarters of the text. */
let {
	muted = false,
	far = false,
	size,
	art = "tilt",
	tone = "light",
}: { muted?: boolean; far?: boolean; size?: number; art?: "tilt" | "vert"; tone?: "light" | "dark" } = $props();
</script>

{#if far}
	<span
		class="gc-dia far"
		role="img"
		style:mask-image="url({ART[tone][art]})"
		style:width={size ? `${size}px` : null}
		style:height={size ? `${size}px` : null}
		aria-label={m.gc_location_confirmed()}
	></span>
{:else}
	<img
		class="gc-dia"
		class:muted
		src={ART[tone][art]}
		style:width={size ? `${size}px` : null}
		style:height={size ? `${size}px` : null}
		alt={muted ? m.gc_delivery_done() : m.gc_location_confirmed()}
	/>
{/if}

<style>
.gc-dia {
	display: inline-block;
	flex: none;
	width: 0.75em;
	height: 0.75em;
	margin-left: 3px;
	vertical-align: middle;
	align-self: center;
}
.muted {
	filter: grayscale(1);
	opacity: 0.6;
}
/* The art's shape filled with a darkened danger red; a recolour filter can't land on a token. */
.far {
	background: color-mix(in srgb, var(--rt-danger) 80%, black);
	mask-size: contain;
	mask-repeat: no-repeat;
	mask-position: center;
}
</style>
