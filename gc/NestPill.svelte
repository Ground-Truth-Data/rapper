<!-- One pill of a nested list: one body laid out across the whole pill, under two real buttons, half each. The
     left folds, the right opens its drawer; the body takes no tap, and a half with no handler does nothing. Its
     colour is its depth, counted from the NestGroups around it. -->
<script lang="ts" module>
import { getContext, setContext } from "svelte";

const DEPTH = Symbol("nest-depth");
const COLORS = ["var(--rt-fg)", "var(--rt-yellow)", "var(--rust)", "var(--rt-sage)"];
/** 0 outside any NestGroup, 1 in the list, one more inside each NestGroup under it. */
export const listDepth = () => getContext<number>(DEPTH) ?? 0;
export const setNestDepth = (d: number) => setContext(DEPTH, d);
export const depthColor = (d: number) => COLORS[Math.min(Math.max(d, 1), COLORS.length) - 1]!;

const STILL = Symbol("pill-still");
/** Inside a pill a chip is a plain span: its tap belongs to the half under it. */
export const inPill = () => getContext<boolean>(STILL) ?? false;
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
    dotted = false,
    dashed = false,
    steel = false,
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
    /** Set on a pill with children: draws the left chevron. `null` keeps the chevron's space, empty, so a
     *  childless pill lines up with its folding siblings. */
    open?: boolean | null;
    ontoggle?: (e: MouseEvent) => void;
    /** Draws the right ">" and opens the pill's drawer. `null`: a right half with nothing to do, disabled. */
    ongo?: (() => void) | null;
    goLabel?: string;
    small?: boolean;
    /** A line of small text and one value, never tapped. */
    detail?: boolean;
    /** A calculated value: dotted, unfilled. */
    dotted?: boolean;
    /** An action that holds no value: dashed. */
    dashed?: boolean;
    /** A value you can change right here: a steel track, no ">". Its value sits on a raised `.np-plac`. */
    steel?: boolean;
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
    /** Export mode: the tick box, in a column of its own at the left, while the pill slides right past the edge. */
    tickBox?: Snippet;
    ontick?: () => void;
} = $props();

const color = depthColor(listDepth());
const id = $props.id();
setContext(STILL, !!(ontoggle || ongo !== undefined));
</script>

