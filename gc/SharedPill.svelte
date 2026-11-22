<script lang="ts">
	import Icon from "./Icon.svelte";
	import { m } from "$parent/src/lib/paraglide/messages";

	/** Shared by link: `n` live links to this thing, or `via` the shared thing it sits inside. */
	let { shared, onclick }: { shared: { n: number } | { via: string }; onclick?: () => void } = $props();
	const own = $derived("n" in shared);
	const via = $derived("via" in shared ? m.gc_shared_via({ name: shared.via }) : undefined);
	const tap = (e: Event) => {
		e.stopPropagation();
		onclick?.();
	};
</script>

<span
	class="rt-shared"
	class:rt-shared--own={own}
	role="button"
	tabindex="0"
	aria-label={via}
	title={via}
	onclick={tap}
	onkeydown={(e) => (e.key === " " || e.key === "Enter") && (e.preventDefault(), tap(e))}
>
	<Icon name="cloud" size={16} fill={own ? "currentColor" : "none"} stroke={own ? 0 : 2.4} />
	{#if "n" in shared}{m.gc_shared_count({ n: shared.n > 99 ? "99+" : String(shared.n) })}{/if}
</span>

<style>
	.rt-shared {
		position: relative;
		display: inline-flex;
		align-items: center;
		gap: 4px;
		flex-shrink: 0;
		color: var(--palette-sky);
		cursor: pointer;
		/* Over a row's tap halves, or the pill on a map with rows inside never hears a tap. */
		z-index: 2;
	}
	.rt-shared--own {
		height: 1.15rem;
		padding: 0 0.5rem 0 0.35rem;
		border-radius: 999px;
		background: var(--palette-sky);
		color: var(--palette-sky-ink);
		font-family: var(--rt-font-body);
		font-size: 0.7rem;
		font-weight: 700;
		line-height: 1;
		white-space: nowrap;
	}
	/* 44px tap target on a pill 18px tall. */
	.rt-shared::after {
		content: "";
		position: absolute;
		inset: -13px -4px;
	}
</style>
