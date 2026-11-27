<!-- A survey, one of its days, or one of its plots, as every list draws them. One file so the three stay one
     design: `<SurveyRows row={{ kind: "plot", … }} when="1h" {words} ongo={…} />`. A survey and a day fold
     (`open`, `ontoggle`); the chevron at the right opens the row (`ongo`). The row and what is under it are
     two siblings: the host's list is a column with an 8 px gap. The reference picture is
     getCache's docs/style-guide/survey-date-plot-rows.webp. -->
<script lang="ts" module>
import type { Identity } from "./IdentityPill.svelte";

export type SurveyRow =
    | { kind: "survey"; name: string; density: number | null; quality: number | null; planted: number; spots: number }
    | { kind: "date"; date: string; count: number; surveyors: Identity[]; planters: Identity[] }
    | { kind: "plot"; plotNo: number; planted: number; spots: number; missed: number; excess: number; faults: string[] };

export type SurveyRowWords = {
    planted: string;
    spots: string;
    missed: string;
    excess: string;
    surveyor: string;
    planter: string;
    density: string;
    quality: string;
};

/** Each code once with how often it was called, most called first. Two chips fit: past that, the first and a "+N". */
function chips(faults: string[]) {
    const n = new Map<string, number>();
    for (const f of faults) n.set(f, (n.get(f) ?? 0) + 1);
    const all = [...n].sort((a, b) => b[1] - a[1]);
    const shown = all.length > 2 ? all.slice(0, 1) : all;
    return { shown, more: all.length - shown.length };
}
</script>

<script lang="ts">
import type { Snippet } from "svelte";
import contactGold from "./assets/contact_gold.webp";
import shovelGold from "./assets/shovel_gold.webp";
import treeWhite from "./assets/tree_white.webp";
import IdentityPill, { onePerPerson } from "./IdentityPill.svelte";

let {
    row,
    when = "",
    words,
    art = "",
    locale,
    open = false,
    ontoggle,
    ongo,
    onchip,
    onart,
    children,
}: {
    /** A survey's icon was tapped. */
    onart?: () => void;
    /** The rows under this one, drawn while it is open. */
    children?: Snippet;
    row: SurveyRow;
    /** Its own time, short ("1h"). */
    when?: string;
    words: SurveyRowWords;
    /** The quality icon a survey and a day wear. */
    art?: string;
    locale?: string;
    open?: boolean;
    ontoggle?: () => void;
    ongo?: () => void;
    /** A survey's chip was tapped. */
    onchip?: (kind: "density" | "quality") => void;
} = $props();

const percent = (n: number) => `${n.toLocaleString(locale, { maximumFractionDigits: 1 })}%`;
const folds = $derived(row.kind !== "plot");
const label = $derived(row.kind === "survey" ? row.name : row.kind === "date" ? row.date : `#${row.plotNo}`);

function tap(e: MouseEvent) {
    if ((e.target as Element).closest("button")) return;
    if (folds) ontoggle?.();
    else ongo?.();
}
</script>

