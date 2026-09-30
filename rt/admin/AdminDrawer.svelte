<!--
  A SIDE PANEL THAT DOES NOT TAKE THE SCREEN — for a queue you work through
  while reading the grid it is about. Stacking the two on one vertical axis
  means only ever having one of them: on Orgs the candidates list expanded to
  9376px and started the table it belongs to at y=9663.

  Non-modal on purpose, and that is the whole design: no scrim, no focus trap,
  no `aria-modal`. The grid behind stays scrollable, clickable and reachable by
  Tab, because the work is comparative. `JsonPeek` is the modal in this kit and
  wants the opposite of every line here.
-->
<script lang="ts">
import { cubicOut } from "svelte/easing";
import type { Snippet } from "svelte";

type Props = {
	open: boolean;
	/** Named on the panel itself — the trigger is elsewhere and scrolls away. */
	title: string;
	/** One line under the title, for what the trigger no longer has room to say. */
	note?: string;
	onclose: () => void;
	/** CSS length. Wide enough for this drawer's own content, never a share of the grid. */
	width?: string;
	children: Snippet;
};
let { open, title, note, onclose, width = "min(560px, 44vw)", children }: Props = $props();

let closeEl = $state<HTMLButtonElement | null>(null);
let opener: Element | null = null;

// Focus ENTERS and comes back, but is never held: half of JsonPeek's behaviour
// on purpose — trapping it here would forbid the grid this panel exists to
// compare against.
$effect(() => {
	if (!open) return;
	const back = opener ?? document.activeElement;
	opener = back;
	closeEl?.focus();
	return () => {
		opener = null;
		if (back instanceof HTMLElement) back.focus();
	};
});

const still = () =>
	typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Slides its OWN box and nothing else: a transform on any ancestor of the grid becomes the containing block for `position: sticky`, and the frozen header and frozen left edge die silently. */
const slide = () => ({
	duration: still() ? 0 : 200,
	easing: cubicOut,
	css: (t: number, u: number) => `opacity:${t};transform:translateX(${100 * u}%)`,
});
</script>

{#if open}
	<aside class="addr" style="--addr-w:{width}" transition:slide aria-label={title}>
		<header class="addr-head">
			<div class="addr-id">
				<span class="addr-title">{title}</span>
				{#if note}<span class="addr-note">{note}</span>{/if}
			</div>
			<button bind:this={closeEl} type="button" onclick={onclose} aria-label="Close {title}">✕</button>
		</header>
		<div class="addr-body">
			{@render children()}
		</div>
	</aside>
{/if}

<svelte:window
	onkeydown={(e) => {
		if (open && e.key === "Escape") onclose();
	}}
/>

<style>
/* Above the frozen header and its seam cells (z-index 8), below ColumnPicker's
   menu (41) and JsonPeek (60) — both must still open over this. */
.addr {
	position: fixed;
	top: 0;
	right: 0;
	z-index: 30;
	width: var(--addr-w);
	max-width: 100vw;
	height: 100dvh;
	display: flex;
	flex-direction: column;
	background: var(--admin-panel-bg, #16161a);
	border-left: 1px solid var(--at-line-strong, #3a3a3a);
	box-shadow:
		var(--at-lift-3, 0 24px 48px -12px rgb(0 0 0 / 80%)),
		var(--at-edge-hi, inset 0 1px 0 rgb(255 255 255 / 6%));
}
.addr-head {
	display: flex;
	align-items: flex-start;
	gap: 10px;
	padding: 12px 14px;
	border-bottom: 1px solid var(--at-line, #2a2a2a);
	flex: none;
}
.addr-id {
	min-width: 0;
	flex: 1;
}
.addr-title {
	display: block;
	font-family: var(--rt-font-mono);
	font-size: 11px;
	font-weight: 800;
	letter-spacing: 0.06em;
	text-transform: uppercase;
	color: var(--at-muted);
}
.addr-note {
	display: block;
	margin-top: 5px;
	font-size: 11.5px;
	line-height: 1.45;
	color: var(--at-muted-2);
}
.addr-head button {
	flex: none;
	width: 24px;
	height: 24px;
	border-radius: 5px;
	border: 1px solid var(--at-line-strong, #3a3a3a);
	background: none;
	color: var(--at-muted);
	font-size: 11px;
	line-height: 1;
	cursor: pointer;
}
.addr-head button:hover {
	border-color: var(--at-accent);
	color: var(--at-accent);
}
.addr-head button:focus-visible {
	outline: 1px solid var(--at-gold, #eab627);
	outline-offset: 1px;
}
/* The list is unbounded — 170 candidates today, 110 this morning — so the
   panel never sizes to it. */
.addr-body {
	flex: 1;
	min-height: 0;
	overflow-y: auto;
	overscroll-behavior-y: contain;
	padding: 12px 14px;
}
</style>
