<script lang="ts">
import { page } from "$app/state";
import PhoneRig from "$gc/PhoneRig.svelte";
import ShovelCursor from "$gc/ShovelCursor.svelte";
import { isLandscapeRoute } from "$gc/rigOrientation";
import { configureTilesFromEnv } from "$parent/siblings/getCache_OfflineMap/lib/worker/tilesFromEnv";

configureTilesFromEnv();

let { children } = $props();
</script>

<!-- No `viewport`: rapper draws a nav above every page in dev, so the phone
     takes the box under it, never the window. -->
<PhoneRig landscape={isLandscapeRoute(page.url.pathname)}>
	{@render children()}
</PhoneRig>
<ShovelCursor />
