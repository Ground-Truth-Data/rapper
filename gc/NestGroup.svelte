<!-- A list of NestPills. The outermost one is the list itself; one inside it holds a pill's children, a depth
     down, hung on a dashed line in the parent's colour. -->
<script lang="ts">
import type { Snippet } from "svelte";
import { depthColor, listDepth, setNestDepth } from "./NestPill.svelte";

let { children }: { children: Snippet } = $props();

const parent = listDepth();
setNestDepth(parent + 1);
</script>

<div class="ng" class:ng--top={!parent} style:--c={parent ? depthColor(parent) : null}>{@render children()}</div>

<style>
.ng {
    display: flex;
    flex-direction: column;
    gap: var(--nest-gap, 6px);
    margin-left: 5px;
    padding-left: 7px;
    border-left: 2px dashed color-mix(in srgb, var(--c) 75%, transparent);
}
.ng--top {
    margin: 0;
    padding: 0;
    border: 0;
}
</style>
