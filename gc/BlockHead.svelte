<!-- The block a sheet is on, drawn the same on deliver, allocated and the cache audit: its icon across two lines,
  the name alone in the steel plaque (a tap unpicks it), "ha @ rate/ha" beside the tree total, and the sheet's own
  sums lined up under that total. The date and the owner live in the block's drawer. It formats nothing. -->
<script lang="ts" module>
export type Sum = { k: string; v: string; tone?: "rose" | "teal" | "ok"; minus?: boolean; tree?: boolean; rule?: boolean };
</script>

<script lang="ts">
import Plaque from "./Plaque.svelte";
import TreeGlyph from "./TreeGlyph.svelte";
import { areaLabel } from "./units.svelte";

let {
	icon,
	name,
	unpickLabel,
	ha,
	rate,
	total,
	sums = [],
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
	total: string;
	sums?: Sum[];
	onUnpick: () => void;
	/** A tap on the sums: the sheet's own breakdown. */
	onSums?: () => void;
} = $props();
</script>

<div class="bh">
	<img class="bh-ic" src={icon} alt="" />
	<div class="bh-c">
		<Plaque class="bh-plaque" onclick={onUnpick} ariaLabel={unpickLabel}>
			<span class="bh-name">{name}</span>
		</Plaque>
		<div class="bh-meta">
			<span class="bh-rate">{ha}<span class="u">{` ${areaLabel()} @ `}</span>{rate}<span class="u">/{areaLabel()}</span></span>
			<span class="bh-tot"><TreeGlyph />{total}</span>
		</div>
	</div>
</div>
{#snippet lines()}
	{#each sums as s (s.k)}
		{#if s.rule}<i class="bh-rule"></i>{/if}
		<span class="bh-l">
			<span class="bh-k">{s.k}</span>
			<span class="bh-v {s.tone ?? ''}">{#if s.minus}<span class="bh-minus">−</span>{/if}{#if s.tree}<span class="bh-tree"><TreeGlyph /></span>{/if}{s.v}</span>
		</span>
	{/each}
{/snippet}
{#if sums.length}
	{#if onSums}<button type="button" class="bh-sums" onclick={onSums}>{@render lines()}</button>
	{:else}<div class="bh-sums">{@render lines()}</div>{/if}
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
	.bh-meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		padding-left: 4px;
		white-space: nowrap;
	}
	.bh-rate {
		font: 500 12px/1 var(--rt-font-meta);
		color: var(--rt-fg);
	}
	.bh-rate .u {
		color: var(--rt-sage);
	}
	.bh-tot,
	.bh-v {
		display: flex;
		align-items: center;
		gap: 4px;
		font-family: var(--rt-font-display);
		color: var(--rt-fg);
	}
	.bh-tot {
		font-size: 24px;
		line-height: 1;
	}
	/* The tree stays white beside a coloured number. */
	.bh-tree {
		display: contents;
		color: var(--rt-fg);
	}
	.bh-sums {
		display: flex;
		flex-direction: column;
		align-items: stretch;
		gap: 2px;
		width: 100%;
		margin: 8px 0 0;
		border: 0;
		background: none;
		cursor: pointer;
	}
	div.bh-sums {
		cursor: default;
	}
	.bh-l {
		display: flex;
		justify-content: flex-end;
		align-items: baseline;
		gap: 10px;
	}
	.bh-k {
		font: 16px/1.2 var(--rt-font-display);
		color: var(--rust);
	}
	.bh-v {
		justify-content: flex-end;
		min-width: 118px;
		font-size: 22px;
		line-height: 1.2;
	}
	.bh-minus {
		font-size: 20px;
		color: var(--rt-sage);
	}
	.bh-rule {
		align-self: flex-end;
		width: 150px;
		border-top: var(--rule-edge);
	}
	.bh-v.rose {
		color: var(--rt-rose);
	}
	.bh-v.teal {
		color: var(--rt-q704-over);
	}
	.bh-v.ok {
		color: #8dd84e;
	}
</style>
