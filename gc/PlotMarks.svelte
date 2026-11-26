<!-- What a plot is drawn with, wherever it is listed: its trees over its spots, how far off target it
     landed, and its fault codes. Snippets, so each screen places them itself and hands in its own words:
     `import { counts, delta, faultTags } from "$gc/PlotMarks.svelte"` then
     `{@render counts(planted, spots, { planted: "planted", spots: "spots" })}`. -->
<script lang="ts" module>
import TreeCount from "./TreeCount.svelte";

export { counts, delta, faultTags, pct };

/** Each code once with how often it was called, most called first. Two tags fit: past that, the first and a "+N". */
function tags(faults: string[]) {
    const n = new Map<string, number>();
    for (const f of faults) n.set(f, (n.get(f) ?? 0) + 1);
    const all = [...n].sort((a, b) => b[1] - a[1]);
    const shown = all.length > 2 ? all.slice(0, 1) : all;
    return { shown, more: all.length - shown.length };
}
</script>

{#snippet counts(planted: number, spots: number, words: { planted: string; spots: string })}
    <span class="pm-num" data-counts>
        <TreeCount n={planted} label={words.planted} data-planted />
        <span class="pm-j">/</span>
        <span class="pm-nl"><small>{words.spots}</small><span data-spots>{spots}</span></span>
    </span>
{/snippet}

{#snippet delta(missed: number, excess: number, words: { missed: string; excess: string })}
    {#if missed > 0}
        <span class="pm-tile pm-under" data-delta="missed">-{missed}<small>{words.missed}</small></span>
    {:else if excess > 0}
        <span class="pm-tile pm-over" data-delta="excess">+{excess}<small>{words.excess}</small></span>
    {/if}
{/snippet}

<!-- A survey's density or quality as a chip: `word` names it and gives the chip its letter, `text` is the percent as shown. -->
{#snippet pct(kind: "density" | "quality", text: string, word: string, label?: string)}
    <span class="pm-pct pm-pct--{kind}" data-act={kind} aria-label={label ?? word}><span class="pm-pct-key">{word.charAt(0).toUpperCase()}</span>{text}</span>
{/snippet}

{#snippet faultTags(faults: string[])}
    {@const t = tags(faults)}
    {#if t.shown.length}
        <span class="pm-codes" data-faults>
            {#each t.shown as [code, n] (code)}
                <span class="pm-ct" class:pm-solo={t.shown.length + t.more === 1} data-code={code}>{code}{#if n > 1}<i>·{n}</i>{/if}</span>
            {/each}
            {#if t.more}<span class="pm-ct" data-more>+{t.more}</span>{/if}
        </span>
    {/if}
{/snippet}

<style>
.pm-num {
    flex: none;
    display: flex;
    align-items: flex-end;
    gap: 4px;
    font-family: var(--rt-font-display);
    font-size: 24px;
    line-height: 1;
    color: var(--rt-fg);
}
.pm-nl {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
}
.pm-nl small {
    margin-bottom: 2px;
    font: 600 9px var(--rt-font-meta);
    letter-spacing: 0.02em;
    color: var(--rust);
}
.pm-j {
    margin-bottom: 2px;
    font: 500 13px var(--rt-font-meta);
    color: var(--rt-sage);
}
.pm-tile {
    flex: none;
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    min-width: 44px;
    height: 40px;
    padding: 3px 6px 0;
    border: 1.5px solid;
    border-radius: 10px;
    font-family: var(--rt-font-display);
    font-size: 17px;
    line-height: 1;
}
.pm-tile small {
    margin-top: 2px;
    font-size: 10px;
}
.pm-over {
    color: var(--rt-q704-over);
    background: var(--rt-q704-over-soft);
}
.pm-under {
    color: var(--rt-q704-under);
    background: var(--rt-q704-under-soft);
}
.pm-codes {
    flex: none;
    display: flex;
    flex-direction: column;
    gap: 3px;
}
.pm-ct {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 3px;
    box-sizing: border-box;
    min-width: 44px;
    height: 19px;
    padding: 0 6px;
    border: 1.5px solid var(--rt-q704-fault);
    border-radius: 7px;
    background: var(--rt-q704-fault-soft);
    color: var(--rt-q704-fault);
    font-family: var(--rt-font-display);
    font-size: 13px;
    line-height: 1;
}
.pm-solo {
    height: 40px;
    border-radius: 10px;
    font-size: 17px;
}
.pm-ct i {
    font: 700 9px var(--rt-font-meta);
}
.pm-pct {
    padding: 1px 6px;
    border: 1.5px solid rgba(250, 250, 250, 0.5);
    border-radius: 999px;
    font-size: 15px;
    /* A box of its own, so the line it sits in grows to hold its border and nothing of it is clipped. */
    display: inline-block;
    line-height: 1;
    white-space: nowrap;
}
.pm-pct--quality {
    border-color: rgba(255, 215, 0, 0.6);
    color: var(--rt-yellow);
}
.pm-pct-key {
    margin-right: 4px;
    opacity: 0.85;
    font: 700 11px var(--rt-font-meta);
}
</style>
