<script lang="ts">
/**
 * THE PHONE: backdrop, hand and frame, rendered identically by every tier.
 * Geometry lives in gc/theme.css. `viewport` = the page is nothing but the
 * phone (the Capacitor app; not rapper, which draws a nav). `landscape` is
 * opt-in and must stay so: a default-on turn would rotate every tier's pages.
 */
import type { Snippet } from "svelte";
import handPhoneUrl from "./assets/hand_phoneV3.webp";
import backdropUrl from "./assets/getcache_DT_bg.webp";

let {
	children,
	viewport = false,
	landscape = false,
}: { children?: Snippet; viewport?: boolean; landscape?: boolean } = $props();
</script>

{#snippet rig()}
<div
	class="mobile-preview-backdrop"
	class:rig-landscape={landscape}
	style="background-image: url({backdropUrl})"
>
	<div class="mobile-preview-wrapper">
		<img class="mobile-preview-hand" src={handPhoneUrl} alt="" draggable="false" />
		<div class="mobile-preview-frame">
			{#if landscape}
				<div class="mobile-preview-screen">{@render children?.()}</div>
			{:else}
				{@render children?.()}
			{/if}
		</div>
	</div>
</div>
{/snippet}

{#if viewport}
	<div class="phone-viewport">{@render rig()}</div>
{:else}
	{@render rig()}
{/if}
