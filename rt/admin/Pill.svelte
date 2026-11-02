<script lang="ts">
	import type { Snippet } from "svelte";
	import type { HTMLAnchorAttributes } from "svelte/elements";

	/** One pill for every admin and Ops nav: gold is a tool, rust a screen or view, rust-small a table, sage a lookup. */
	let {
		kind = "tool",
		active = false,
		dim = false,
		children,
		...rest
	}: HTMLAnchorAttributes & {
		kind?: "tool" | "scr" | "view" | "table" | "lookup";
		active?: boolean;
		dim?: boolean;
		children: Snippet;
	} = $props();
</script>

<a class="lnk {kind}" class:active class:dim aria-current={active ? "page" : undefined} {...rest}>{@render children()}</a>

<style>
	/* inline-flex + line-height:1, not padding: with `display:inline` the mono font's line box sits the baseline high, so symmetric padding looks bottom-heavy. */
	.lnk {
		display: inline-flex;
		align-items: center;
		line-height: 1;
		font-size: 0.78rem;
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		color: var(--at-fg-dim);
		text-decoration: none;
		padding: 0.32rem 0.75rem;
		/* A step darker than the hops (subordinate to tier 1), never as dark as --at-line (reads as no border). */
		border: 1px solid var(--at-line-strong);
		border-radius: 999px;
		background: var(--at-inset);
		transition: color 0.12s ease, border-color 0.12s ease, background 0.12s ease;
	}
	.tool:hover {
		color: var(--at-gold);
		border-color: color-mix(in srgb, var(--at-fg) 52%, var(--at-panel));
	}
	/* RUST like everything at rank 3 — gold would read as a tier-2 tool that wrapped onto the wrong line. */
	.scr,
	.view {
		font-size: 0.72rem;
		padding: 0.27rem 0.66rem;
		color: var(--rt-rust);
		border-color: color-mix(in srgb, var(--rt-rust), var(--at-panel) 55%);
	}
	.scr:hover {
		border-color: var(--rt-rust);
	}
	.view {
		gap: 0.34rem;
	}
	.view:hover {
		background: color-mix(in srgb, var(--rt-rust) 10%, var(--at-panel));
	}
	.view :global(svg) {
		flex-shrink: 0;
	}
	/* RUST, smaller — subordinate to the tools. Every shade derives from the ONE --rt-rust token. */
	.table {
		font-size: 0.7rem;
		padding: 0.26rem 0.62rem;
		color: color-mix(in srgb, var(--rt-rust), var(--at-panel) 12%);
		border-color: color-mix(in srgb, var(--rt-rust), var(--at-panel) 68%);
	}
	.table:hover {
		color: var(--rt-rust);
		border-color: color-mix(in srgb, var(--rt-rust), var(--at-panel) 45%);
	}
	/* SAGE, the third accent: the fixed vocabularies the rust tables point AT. Flat sage: any mix toward the floor drops it under 4.5:1. */
	.lookup {
		font-size: 0.7rem;
		padding: 0.26rem 0.62rem;
		color: var(--rt-sage);
		border-color: color-mix(in srgb, var(--rt-sage), var(--at-panel) 68%);
	}
	.lookup:hover {
		border-color: color-mix(in srgb, var(--rt-sage), var(--at-panel) 45%);
	}
	/* Where you are, in every row: the kit's selected plane, gold on it. OPAQUE, so the band never shows through. */
	.lnk.active {
		color: var(--at-gold);
		background: var(--at-selected);
		border-color: var(--at-gold);
		font-weight: 600;
	}
	/* Still a link, visibly not yet meaningful. */
	.lnk.dim {
		opacity: 0.45;
	}
</style>
