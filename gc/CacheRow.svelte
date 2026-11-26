<!-- A cache's audit row: its pin, its name with each seedlot's count over that seedlot's bar segment, and its
  total with its share of the block. The heat sheet and the deliver picture both draw it; the host owns the button. -->
<script lang="ts">
import { getLocale } from "$parent/src/lib/paraglide/runtime";
import TreeCount from "./TreeCount.svelte";
import TreeGlyph from "./TreeGlyph.svelte";
import "./lotSwatch.css";

let {
	icon,
	swatch,
	wide = false,
	name,
	lots = [],
	scale = 1,
	total,
	pct,
	empty,
	blank = false,
}: {
	/** The pin, else a `swatch` background (planted has no pin). */
	icon?: string;
	swatch?: string;
	/** A block icon, which is wider than a pin. */
	wide?: boolean;
	name?: string;
	/** [rank, trees] per seedlot, in bar order. */
	lots?: readonly (readonly [number, number])[];
	/** How much of the row the bar spans: a cache against the biggest one. */
	scale?: number;
	total: number;
	pct?: number;
	/** In place of a zero total. */
	empty?: string;
	/** With nothing in it yet, the row keeps its empty track and a bare tree, waiting to be filled. */
	blank?: boolean;
} = $props();

const fmt = (n: number) => Math.round(n).toLocaleString(getLocale());
const sum = $derived(lots.reduce((a, [, n]) => a + n, 0) || 1);
const width = (n: number) => `${(n / sum) * 100 * scale}%`;

// Line 1 is a flex row weighted like the bar, so a count over a thin segment slides aside; only when the
// name and the counts can't share the line does a count go, smallest first.
// The counts are watched too: a late web font widens them without resizing the line.
function fit(line: HTMLElement, _lots: typeof lots) {
	const ro = new ResizeObserver(() => {
		const cs = [...line.querySelectorAll<HTMLElement>(".c")];
		for (const c of cs) c.hidden = false;
		for (const c of cs.sort((a, b) => Number(a.dataset.n) - Number(b.dataset.n))) {
			if (line.scrollWidth <= line.clientWidth) break;
			c.hidden = true;
		}
	});
	const watch = () => [line, ...line.children].forEach((e) => ro.observe(e));
	watch();
	return { update: watch, destroy: () => ro.disconnect() };
}
</script>

<span class="cr-row" class:wide>
	{#if icon}<img src={icon} alt="" />{:else}<i class="sw" style:background={swatch}></i>{/if}
	<span class="tx">
		<span class="l1" use:fit={lots}>
			{#if name}<b class="n">{name}</b>{/if}
			{#each lots as [r, n] (r)}<b class="c lot-q{r}" data-n={n} style:flex-grow={n}>{fmt(n)}</b>{/each}
			{#if lots.length}<i style:flex-grow={sum * (1 / Math.max(scale, 0.01) - 1)}></i>{/if}
		</span>
		{#if lots.length || blank}
			<span class="bar">{#each lots as [r, n] (r)}<i class="lot-p{r}" style:width={width(n)}></i>{/each}</span>
		{/if}
	</span>
	<b class="v" class:zero={!total}>{#if total}<TreeCount n={fmt(total)} />{#if pct !== undefined}<small>{pct}%</small>{/if}{:else if blank}<TreeGlyph />{:else}{empty ?? fmt(0)}{/if}</b>
</span>

<style>
	.cr-row {
		display: grid;
		grid-template-columns: 28px minmax(0, 1fr) auto;
		gap: 9px;
		align-items: center;
		width: 100%;
		text-align: left;
	}
	.wide {
		grid-template-columns: 40px minmax(0, 1fr) auto;
	}
	img {
		width: 100%;
		height: 33px;
		object-fit: contain;
	}
	i {
		display: block;
		flex: none;
	}
	.sw {
		width: 20px;
		height: 11px;
		border-radius: 3px;
	}
	b {
		font: 400 16px/1 var(--rt-font-display);
	}
	/* Not the counts: their colour is the seedlot's (lotSwatch.css). */
	.n,
	.v {
		color: #fff;
	}
	.l1 {
		display: flex;
		gap: 6px;
		min-height: 1em;
		overflow: hidden;
	}
	.n,
	.c {
		flex: none;
		white-space: nowrap;
	}
	.c,
	.l1 i {
		flex: 0 1 0;
	}
	.c {
		min-width: max-content;
		text-align: center;
	}
	.bar {
		display: flex;
		gap: 2px;
		height: 9px;
		margin-top: 4px;
		overflow: hidden;
		border-radius: 4px;
		background: #26271f;
	}
	.bar i {
		height: 100%;
	}
	.v {
		display: flex;
		align-items: baseline;
		font-size: 18px;
		white-space: nowrap;
	}
	.v.zero {
		color: var(--rt-cream);
	}
	small {
		margin-left: calc(4px + 0.25em);
		font: 700 11px "Baloo 2", var(--rt-font-body);
		color: var(--rt-sage);
	}
</style>
