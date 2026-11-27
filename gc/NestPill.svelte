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
    under,
    corner,
    foot,
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
    /** The label is several rows, centred on the pill. */
    stack?: "middle";
    glyph?: Snippet;
    children: Snippet;
    values?: Snippet;
    /** A line of whole items under the glyph and the label, as wide as both: it wraps, and ends where the values end. */
    under?: Snippet;
    /** Sits in the pill's top right corner, clear of the centred ">". */
    corner?: Snippet;
    /** Sits in the pill's bottom right corner, the corner's mirror under the ">". */
    foot?: Snippet;
} = $props();

const color = depthColor(listDepth());

// Every pill that takes a tap is two halves with a nib at halfway: left folds, right opens. One with a single
// tap does it from both halves.
const split = $derived(!!(ontoggle ?? ongo));
const tap = (e: MouseEvent) => (rightHalf(e) ? (ongo ? ongo() : ontoggle?.(e)) : ontoggle ? ontoggle(e) : ongo?.());
let pill = $state<HTMLElement>();
let at = $state<"fold" | "go">();
let pressed = $state(false);
// A finger has no hover: its half stays lit for a moment after the tap, so the two halves get learned.
const lift = (e: PointerEvent) => setTimeout(() => ((pressed = false), e.pointerType === "mouse" || (at = undefined)), 450);
const rightHalf = (e: MouseEvent) => {
    const r = pill!.getBoundingClientRect();
    return e.clientX > r.left + r.width / 2;
};
</script>

{#snippet body()}
    {#if under}<span class="np-row">{@render row()}</span><span class="np-under">{@render under()}</span>{:else}{@render row()}{/if}
{/snippet}
{#snippet row()}
    {#if open !== undefined}<span class="np-fold np-chev">{#if open !== null}<GoChevron down={open} />{/if}</span>{/if}
    {@render glyph?.()}
    <span class="np-label">{@render children()}</span>
    {@render values?.()}
{/snippet}

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
    bind:this={pill}
    onpointermove={split ? (e) => (at = rightHalf(e) ? "go" : "fold") : undefined}
    onpointerdown={split ? (e) => ((at = rightHalf(e) ? "go" : "fold"), (pressed = true)) : undefined}
    onpointerup={split ? lift : undefined}
    onpointerleave={(e) => (e.pointerType === "mouse" ? (at = undefined) : undefined)}
    class:np--pressed={pressed}
    class:np--split={split}
    data-at={at}
    class="np" class:np--small={small} class:np--detail={detail} class:np--dashed={dashed} class:np--stack={stack} class:np--go={ongo} class:np--under={under} style:--c={color}>
    {#if ontoggle ?? ongo}
        <button type="button" class="np-main" aria-expanded={open ?? undefined} onclick={tap}>{@render body()}</button>
    {:else}
        <div class="np-main">{@render body()}</div>
    {/if}
    {#if ongo}
        <button type="button" class="np-side" aria-label={goLabel} onclick={ongo}>
            {#if corner}<span class="np-corner">{@render corner()}</span>{/if}
            <span class="np-chev"><GoChevron /></span>
            {#if foot}<span class="np-corner np-foot">{@render foot()}</span>{/if}
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
.np--split {
    position: relative;
    --wash: color-mix(in srgb, var(--rt-yellow) 22%, transparent);
}
.np--split::before,
.np--split::after {
    content: "";
    position: absolute;
    left: 50%;
    width: 1px;
    height: 4px;
    background: var(--c);
    opacity: 0.6;
    pointer-events: none;
}
.np--split::before {
    top: 0;
}
.np--split::after {
    bottom: 0;
}
.np--split[data-at="fold"] {
    background-image: linear-gradient(to right, var(--wash) 50%, transparent 50%);
}
.np--split[data-at="go"] {
    background-image: linear-gradient(to left, var(--wash) 50%, transparent 50%);
}
.np--pressed {
    --wash: color-mix(in srgb, var(--rust) 28%, transparent);
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
.np--under > .np-main {
    flex-direction: column;
    align-items: stretch;
    justify-content: center;
    gap: 3px;
    padding-block: 6px;
}
.np-row {
    display: flex;
    align-items: center;
    gap: 9px;
    min-width: 0;
}
.np-under {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 2px 6px;
}
/* Clear of the fold chevron, under the tick and the glyph. */
.np-row:has(> .np-fold) + .np-under {
    padding-left: 22px;
}
.np-under > :global(*) {
    flex: none;
}
/* Corner above, chevron dead centre: the equal rows either side of the chevron make the pill as tall as the
   corner needs, so the two never meet at any line count. The corner has no width of its own: the column is the
   chevron's, and a long note hangs left over the pill instead of narrowing its lines. */
.np-side {
    flex: none;
    display: grid;
    grid-template-rows: 1fr auto 1fr;
    justify-items: end;
    padding: 0 12px 0 9px;
}
.np-corner {
    align-self: start;
    width: 0;
    margin: 5px -6px 0 0;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
    line-height: 1;
    white-space: nowrap;
}
.np-foot {
    grid-row: 3;
    align-self: end;
    margin: 0 -6px 5px 0;
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
    grid-row: 2;
    margin: -5px -7px -5px -6px;
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
/* One line of a stacked label, cut with … */
.np :global(.nest-line) {
    max-width: 100%;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
}
/* A meta line is whole items: it wraps between them and cuts none. */
.np :global(.nest-line.nest-meta) {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 2px 4px;
    overflow: visible;
    white-space: normal;
    overflow-wrap: anywhere;
}
.np :global(.nest-line.nest-meta > *) {
    flex: none;
    max-width: 100%;
}

/* What a pill's label and values are written in, wherever the host puts them. */
.np :global(.nest-value) {
    flex: none;
    display: flex;
    align-items: center;
    gap: 4px;
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
