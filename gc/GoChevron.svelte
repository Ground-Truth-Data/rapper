<!-- The one row chevron: a row's fold, a row's end and the inbox's pill separators draw this, so they read as one size. -->
<script lang="ts">
import Icon from "./Icon.svelte";

let { down = false }: { down?: boolean } = $props();
</script>

<Icon name={down ? "chevron-down" : "chevron-right"} size={24} stroke={3} />
