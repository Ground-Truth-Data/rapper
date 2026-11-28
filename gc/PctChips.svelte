<!-- A survey's or block's density and quality, whole percentages: D white, Q gold. A null one is not drawn. -->
<script lang="ts">
let { density, quality, words }: { density: number | null; quality: number | null; words: { density: string; quality: string } } = $props();
</script>

<span class="pcts">
    {#each [["density", density], ["quality", quality]] as const as [kind, n] (kind)}
        {#if n != null}<span class="pct pct--{kind}" data-pct={kind} title={words[kind]}>{words[kind].charAt(0).toUpperCase()} {Math.round(n)}%</span>{/if}
    {/each}
</span>

<style>
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
</style>
