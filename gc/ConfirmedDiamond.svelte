<script lang="ts">
import { m } from "$parent/src/lib/paraglide/messages";

/** The one "location confirmed" mark, always last on its line. `muted`: a
 *  delivery no longer out there — planted or removed. `size` in px, else the text's. */
let { muted = false, size }: { muted?: boolean; size?: number } = $props();
</script>

<i class="gc-dia" class:muted style:font-size={size ? `${size}px` : null} role="img" aria-label={muted ? m.gc_delivery_done() : m.gc_location_confirmed()}></i>

<style>
.gc-dia {
	display: inline-block;
	flex: none;
	width: 1em;
	height: 0.78em;
	margin-left: 0.25em;
	vertical-align: middle;
	align-self: center;
	mask: url("$gc/assets/diamond.webp") center / contain no-repeat;
	background: linear-gradient(170deg, #ffd6e1 15%, var(--rt-rose) 55%, #d9809d);
	filter: drop-shadow(0 0 3px color-mix(in srgb, var(--rt-rose) 45%, transparent));
}
.muted {
	background: #6f7064;
	filter: none;
}
</style>
