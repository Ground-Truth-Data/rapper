<script lang="ts">
	import Icon from "./Icon.svelte";
	import { inPill } from "./NestPill.svelte";
	import { m } from "$parent/src/lib/paraglide/messages";

	/** Shared by link: `n` live links to this thing (a pill), or `via` the shared thing it sits inside (the bare
	 *  outline cloud). The cloud alone shows; the words are its label. */
	let { shared, onclick }: { shared: { n: number } | { via: string }; onclick?: () => void } = $props();
	const label = $derived(
		"n" in shared ? m.gc_shared_count({ n: shared.n > 99 ? "99+" : String(shared.n) }) : m.gc_shared_via({ name: shared.via }),
	);
	const still = inPill();
	const tap = (e: Event) => {
		e.stopPropagation();
		onclick?.();
	};
</script>

<span
	class="rt-shared"
	class:rt-shared--own={"n" in shared}
	class:rt-shared--still={still}
	role={still ? undefined : "button"}
	tabindex={still ? undefined : 0}
	aria-label={label}
	title={label}
	onclick={still ? undefined : tap}
	onkeydown={still ? undefined : (e) => (e.key === " " || e.key === "Enter") && (e.preventDefault(), tap(e))}
>
	<Icon name="cloud" size={"n" in shared ? 12 : 14} fill={"n" in shared ? "currentColor" : "none"} stroke={"n" in shared ? 0 : 2.4} />
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
	.rt-shared--still {
		cursor: inherit;
		z-index: auto;
	}
	/* The same box as IdentityPill's, so it sits level with the "you" beside it. */
	.rt-shared--own {
		height: 1rem;
		padding: 0 0.35rem;
		box-sizing: border-box;
		border: 1.5px solid var(--palette-sky);
		border-radius: 999px;
		background: var(--palette-sky);
		color: #fff;
		-webkit-tap-highlight-color: transparent;
	}
	/* The same pill however it's touched: theme.css dims and shrinks every pressed button. */
	.rt-shared--own:active {
		filter: none;
		transform: none;
	}
	/* 44px tap target, whichever form. */
	.rt-shared::after {
		content: "";
		position: absolute;
		inset: -14px -4px;
	}
</style>
