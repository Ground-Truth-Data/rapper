<!-- A sheet's sums, right-aligned on one edge: rust labels, white numbers, a sage − or = before them, a short rule
  where `rule` asks. The block header's stack and an opened seedlot card draw the same lines. -->
<script lang="ts" module>
import type { Identity } from "./IdentityPill.svelte";
/** `who`: the one person a line's number is theirs alone. */
export type Sum = { k: string; v: string; who?: Identity; tone?: "rose" | "teal" | "ok"; minus?: boolean; eq?: boolean; tree?: boolean; rule?: boolean };
</script>

<script lang="ts">
import IdentityPill from "./IdentityPill.svelte";
import TreeGlyph from "./TreeGlyph.svelte";

let { sums }: { sums: Sum[] } = $props();
</script>

{#each sums as s (s.k + (s.who ? (s.who.key ?? s.who.label) : ""))}
	{#if s.rule}<i class="bh-rule"></i>{/if}
	<span class="bh-l">
		{#if s.who}<span class="bh-who"><IdentityPill who={s.who} /></span>{/if}
		<span class="bh-k">{s.k}</span>
		<span class="bh-v {s.tone ?? ''}">{#if s.minus}<span class="bh-op">−</span>{/if}{#if s.eq}<span class="bh-op">=</span>{/if}{#if s.tree}<span class="bh-tree"><TreeGlyph /></span>{/if}{s.v}</span>
	</span>
{/each}

<style>
	.bh-l {
		display: flex;
		justify-content: flex-end;
		align-items: baseline;
		gap: 10px;
	}
	.bh-who {
		align-self: center;
		margin-right: -4px;
	}
	.bh-k {
		font: 14px/1.25 var(--rt-font-display);
		color: var(--rust);
	}
	.bh-v {
		display: flex;
		justify-content: flex-end;
		align-items: center;
		gap: 5px;
		min-width: 96px;
		font: 18px/1.25 var(--rt-font-display);
		color: var(--rt-fg);
	}
	.bh-op {
		font-size: 16px;
		color: var(--rt-sage);
	}
	/* The tree stays white beside a coloured number. */
	.bh-tree {
		display: contents;
		color: var(--rt-fg);
	}
	.bh-rule {
		align-self: flex-end;
		width: 130px;
		margin: 1px 0;
		border-top: 1.5px solid color-mix(in srgb, var(--rt-yellow) 30%, transparent);
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
