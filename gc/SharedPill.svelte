<script lang="ts">
	import Icon from "./Icon.svelte";
	import { m } from "$parent/src/lib/paraglide/messages";

	/** Shared by link: `n` live links to this thing (a pill), or `via` the shared thing it sits inside (the bare
	 *  outline cloud). The cloud alone shows; the words are its label. */
	let { shared, onclick }: { shared: { n: number } | { via: string }; onclick?: () => void } = $props();
	const label = $derived(
		"n" in shared ? m.gc_shared_count({ n: shared.n > 99 ? "99+" : String(shared.n) }) : m.gc_shared_via({ name: shared.via }),
	);
	const tap = (e: Event) => {
		e.stopPropagation();
		onclick?.();
	};
</script>

<span
	class="rt-shared"
	class:rt-shared--own={"n" in shared}
	role="button"
	tabindex="0"
	aria-label={label}
	title={label}
	onclick={tap}
	onkeydown={(e) => (e.key === " " || e.key === "Enter") && (e.preventDefault(), tap(e))}
>
	<Icon name="cloud" size={14} fill={"n" in shared ? "currentColor" : "none"} stroke={"n" in shared ? 0 : 2.4} />
</span>

<style>
	.rt-shared {
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		color: var(--palette-sky);
		cursor: pointer;
		/* Over a row's tap halves, or the pill on a map with rows inside never hears a tap. */
		z-index: 2;
	}
	.rt-shared--own {
		height: 1.15rem;
		padding: 0 0.45rem;
		border-radius: 999px;
		border: 1px solid var(--palette-sky);
		background: #000;
	}
	/* 44px tap target on a pill 18px tall. */
	.rt-shared::after {
		content: "";
		position: absolute;
		inset: -13px -4px;
	}
</style>
