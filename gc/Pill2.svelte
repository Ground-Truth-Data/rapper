<!-- A nested-list pill: one body laid out across the whole pill, as NestPill lays it out, under two real buttons,
     half each: the left folds, the right opens. The body takes no tap; a side with no handler is disabled, never
     removed. Same props and snippets as NestPill. -->
<script lang="ts" module>
import { getContext, setContext } from "svelte";

const STILL = Symbol("pill-still");
/** Inside a Pill2 a chip is a plain span: its tap belongs to the half under it. */
export const inPill = () => getContext<boolean>(STILL) ?? false;
</script>

<script lang="ts">
import type { Snippet } from "svelte";
import GoChevron from "./GoChevron.svelte";
import { depthColor, listDepth } from "./NestPill.svelte";

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
    tickBox,
    ontick,
}: {
    /** Set on a pill with children: draws the fold chevron. `null` keeps its space, empty, so a childless pill
     *  lines up with its folding siblings. */
    open?: boolean | null;
    ontoggle?: (e: MouseEvent) => void;
    /** Draws the right ">" and opens the pill's drawer. */
    ongo?: () => void;
    goLabel?: string;
    small?: boolean;
    detail?: boolean;
    dashed?: boolean;
    stack?: "middle";
    glyph?: Snippet;
    children: Snippet;
    values?: Snippet;
    under?: Snippet;
    corner?: Snippet;
    foot?: Snippet;
    /** Export mode: the tick box, in a column of its own at the left, while the pill slides right past the edge. */
    tickBox?: Snippet;
    ontick?: () => void;
} = $props();

const color = depthColor(listDepth());
const id = $props.id();
setContext(STILL, true);
</script>

