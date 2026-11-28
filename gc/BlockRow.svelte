<!-- A block's two lines, the same on every screen, inside a NestPill. Line 1: its name and its tree count.
     Line 2: who made it at the left; at the right how far delivered (ATV) and planted (shovel) are off its total.
     Both lines end on the row's right edge, so the host puts the time in the pill's corner, never after the count.
     `left` holds the attribution and anything else that sits with it. Where the block's quality is the point
     (`pcts`, Stats) its D and Q chips stand at the right of line 2 instead of the counts. -->
<script lang="ts" module>
import { getLocale } from "$parent/src/lib/paraglide/runtime";

/** `from` (10,000) and up shortens to "k", with one decimal under 10k: the whole number is in the drawer. */
export const short = (n: number, from = 10_000) =>
	Math.abs(n) >= from ? `${(n / 1000).toLocaleString(getLocale(), { maximumFractionDigits: Math.abs(n) < 10_000 ? 1 : 0 })}k` : n.toLocaleString(getLocale());
</script>

<script lang="ts">
import type { Snippet } from "svelte";
import atv from "./assets/atv_gold.webp";
import shovel from "./assets/shovel_gold.webp";
import { fitLine, fitTitle } from "./fitLine";
import TreeCount from "./TreeCount.svelte";
import PctChips from "./PctChips.svelte";

let {
	name,
	trees = 0,
	delivered = 0,
	planted = 0,
	words,
	left,
	pcts,
}: {
	name: string;
	/** The block's total, prescribed or calculated. 0 = none: no count and no offsets. */
	trees?: number;
	delivered?: number;
	planted?: number;
	/** What the ATV and the shovel stand for, for a screen reader. */
	words: { delivered: string; planted: string };
	left?: Snippet;
	pcts?: { density: number | null; quality: number | null; words: { density: string; quality: string } };
} = $props();
</script>

{#snippet off(n: number)}
	<b class:up={n > 0} class:dn={n < 0}>{n > 0 ? "+" : n < 0 ? "−" : ""}{short(Math.abs(n), 1000)}</b>
{/snippet}

<span class="br" data-block-row {@attach fitTitle}>
	<span class="nest-line name" data-title>{name}</span>
	<span class="nest-value count" data-trees>{#if trees && !pcts}<TreeCount n={short(trees)} />{/if}</span>
	<span class="l2 nest-meta">
		<span class="who" data-left {@attach fitLine}>{@render left?.()}</span>
		{#if pcts}
			<PctChips {...pcts} />
		{:else if trees}
			<span class="offs">
				<span class="off" data-off="delivered"><img src={atv} alt={words.delivered} width="22" />{@render off(delivered - trees)}</span>
				<span class="off" data-off="planted"><img src={shovel} alt={words.planted} width="15" />{@render off(planted - trees)}</span>
			</span>
		{/if}
	</span>
</span>

<style>
	.br {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: center;
		column-gap: 6px;
		row-gap: 2px;
	}
	.count {
		justify-self: end;
	}
	.l2 {
		grid-column: 1 / -1;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 6px;
		min-width: 0;
	}
	.who {
		flex: 1 1 auto;
		display: flex;
		align-items: center;
		gap: 4px;
		min-width: 0;
		overflow: hidden;
		white-space: nowrap;
	}
	.who > :global(*) {
		flex: none;
	}
	.who :global([hidden]) {
		display: none;
	}
	.offs,
	.off {
		flex: none;
		display: inline-flex;
		align-items: center;
		gap: 4px;
	}
	.offs {
		gap: 6px;
	}
	.off img {
		flex: none;
	}
	.off b {
		font: 400 14px var(--rt-font-display);
	}
	/* DiffPill's over and under. */
	.up {
		color: var(--rt-q704-over);
	}
	.dn {
		color: var(--rt-q704-under);
	}
</style>
