<!-- One pill of a nested list. `open` set = a parent that folds the NestGroup after it; `ongo` = the right ">"
     that opens its drawer. Its colour is its depth, counted from the NestGroups around it. -->
<script lang="ts" module>
import { getContext, setContext } from "svelte";

const DEPTH = Symbol("nest-depth");
const COLORS = ["var(--rt-fg)", "var(--rt-yellow)", "var(--rust)", "var(--rt-sage)"];
/** 0 outside any NestGroup, 1 in the list, one more inside each NestGroup under it. */
export const listDepth = () => getContext<number>(DEPTH) ?? 0;
export const setNestDepth = (d: number) => setContext(DEPTH, d);
export const depthColor = (d: number) => COLORS[Math.min(Math.max(d, 1), COLORS.length) - 1]!;
</script>

<script lang="ts">
import type { Snippet } from "svelte";
import GoChevron from "./GoChevron.svelte";

let {
    open,
    ontoggle,
    ongo,
    goLabel,
    small = false,
    detail = false,
    dashed = false,
    stack,
    glyph,
    children,
    values,
    corner,
}: {
    /** Set on a pill with children: draws the left chevron. `null` keeps the chevron's space, empty, so a
     *  childless pill lines up with its folding siblings. */
    open?: boolean | null;
    ontoggle?: (e: MouseEvent) => void;
    /** Draws the right ">" and opens the pill's drawer. */
    ongo?: () => void;
    goLabel?: string;
    small?: boolean;
    /** A line of small text and one value, never tapped. */
    detail?: boolean;
    /** A calculated value: dashed, unfilled. */
    dashed?: boolean;
    /** The label is several rows: centred on the pill, or with "top" everything hangs from its top edge. */
    stack?: "middle" | "top";
    glyph?: Snippet;
    children: Snippet;
    values?: Snippet;
    /** Sits in the pill's top right corner, clear of the centred ">". */
    corner?: Snippet;
} = $props();

const color = depthColor(listDepth());
</script>

{#snippet body()}
    {#if open !== undefined}<span class="np-fold np-chev">{#if open !== null}<GoChevron down={open} />{/if}</span>{/if}
    {@render glyph?.()}
    <span class="np-label">{@render children()}</span>
    {@render values?.()}
{/snippet}

<div class="np" class:np--small={small} class:np--detail={detail} class:np--dashed={dashed} class:np--stack={stack} class:np--top={stack === "top"} class:np--go={ongo} style:--c={color}>
    {#if ontoggle ?? ongo}
        <button type="button" class="np-main" aria-expanded={open ?? undefined} onclick={(e) => (ontoggle ? ontoggle(e) : ongo?.())}>{@render body()}</button>
    {:else}
        <div class="np-main">{@render body()}</div>
    {/if}
    {#if ongo}
        <button type="button" class="np-side" aria-label={goLabel} onclick={ongo}>
            {#if corner}<span class="np-corner">{@render corner()}</span>{/if}
            <span class="np-chev"><GoChevron /></span>
        </button>
    {/if}
</div>

<style>
.np {
    display: flex;
    box-sizing: border-box;
    width: 100%;
    min-height: 46px;
    border: 1.5px solid var(--c);
    border-radius: 14px;
    background: color-mix(in srgb, var(--c) 9%, #000);
    color: var(--rt-fg);
    font-family: var(--rt-font-display);
    font-size: 20px;
}
.np--small {
    min-height: 38px;
    font-size: 17px;
}
.np--detail {
    min-height: 42px;
    font-size: 18px;
}
.np--dashed {
    min-height: 36px;
    border-style: dashed;
    background: none;
}
.np-main,
.np-side {
    margin: 0;
    border: 0;
    background: none;
    color: inherit;
    font: inherit;
    text-align: left;
    -webkit-tap-highlight-color: transparent;
}
button.np-main,
.np-side {
    cursor: pointer;
}
.np-main {
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 0 12px;
}
.np--go > .np-main {
    padding-right: 0;
}
.np-side {
    position: relative;
    flex: none;
    display: flex;
    align-items: center;
    padding: 0 12px 0 9px;
}
.np-corner {
    position: absolute;
    top: 5px;
    right: 10px;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
    line-height: 1;
    white-space: nowrap;
}
/* Both chevrons are the one GoChevron; its 24px box carries its own air, pulled back here. */
.np-chev {
    flex: none;
    display: flex;
    color: var(--c);
}
.np-fold {
    width: 24px;
    margin: 0 -6px 0 -5px;
}
.np-side > .np-chev {
    margin: 0 -7px 0 -6px;
}
.np-label {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
}
.np--detail .np-label {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--rt-yellow);
    font: 500 13px var(--rt-font-meta);
}
.np--dashed .np-label {
    color: var(--rt-fg-muted);
}

.np--stack {
    min-height: 62px;
}
.np--stack > .np-main {
    padding-block: 6px;
}
.np--stack .np-label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    overflow: visible;
    white-space: normal;
    line-height: 1.15;
}
.np--top > .np-main {
    align-items: flex-start;
    padding-block: 9px;
}
.np--top .np-fold {
    margin-top: 3px;
}
.np--top .np-label {
    gap: 6px;
    line-height: 1.1;
}
/* One line of a stacked label, cut with … */
.np :global(.nest-line) {
    max-width: 100%;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
}

/* What a pill's label and values are written in, wherever the host puts them. */
.np :global(.nest-value) {
    flex: none;
    display: flex;
    align-items: center;
    gap: 5px;
    white-space: nowrap;
}
.np :global(.nest-value--money) {
    color: var(--rt-yellow);
}
.np :global(.nest-muted) {
    color: #9a9a9a;
}
.np :global(.nest-sage),
:global(.nest-sage) {
    color: var(--rt-fg-muted);
}
:global(.nest-time) {
    color: var(--rust);
    font: 500 12px var(--rt-font-meta);
}
:global(.nest-meta) {
    font: 500 13px var(--rt-font-meta);
}
</style>
