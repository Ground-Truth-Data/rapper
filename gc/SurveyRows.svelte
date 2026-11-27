<!-- What a survey, one of its plots and a plot's species put inside their NestPill, as every list draws them:
     `<SurveyRows row={{ kind: "plot", … }} {words} ongo={…} />`. A survey folds its plots (`open`,
     `ontoggle`, children); a plot folds its own species. The pill, its halves and its colour are NestPill's. -->
<script lang="ts" module>
import type { Identity } from "./IdentityPill.svelte";

export type SurveyRow =
    | { kind: "survey"; name: string; count: number; surveyors: Identity[]; density: number | null; quality: number | null }
    | {
          kind: "plot";
          plotNo: number;
          planted: number;
          spots: number;
          missed: number;
          excess: number;
          faults: string[];
          species?: { code: string; name: string; count: number }[];
      };

export type SurveyRowWords = {
    planted: string;
    spots: string;
    missed: string;
    excess: string;
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
import treeWhite from "./assets/tree_white.webp";
import IdentityPill, { onePerPerson } from "./IdentityPill.svelte";
import NestGroup from "./NestGroup.svelte";
import NestPill from "./NestPill.svelte";
import TreeCount from "./TreeCount.svelte";

let {
    row,
    when = "",
    words,
    art = "",
    open = false,
    ontoggle,
    ongo,
    lead,
    children,
}: {
    /** The host's own control ahead of the row: the inbox's tick. Never a button: it sits inside the pill's. */
    lead?: Snippet;
    /** A survey's plots, drawn while it is open. */
    children?: Snippet;
    row: SurveyRow;
    /** Its own time, short ("1h"). */
    when?: string;
    words: SurveyRowWords;
    /** The quality icon a survey wears. */
    art?: string;
    open?: boolean;
    ontoggle?: (e: MouseEvent) => void;
    ongo?: () => void;
} = $props();

let speciesOpen = $state(false);
const species = $derived(row.kind === "plot" ? (row.species ?? []) : []);
</script>

<div class="sr" data-row={row.kind}>
    {#if row.kind === "survey"}
        <NestPill {open} {ontoggle} {ongo} goLabel={row.name} stack="middle">
            {#snippet glyph()}
                {@render lead?.()}
                <span class="art"><img src={art} alt="" /><span class="badge" data-count>{row.count}</span></span>
            {/snippet}
            <span class="nest-line" data-name title={row.name}>{row.name}</span>
            <span class="l2">
                <span class="who" data-role="surveyor"><img src={contactGold} alt="" />{#each onePerPerson(row.surveyors) as w (w.key ?? w.label)}<IdentityPill who={w} />{/each}</span>
                <span class="pcts">
                    {#each ["density", "quality"] as const as kind (kind)}
                        {@const n = row[kind]}
                        {#if n != null}<span class="pct pct--{kind}" data-pct={kind} title={words[kind]}>{words[kind].charAt(0).toUpperCase()} {Math.round(n)}%</span>{/if}
                    {/each}
                </span>
            </span>
            {#snippet corner()}{#if when}<span class="ago" data-when>{when}</span>{/if}{/snippet}
        </NestPill>
        {#if open && children}<NestGroup>{@render children()}</NestGroup>{/if}
    {:else}
        {@const t = chips(row.faults)}
        <NestPill
            open={species.length ? speciesOpen : null}
            ontoggle={species.length ? () => (speciesOpen = !speciesOpen) : undefined}
            {ongo}
            goLabel="#{row.plotNo}"
        >
            <span class="plot">
                <span class="no" data-no>#{row.plotNo}</span>
                <span class="num" data-counts>
                    <img src={treeWhite} alt="" />
                    <span class="nl"><small>{words.planted}</small><span data-planted>{row.planted}</span></span>
                    <span class="j">/</span>
                    <span class="nl"><small>{words.spots}</small><span data-spots>{row.spots}</span></span>
                </span>
            </span>
            {#snippet values()}
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
            {/snippet}
        </NestPill>
        {#if speciesOpen}
            <NestGroup>
                {#each species as s (s.name)}
                    <div data-row="species">
                        <NestPill small>
                            {#snippet glyph()}{#if s.code}<span class="code" data-code>{s.code}</span>{/if}{/snippet}
                            <span class="sp" data-species>{s.name}</span>
                            {#snippet values()}<TreeCount n={s.count} data-trees />{/snippet}
                        </NestPill>
                    </div>
                {/each}
            </NestGroup>
        {/if}
    {/if}
</div>

<style>
.sr {
    display: flex;
    flex-direction: column;
    gap: var(--nest-gap, 6px);
}
.ago {
    font: 600 10px var(--rt-font-meta);
    color: var(--c);
}
.art {
    position: relative;
    flex: none;
    width: 42px;
    height: 42px;
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
.l2 {
    display: flex;
    align-items: center;
    gap: 6px;
}
/* People who do not fit are left off, never wrapped. */
.who {
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 6px;
    height: 18px;
    overflow: hidden;
    flex-wrap: wrap;
}
.who img {
    flex: none;
    width: 15px;
    height: 15px;
    object-fit: contain;
}
.who :global(.id-pill) {
    height: auto;
    padding: 1px 8px;
    font-size: 10px;
    line-height: 14px;
}
.pcts {
    flex: none;
    display: flex;
    gap: 4px;
}
.pct {
    box-sizing: border-box;
    padding: 1px 8px;
    border: 1.5px solid #838963;
    border-radius: 999px;
    color: #fafafa;
    font: 600 11px/15px var(--rt-font-meta);
    text-align: center;
    white-space: nowrap;
}
.pct--quality {
    border-color: var(--rt-yellow);
    color: var(--rt-yellow);
}
.plot {
    display: flex;
    align-items: center;
    gap: 8px;
    padding-block: 6px;
}
.num {
    display: flex;
    align-items: flex-end;
    gap: 4px;
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
.no {
    flex: none;
    width: 44px;
    font-size: 22px;
}
.code {
    flex: none;
    min-width: 28px;
}
.sp {
    font: 500 14px var(--rt-font-meta);
    color: var(--rust);
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
    font-size: 19px;
    line-height: 1;
}
.tile small {
    margin-top: 2px;
    font-size: 10px;
}
.over {
    border-color: var(--rt-q704-over);
    background: var(--rt-q704-over-soft);
    color: var(--rt-q704-over);
}
.under {
    border-color: var(--rt-q704-under);
    background: var(--rt-q704-under-soft);
    color: var(--rt-q704-under);
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