{#snippet counts(planted: number, spots: number)}
    <span class="num" data-counts>
        <img src={treeWhite} alt="" />
        <span class="nl"><small>{words.planted}</small><span data-planted>{planted}</span></span>
        <span class="j">/</span>
        <span class="nl"><small>{words.spots}</small><span data-spots>{spots}</span></span>
    </span>
{/snippet}

{#snippet chev(d: string)}
    <svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path {d} /></svg>
{/snippet}

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="sr sr--{row.kind}" data-row={row.kind} onclick={tap}>
    {#if when}<span class="ago" data-when>{when}</span>{/if}
    {#if folds}
        <button type="button" class="btn" data-fold aria-expanded={open} aria-label={label} onclick={ontoggle}>{@render chev(open ? "M5 9l7 7 7-7" : "M9 5l7 7-7 7")}</button>
    {/if}
    {#if row.kind === "survey"}
        <button type="button" class="btn art" data-act="map" aria-label={label} disabled={!onart} onclick={onart}><img src={art} alt="" /></button>
        <span class="name" data-name title={row.name}>{row.name}</span>
        <span class="pcts">
            {#each ["density", "quality"] as const as kind (kind)}
                {@const n = row[kind]}
                {#if n != null}
                    <button type="button" class="pct pct--{kind}" data-act={kind} aria-label={words[kind]} disabled={!onchip} onclick={() => onchip?.(kind)}>{words[kind].charAt(0).toUpperCase()} {percent(n)}</button>
                {/if}
            {/each}
        </span>
        {@render counts(row.planted, row.spots)}
    {:else if row.kind === "date"}
        <span class="art"><img src={art} alt="" /><span class="badge" data-count>{row.count}</span></span>
        <span class="date" data-date>{row.date}</span>
        <span class="people">
            {#each [{ role: "surveyor", img: contactGold, all: onePerPerson(row.surveyors) }, { role: "planter", img: shovelGold, all: onePerPerson(row.planters) }] as const as p (p.role)}
                <span class="role"><img src={p.img} alt="" />{words[p.role]}</span>
                <span class="who" data-role={p.role}>{#each p.all as w (w.key ?? w.label)}<IdentityPill who={w} />{/each}</span>
            {/each}
        </span>
        <span class="gap"></span>
    {:else}
        {@const t = chips(row.faults)}
        <span class="no" data-no>#{row.plotNo}</span>
        {@render counts(row.planted, row.spots)}
        <span class="gap"></span>
        {#if row.missed > 0}
            <span class="tile under" data-delta="missed">-{row.missed}<small>{words.missed}</small></span>
        {:else if row.excess > 0}
            <span class="tile over" data-delta="excess">+{row.excess}<small>{words.excess}</small></span>
        {/if}
        {#if t.shown.length}
            <span class="codes" data-faults>
                {#each t.shown as [code, n] (code)}
                    <span class="ct" class:solo={t.shown.length + t.more === 1} data-code={code}>{code}{#if n > 1}<i>·{n}</i>{/if}</span>
                {/each}
                {#if t.more}<span class="ct" data-more>+{t.more}</span>{/if}
            </span>
        {/if}
    {/if}
    {#if ongo}
        <button type="button" class="btn" data-go aria-label={label} onclick={ongo}>{@render chev("M9 5l7 7-7 7")}</button>
    {:else}
        <span class="chev"></span>
    {/if}
</div>
{#if open && children}<div class="nest sr--{row.kind}">{@render children()}</div>{/if}

<style>
.sr--survey {
    --c: #fafafa;
}
.sr--date {
    --c: var(--rt-yellow);
}
.sr--plot {
    --c: var(--rust);
}
.sr {
    position: relative;
    display: flex;
    align-items: center;
    gap: 8px;
    box-sizing: border-box;
    min-height: 54px;
    padding: 8px 6px;
    border: 1.5px solid var(--c);
    border-radius: 16px;
    background: #151515;
    color: #fafafa;
    line-height: normal;
    cursor: pointer;
}
.sr.sr--survey {
    min-height: 66px;
}
.sr.sr--date {
    min-height: 62px;
}
/* What is under an open row, behind a rail in that row's colour. */
.nest {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-left: 16px;
    padding-left: 10px;
    border-left: 1.5px dashed var(--c);
}
.sr::before,
.sr::after {
    content: "";
    position: absolute;
    left: 50%;
    width: 1.5px;
    height: 5px;
    background: var(--c);
    opacity: 0.4;
}
.sr::before {
    top: 0;
}
.sr::after {
    bottom: 0;
}
.ago {
    position: absolute;
    top: 4px;
    right: 10px;
    font: 600 10px var(--rt-font-meta);
    color: var(--c);
}
.btn {
    flex: none;
    display: flex;
    padding: 0;
    border: 0;
    background: none;
    color: var(--c);
    cursor: pointer;
}
/* A finger's worth of target around a 22 px chevron, without moving anything. */
.btn::after {
    content: "";
    position: absolute;
    top: 0;
    bottom: 0;
    width: 44px;
}
.btn.art::after {
    content: none;
}
.btn[data-fold]::after {
    left: 0;
}
.btn[data-go]::after {
    right: 0;
}
.chev {
    flex: none;
    width: 22px;
    height: 22px;
}
.art {
    position: relative;
    flex: none;
    width: 42px;
    height: 42px;
    object-fit: contain;
}
.art img {
    width: 42px;
    height: 42px;
    object-fit: contain;
}
.badge {
    position: absolute;
    top: -4px;
    right: -6px;
    box-sizing: border-box;
    min-width: 18px;
    height: 18px;
    padding: 0 4px;
    border-radius: 999px;
    background: var(--rust);
    color: #1c0d04;
    font: 800 10px/18px var(--rt-font-meta);
    text-align: center;
}
.name {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    font-family: var(--rt-font-display);
    font-size: 20px;
    white-space: nowrap;
    text-overflow: ellipsis;
}
.pcts {
    flex: none;
    display: flex;
    flex-direction: column;
    gap: 4px;
}
.pct {
    box-sizing: border-box;
    min-width: 56px;
    padding: 1px 8px;
    border: 1.5px solid #838963;
    border-radius: 999px;
    background: none;
    color: #fafafa;
    font: 600 11px/15px var(--rt-font-meta);
    text-align: center;
    white-space: nowrap;
}
.pct:enabled {
    cursor: pointer;
}
.pct--quality {
    border-color: var(--rt-yellow);
    color: var(--rt-yellow);
}
.num {
    display: flex;
    align-items: flex-end;
    justify-content: flex-end;
    gap: 4px;
    min-width: 78px;
    font-family: var(--rt-font-display);
    font-size: 24px;
    line-height: 1;
}
.num img {
    width: 12px;
    height: auto;
    margin-bottom: 2px;
}
.j {
    margin-bottom: 2px;
    font: 500 13px var(--rt-font-meta);
    color: #838963;
}
.nl {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
}
.nl small {
    margin-bottom: 2px;
    font: 600 9px var(--rt-font-meta);
    letter-spacing: 0.02em;
    color: var(--rust);
}
.date {
    flex: none;
    font: 700 15px var(--rt-font-meta);
    white-space: nowrap;
}
.people {
    display: grid;
    grid-template-columns: max-content max-content;
    gap: 3px 6px;
    align-items: center;
    justify-content: start;
    white-space: nowrap;
}
.role {
    display: inline-flex;
    align-items: center;
    align-self: start;
    gap: 5px;
    font-family: var(--rt-font-display);
    font-size: 13px;
    color: var(--rust);
}
.role img {
    width: 15px;
    height: 15px;
    object-fit: contain;
}
.who {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 3px;
}
.who :global(.id-pill) {
    height: auto;
    padding: 1px 8px;
    font-size: 10px;
    line-height: 14px;
}
.gap {
    flex: 1;
}
.no {
    flex: none;
    box-sizing: content-box;
    width: 38px;
    padding-left: 6px;
    font-family: var(--rt-font-display);
    font-size: 22px;
}
.tile {
    flex: none;
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    min-width: 44px;
    height: 40px;
    padding: 0 6px;
    border: 1.5px solid;
    border-radius: 10px;
    font-family: var(--rt-font-display);
    font-size: 19px;
    line-height: 1;
}
.tile small {
    margin-top: 2px;
    font-size: 10px;
}
.over {
    border-color: #3fb6c8;
    background: rgba(63, 182, 200, 0.12);
    color: #3fb6c8;
}
.under {
    border-color: #ec6c9c;
    background: rgba(236, 108, 156, 0.12);
    color: #ec6c9c;
}
.codes {
    flex: none;
    display: flex;
    flex-direction: column;
    gap: 3px;
}
.ct {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 3px;
    box-sizing: border-box;
    min-width: 44px;
    height: 19px;
    padding: 0 6px;
    border: 1.5px solid #d4574a;
    border-radius: 7px;
    background: rgba(240, 70, 58, 0.08);
    color: #f0463a;
    font-family: var(--rt-font-display);
    font-size: 13px;
    line-height: 1;
}
.solo {
    height: 40px;
    border-radius: 10px;
    font-size: 17px;
}
.ct i {
    padding: 1px 4px;
    border-radius: 999px;
    background: #2a1412;
    font: 700 9px var(--rt-font-meta);
}
</style>
