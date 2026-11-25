<!-- A cache's audit row: its pin, its name with each seedlot's count over that seedlot's bar segment, and its
  total with its share of the block. The heat sheet and the deliver picture both draw it; the host owns the button. -->
<script lang="ts">
import { getLocale } from "$parent/src/lib/paraglide/runtime";
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
} = $props();

const fmt = (n: number) => Math.round(n).toLocaleString(getLocale());
const sum = $derived(lots.reduce((a, [, n]) => a + n, 0) || 1);
const width = (n: number) => `${(n / sum) * 100 * scale}%`;

// A count shows only with room to spare inside its own segment and clear of the name; a cramped one just goes.
const ROOM_PX = 6;
function roomy(label: HTMLElement) {
	const box = label.parentElement!;
	const name = label.closest(".tx")?.querySelector(".n");
	const ro = new ResizeObserver(() => {
		const l = label.getBoundingClientRect();
		const fits = l.width + 2 * ROOM_PX <= box.getBoundingClientRect().width && (!name || l.left >= name.getBoundingClientRect().right + ROOM_PX);
		label.style.visibility = fits ? "" : "hidden";
	});
	ro.observe(box);
	return { destroy: () => ro.disconnect() };
}
</script>

<span class="cr-row" class:wide>
	{#if icon}<img src={icon} alt="" />{:else}<i class="sw" style:background={swatch}></i>{/if}
	<span class="tx">
		{#if name}<b class="n">{name}</b>{/if}
		{#if lots.length}
			<span class="nums">{#each lots as [r, n] (r)}<i style:width={width(n)}><b class="lot-q{r}" use:roomy>{fmt(n)}</b></i>{/each}</span>
			<span class="bar">{#each lots as [r, n] (r)}<i class="lot-p{r}" style:width={width(n)}></i>{/each}</span>
		{/if}
	</span>
	<b class="v" class:zero={!total}>{#if total}<TreeGlyph />{fmt(total)}{#if pct !== undefined}<small>{pct}%</small>{/if}{:else}{empty ?? fmt(0)}{/if}</b>
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
	.n {
		width: fit-content;
	}
	/* The name and the counts share line 1, so a nameless row's counts still sit above its bar. */
	.tx {
		display: grid;
	}
	.n,
	.nums {
		grid-area: 1 / 1;
	}
	.nums {
		display: flex;
		gap: 2px;
		pointer-events: none;
	}
	.nums i {
		display: flex;
		justify-content: center;
		min-width: 0;
	}
	.nums b {
		white-space: nowrap;
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
		align-items: center;
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