{#snippet row()}
    {#if open !== undefined}<span class="np-fold np-chev">{#if open !== null}<GoChevron down={open} />{/if}</span>{/if}
    {@render glyph?.()}
    <span class="np-label" id="{id}-l">{@render children()}</span>
    {@render values?.()}
{/snippet}

<div class="np" class:np--small={small} class:np--detail={detail} class:np--dotted={dotted} class:np--dashed={dashed} class:np--steel={steel} class:np--stack={stack} class:np--go={ongo} class:np--under={under} class:np--tick={ontick} style:--c={color}>
    {#if ontick}<button type="button" class="np-tick" aria-label={goLabel} onclick={ontick}>{@render tickBox?.()}</button>{/if}
    <div class="np-body">
        <span class="np-face">
            {#if under}<span class="np-line">{@render row()}</span><span class="np-under">{@render under()}</span>{:else}{@render row()}{/if}
        </span>
        {#if (ongo && !steel) || corner || foot}
            <span class="np-end">
                {#if corner}<span class="np-corner">{@render corner()}</span>{/if}
                <span class="np-chev np-go">{#if ongo && !steel}<GoChevron />{/if}</span>
                {#if foot}<span class="np-corner np-foot">{@render foot()}</span>{/if}
            </span>
        {/if}
    </div>
    <!-- A pill that neither folds nor opens has no halves: its own controls (a rate, a link) keep their taps. -->
    {#if ontoggle || ongo !== undefined}
        <button type="button" class="np-half np-main" disabled={!ontoggle} aria-expanded={open ?? undefined} aria-labelledby="{id}-l" onclick={ontoggle}></button>
        {#if ongo !== undefined}<button type="button" class="np-half np-side" disabled={!ongo} aria-label={goLabel} onclick={ongo ?? undefined}></button>{/if}
    {/if}
</div>

<style>
/* Export mode: the pill slides right by the tick's column, and its list clips what goes past the edge. */
.np {
    transition: transform 0.25s ease;
}
.np--tick {
    transform: translateX(44px);
}
.np-tick {
    position: absolute;
    top: 0;
    bottom: 0;
    left: -44px;
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
.np {
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
.np::before,
.np::after {
    content: "";
    position: absolute;
    left: 50%;
    width: 1px;
    height: 4px;
    background: var(--c);
    opacity: 0.6;
    pointer-events: none;
}
.np::before {
    top: 0;
}
.np::after {
    bottom: 0;
}
.np--small {
    min-height: 38px;
    font-size: 17px;
}
.np--detail {
    min-height: 42px;
    font-size: 18px;
}
.np--dotted {
    min-height: 36px;
    border: 2px dotted var(--c);
    background: none;
}
.np--dashed {
    min-height: 36px;
    border-style: dashed;
}
.np--stack {
    min-height: 62px;
}
.np--steel {
    min-height: 52px;
    border-radius: 18px;
    background: linear-gradient(180deg, #3a3a3a 0%, #2c2c2c 100%);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
    font-size: 21px;
}
.np--steel .np-label {
    color: var(--c);
}
/* The raised steel button a steel pill's value sits on. */
.np :global(.np-plac) {
    flex: none;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 4px;
    box-sizing: border-box;
    min-width: 120px;
    height: 42px;
    margin: 5px 0;
    padding: 0 14px;
    border-radius: 13px;
    background: var(--rt-btn-neutral-bg);
    box-shadow: 0 2px 0 #111, 0 3px 8px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.12);
    color: #fff;
    font-size: 24px;
    text-shadow: 0 1px 0 #000, 0 2px 2px #000;
    white-space: nowrap;
}
/* The body is what the pill shows; the halves over it are what a finger meets. */
.np-body {
    display: flex;
    min-height: inherit;
}
.np:has(> .np-half) > .np-body {
    pointer-events: none;
}
.np-half {
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
.np-main {
    left: 0;
    border-radius: 12.5px 0 0 12.5px;
}
.np-side {
    right: 0;
    border-radius: 0 12.5px 12.5px 0;
}
.np-half:enabled:hover {
    background: color-mix(in srgb, var(--rt-yellow) 22%, transparent);
}
.np-half:enabled:active {
    background: color-mix(in srgb, var(--rust) 28%, transparent);
}
.np-half:disabled {
    cursor: default;
}
.np-face {
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 0 12px;
}
.np-body:has(> .np-end) > .np-face {
    padding-right: 0;
}
.np--under .np-face {
    flex-direction: column;
    align-items: stretch;
    justify-content: center;
    gap: 3px;
    padding-block: 6px;
}
.np-line {
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
.np-line:has(> .np-fold) + .np-under {
    padding-left: 22px;
}
.np-under > :global(*) {
    flex: none;
}
/* Corner above, chevron dead centre, foot below: the corner has no width of its own, so a long one hangs left
   over the pill instead of narrowing its lines. */
.np-end {
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
/* GoChevron's 24px box carries its own air, pulled back here. */
.np-chev {
    flex: none;
    display: flex;
    color: var(--c);
}
.np-fold {
    width: 24px;
    margin: 0 -6px 0 -5px;
}
.np-go {
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
.np--dotted .np-label {
    color: var(--rt-fg-muted);
}
.np--stack .np-face {
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
/* A chip on its own line keeps its own width. */
.np--stack .np-label > :global(.id-pill),
.np--stack .np-label > :global(.id-mark) {
    align-self: flex-start;
}
.np :global(.nest-line) {
    max-width: 100%;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
}
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
