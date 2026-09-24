<script lang="ts">
/**
 * The tier-switch pill, rendered by both parents. Every fact arrives as a
 * prop: this file names no tier, host or port. It navigates to the other
 * server — which parent serves a page is decided by the server that answered.
 * Dev only; both ports must be running.
 */

let {
	leftLabel,
	rightLabel,
	current,
	href,
	unavailable = false,
}: {
	/** The tier shown on the left. Fixed per deployment, never "me first". */
	leftLabel: string;
	rightLabel: string;
	/** Which of the two is serving this page. Told, never sniffed from a port. */
	current: string;
	/** Where the other tier serves this page. Omitted → no pill (no other tier). */
	href?: string;
	/** The other tier is running but does not serve this page: the pill stays, greyed. */
	unavailable?: boolean;
} = $props();

const other = $derived(current === leftLabel ? rightLabel : leftLabel);

// The map keeps its camera in the hash via history.replaceState, which no
// store tracks, so it is read at the click. pointerdown covers middle-click;
// click covers keyboard Enter.
function carryHash(e: Event) {
	const a = e.currentTarget as HTMLAnchorElement;
	if (location.hash) a.hash = location.hash;
}
</script>

{#if unavailable}
	<!-- A <span>: a link that goes nowhere looks identical to one that works. -->
	<span
		class="host-pill unavailable"
		title={`${other} is running, but it does not serve this page — nothing to switch to from here.`}
	>
		<span class:on={current === leftLabel}>{leftLabel}</span><span
			class:on={current === rightLabel}>{rightLabel}</span
		>
	</span>
{:else if href}
	<!-- Order is fixed on both parents: position carries no meaning, the lit
	     half carries all of it, and that only works if position holds still. -->
	<a
		class="host-pill"
		{href}
		title={`Open this page under ${other} — a different server, with none of this one's layout or assets.`}
		onpointerdown={carryHash}
		onclick={carryHash}
	>
		<span class:on={current === leftLabel}>{leftLabel}</span><span
			class:on={current === rightLabel}>{rightLabel}</span
		>
	</a>
{/if}

<style>
	/* No positioning here: each parent's menu bar places the pill. */
	.host-pill {
		text-decoration: none;
		display: inline-flex;
		border: 1px solid #333;
		border-radius: 999px;
		overflow: hidden;
		background: #111;
		cursor: pointer;
		font: inherit;
		padding: 0;
		white-space: nowrap;
	}
	/* Dimmed as a whole so the lit half still reads. `default`, not `not-allowed`: nothing is forbidden, there is nowhere to go. */
	.host-pill.unavailable {
		cursor: default;
		opacity: 0.45;
		filter: grayscale(1);
	}
	.host-pill span {
		padding: 0.35rem 0.8rem;
		color: #888;
		font-size: 0.75rem;
	}
	.host-pill span.on {
		background: var(--color-gold-bar, #f5a119);
		color: #111;
		font-weight: 600;
	}
</style>
