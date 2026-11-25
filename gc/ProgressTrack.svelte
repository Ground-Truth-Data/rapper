<!-- Icon, a bar scaled to `target`, then the count. Past the target the bar is full and the over part turns teal. -->
<script lang="ts">
import type { Snippet } from "svelte";

let { value, target, color, icon, children }: { value: number; target: number; color: string; icon: Snippet; /** The count. */ children: Snippet } = $props();

const over = $derived(target > 0 && value > target);
const fill = $derived(target > 0 ? (over ? target / value : value / target) * 100 : 0);
</script>

<span class="pt">
    {@render icon()}
    <span class="pt-bar"><i style:width="{fill}%" style:background={color}></i>{#if over}<i class="pt-over" style:width="{100 - fill}%"></i>{/if}</span>
    <span class="pt-count">{@render children()}</span>
</span>

<style>
.pt {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 20px;
}
.pt-bar {
    flex: 1 1 auto;
    display: flex;
    height: 7px;
    border-radius: 999px;
    overflow: hidden;
    background: #2a2a2a;
}
.pt-bar i {
    display: block;
}
.pt-over {
    background: #3fb6c8;
}
.pt-count {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 4px;
    min-width: 62px;
    color: var(--rt-fg);
    font-size: 17px;
}
</style>
