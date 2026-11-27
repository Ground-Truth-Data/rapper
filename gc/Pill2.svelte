<!-- A nested-list pill as two real buttons, half each: the left folds, the right opens. A side with no handler is
     disabled, never removed, so the halves never move. Same props and snippets as NestPill. -->
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
    /** Set on a pill with children: draws the fold chevron. `null` draws none: the left half is too narrow to
     *  hold an empty slot. */
    open?: boolean | null;
    ontoggle?: (e: MouseEvent) => void;
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
setContext(STILL, true);
</script>

<div class="p2-row" class:p2-row--tick={ontick}>
{#if ontick}<button type="button" class="p2-tick" aria-label={goLabel} onclick={ontick}>{@render tickBox?.()}</button>{/if}
<div class="p2" class:p2--small={small} class:p2--detail={detail} class:p2--dashed={dashed} class:p2--stack={stack} style:--c={color}>
    <button type="button" class="p2-l" disabled={!ontoggle} aria-expanded={open ?? undefined} onclick={ontoggle}>
        {#if open != null}<span class="p2-chev p2-fold"><GoChevron down={open} /></span>{/if}
        {@render glyph?.()}
        <span class="p2-label">{@render children()}{#if under}<span class="p2-under">{@render under()}</span>{/if}</span>
    </button>
    <button type="button" class="p2-r" disabled={!ongo} aria-label={goLabel} onclick={ongo}>
        <span class="p2-values">{@render values?.()}</span>
        <span class="p2-corner">{@render corner?.()}</span>
        <span class="p2-chev p2-go">{#if ongo}<GoChevron />{/if}</span>
        <span class="p2-foot">{@render foot?.()}</span>
    </button>
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
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
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
.p2-l,
.p2-r {
    min-width: 0;
    margin: 0;
    border: 0;
    background: none;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
}
.p2-l {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 6px 6px 6px 12px;
    border-radius: 12.5px 0 0 12.5px;
}
.p2-r {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-rows: 1fr auto 1fr;
    column-gap: 6px;
    padding: 0 12px 0 6px;
    border-radius: 0 12.5px 12.5px 0;
}
.p2-l:enabled:hover,
.p2-r:enabled:hover {
    background: color-mix(in srgb, var(--rt-yellow) 22%, transparent);
}
.p2-l:enabled:active,
.p2-r:enabled:active {
    background: color-mix(in srgb, var(--rust) 28%, transparent);
}
button:disabled {
    cursor: default;
}
.p2-values {
    grid-column: 1;
    grid-row: 1 / 4;
    align-self: center;
    justify-self: end;
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
}
.p2-corner,
.p2-foot {
    grid-column: 2;
    justify-self: end;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    line-height: 1;
    white-space: nowrap;
}
.p2-corner {
    grid-row: 1;
    align-self: start;
    margin-top: 5px;
}
.p2-foot {
    grid-row: 3;
    align-self: end;
    margin-bottom: 5px;
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
    grid-column: 2;
    grid-row: 2;
    justify-self: end;
    margin-right: -7px;
}
.p2-label {
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 4px;
    line-height: 1.15;
}
/* A chip on its own line keeps its own width. */
.p2-label > :global(.id-pill),
.p2-label > :global(.id-mark) {
    align-self: flex-start;
}
.p2-under {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 2px 6px;
}
.p2--detail .p2-label {
    color: var(--rt-yellow);
    font: 500 13px var(--rt-font-meta);
}
.p2--dashed .p2-label {
    color: var(--rt-fg-muted);
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
