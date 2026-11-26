<!-- The block a sheet is on, drawn the same on deliver, allocated and the cache audit: its icon across two lines,
  the name alone in the steel plaque (a tap unpicks it), and line 2 saying where the total came from. Worked out,
  it reads "ha × rate/ha = total" on the right; allocated on purpose, "ha @ rate/ha" sits dimmed at the left and the
  word allocated stands beside the total, so the allocated number never takes the worked-out spot. A rust rule,
  then the sheet's own sums under the total. The date and the owner live in the block's drawer. It formats nothing. -->

<script lang="ts">
import type { Snippet } from "svelte";
import Plaque from "./Plaque.svelte";
import SumLines, { type Sum } from "./SumLines.svelte";
import TreeCount from "./TreeCount.svelte";
import { areaLabel } from "./units.svelte";

let {
	icon,
	name,
	unpickLabel,
	ha,
	rate,
	rateLink,
	total,
	allocated,
	sums = [],
	folded = false,
	onUnpick,
	onSums,
}: {
	/** The block's icon. */
	icon: string;
	name: string;
	/** The plaque's spoken label: it unpicks, it doesn't rename. */
	unpickLabel: string;
	ha: string;
	rate: string;
	/** The host's tappable rate with its own unit, in place of `rate`: a tap changes the block's rate. */
	rateLink?: Snippet;
	total: string;
	/** The word for a total allocated on purpose; absent, the total is the area at its rate. */
	allocated?: string;
	sums?: Sum[];
	/** Fades the sums out and closes their gap, so what sits under the head slides up instead of jumping. */
	folded?: boolean;
	onUnpick: () => void;
	/** A tap on the sums: the sheet's own breakdown. */
	onSums?: () => void;
} = $props();
</script>

{#snippet perArea()}{#if rateLink}{@render rateLink()}{:else}{rate}<span class="u">/{areaLabel()}</span>{/if}{/snippet}

<div class="bh">
	<img class="bh-ic" src={icon} alt="" />
	<div class="bh-c">
		<Plaque class="bh-plaque" onclick={onUnpick} ariaLabel={unpickLabel}>
			<span class="bh-name">{name}</span>
		</Plaque>
		<div class="bh-meta" class:on-purpose={allocated}>
			{#if allocated}
				<span class="bh-rate">{ha}<span class="u">{` ${areaLabel()} @ `}</span>{@render perArea()}</span>
				<span class="bh-end"><span class="bh-alloc">{allocated}</span><span class="bh-tot"><TreeCount n={total} /></span></span>
			{:else}
				<span class="bh-rate">{ha}<span class="u">{` ${areaLabel()} × `}</span>{@render perArea()}<span class="u"> =</span></span>
				<span class="bh-tot"><TreeCount n={total} /></span>
			{/if}
		</div>
	</div>
</div>
<i class="bh-line"></i>
{#if sums.length}
	<div class="bh-fold" class:folded inert={folded}><div>
		{#if onSums}<button type="button" class="bh-sums" onclick={onSums}><SumLines {sums} /></button>
		{:else}<div class="bh-sums"><SumLines {sums} /></div>{/if}
	</div></div>
{/if}

<style>
	.bh {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.bh-ic {
		flex: none;
		width: auto;
		height: 66px;
	}
	.bh-c {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.bh-c > :global(.plaque-trigger) {
		width: 100%;
	}
	.bh-c :global(.bh-plaque) {
		justify-content: flex-start;
		height: 42px;
		padding: 0 12px;
	}
	.bh-name {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font: 22px/1 var(--rt-font-display);
		color: var(--rt-fg);
	}
	/* Line 2 and the sums end on one edge, so each sum sits under the total. */
	.bh-meta,
	.bh-sums {
		padding-right: 12px;
	}
	/* One height for both cases, so the header sits the same on every sheet. */
	.bh-meta {
		height: 22px;
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 8px;
		padding-left: 4px;
		white-space: nowrap;
	}
	.bh-meta.on-purpose {
		justify-content: space-between;
	}
	.on-purpose .bh-rate {
		opacity: 0.85;
	}
	.bh-rate {
		font: 500 12px/1 var(--rt-font-meta);
		color: var(--rt-fg);
	}
	.bh-rate .u {
		color: var(--rt-sage);
	}
	.bh-end {
		display: flex;
		align-items: baseline;
		gap: 8px;
	}
	.bh-alloc {
		font: 14px/1 var(--rt-font-display);
		color: var(--rust);
	}
	.bh-tot {
		font: 20px/1 var(--rt-font-display);
		color: var(--rt-fg);
	}
	.bh-line {
		display: block;
		height: 2px;
		margin: 8px 0 0;
		border-radius: 2px;
		background: var(--rust);
	}
	.bh-sums {
		display: flex;
		flex-direction: column;
		align-items: stretch;
		width: 100%;
		margin: 6px 0 0;
		border: 0;
		background: none;
		cursor: pointer;
	}
	div.bh-sums {
		cursor: default;
	}
	.bh-fold {
		display: grid;
		grid-template-rows: 1fr;
		transition:
			grid-template-rows 500ms ease,
			opacity 350ms ease;
	}
	.bh-fold > div {
		min-height: 0;
		overflow: hidden;
	}
	.bh-fold.folded {
		grid-template-rows: 0fr;
		opacity: 0;
	}
</style>