{#snippet row()}
    {#if open !== undefined}<span class="p2-fold p2-chev">{#if open !== null}<GoChevron down={open} />{/if}</span>{/if}
    {@render glyph?.()}
    <span class="p2-label" id="{id}-l">{@render children()}</span>
    {@render values?.()}
{/snippet}

<div class="p2-row" class:p2-row--tick={ontick}>
{#if ontick}<button type="button" class="p2-tick" aria-label={goLabel} onclick={ontick}>{@render tickBox?.()}</button>{/if}
<div class="p2" class:p2--small={small} class:p2--detail={detail} class:p2--dashed={dashed} class:p2--stack={stack} class:p2--under={under} style:--c={color}>
    <div class="p2-body">
        <span class="p2-main">
            {#if under}<span class="p2-line">{@render row()}</span><span class="p2-under">{@render under()}</span>{:else}{@render row()}{/if}
        </span>
        {#if ongo || corner || foot}
            <span class="p2-side">
                {#if corner}<span class="p2-corner">{@render corner()}</span>{/if}
                <span class="p2-chev p2-go">{#if ongo}<GoChevron />{/if}</span>
                {#if foot}<span class="p2-corner p2-foot">{@render foot()}</span>{/if}
            </span>
        {/if}
    </div>
    <button type="button" class="p2-half p2-l" disabled={!ontoggle} aria-expanded={open ?? undefined} aria-labelledby="{id}-l" onclick={ontoggle}></button>
    <button type="button" class="p2-half p2-r" disabled={!ongo} aria-label={goLabel} onclick={ongo}></button>
</div>
</div>

<style>
.p2-row {
    position: relative;
    overflow-x: clip;
}
.p2-row > .p2 {
    transition: transform 0.25s ease;
}
.p2-row--tick > .p2 {
    transform: translateX(44px);
}
.p2-tick {
    position: absolute;
    inset: 0 auto 0 0;
    width: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0;
    padding: 0 4px 0 0;
    border: 0;
    background: none;
    color: inherit;
    cursor: pointer;
}
.p2 {
    position: relative;
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
/* The nib at halfway: where one button ends and the other begins. */
.p2::before,
.p2::after {
    content: "";
    position: absolute;
    left: 50%;
    width: 1px;
    height: 4px;
    background: var(--c);
    opacity: 0.6;
    pointer-events: none;
}
.p2::before {
    top: 0;
}
.p2::after {
    bottom: 0;
}
.p2--small {
    min-height: 38px;
    font-size: 17px;
}
.p2--detail {
    min-height: 42px;
    font-size: 18px;
}
.p2--dashed {
    min-height: 36px;
    border-style: dashed;
    background: none;
}
.p2--stack {
    min-height: 62px;
}
/* The body is what the pill shows; the halves over it are what a finger meets. */
.p2-body {
    display: flex;
    min-height: inherit;
    pointer-events: none;
}
.p2-half {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 50%;
    margin: 0;
    padding: 0;
    border: 0;
    background: none;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
}
.p2-l {
    left: 0;
    border-radius: 12.5px 0 0 12.5px;
}
.p2-r {
    right: 0;
    border-radius: 0 12.5px 12.5px 0;
}
.p2-half:enabled:hover {
    background: color-mix(in srgb, var(--rt-yellow) 22%, transparent);
}
.p2-half:enabled:active {
    background: color-mix(in srgb, var(--rust) 28%, transparent);
}
.p2-half:disabled {
    cursor: default;
}
.p2-main {
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 0 12px;
}
.p2-body:has(> .p2-side) > .p2-main {
    padding-right: 0;
}
.p2--under .p2-main {
    flex-direction: column;
    align-items: stretch;
    justify-content: center;
    gap: 3px;
    padding-block: 6px;
}
.p2-line {
    display: flex;
    align-items: center;
    gap: 9px;
    min-width: 0;
}
.p2-under {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 2px 6px;
}
.p2-line:has(> .p2-fold) + .p2-under {
    padding-left: 22px;
}
.p2-under > :global(*) {
    flex: none;
}
/* Corner above, chevron dead centre, foot below: the corner has no width of its own, so a long one hangs left
   over the pill instead of narrowing its lines. */
.p2-side {
    flex: none;
    display: grid;
    grid-template-rows: 1fr auto 1fr;
    justify-items: end;
    padding: 0 12px 0 9px;
}
.p2-corner {
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
.p2-foot {
    grid-row: 3;
    align-self: end;
    margin: 0 -6px 5px 0;
}
/* GoChevron's 24px box carries its own air, pulled back here. */
.p2-chev {
    flex: none;
    display: flex;
    color: var(--c);
}
.p2-fold {
    width: 24px;
    margin: 0 -6px 0 -5px;
}
.p2-go {
    grid-row: 2;
    margin: -5px -7px -5px -6px;
}
.p2-label {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
}
.p2--detail .p2-label {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--rt-yellow);
    font: 500 13px var(--rt-font-meta);
}
.p2--dashed .p2-label {
    color: var(--rt-fg-muted);
}
.p2--stack .p2-main {
    padding-block: 6px;
}
.p2--stack .p2-label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    overflow: visible;
    white-space: normal;
    line-height: 1.15;
}
/* A chip on its own line keeps its own width. */
.p2--stack .p2-label > :global(.id-pill),
.p2--stack .p2-label > :global(.id-mark) {
    align-self: flex-start;
}
.p2 :global(.nest-line) {
    max-width: 100%;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
}
.p2 :global(.nest-line.nest-meta) {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 2px 4px;
    overflow: visible;
    white-space: normal;
    overflow-wrap: anywhere;
}
.p2 :global(.nest-line.nest-meta > *) {
    flex: none;
    max-width: 100%;
}
.p2 :global(.nest-value) {
    flex: none;
    display: flex;
    align-items: center;
    gap: 4px;
    white-space: nowrap;
}
.p2 :global(.nest-value--money) {
    color: var(--rt-yellow);
}
.p2 :global(.nest-muted) {
    color: #9a9a9a;
}
</style>
