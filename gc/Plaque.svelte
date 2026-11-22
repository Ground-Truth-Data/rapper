<!--
  Plaque — the shared dark rounded button-plaque shell used across the
  mobile app (Get Cache header price plaque, Quality 704 header inputs).
  Single source of truth for the plaque LOOK (background, border, radius,
  shadow, height) AND the canonical text treatments below.

  Content goes in the default slot. Pass `class` to add a variant modifier
  (e.g. "plaque--header-price"). Variants: empty (dimmed), buzz (refusal).

  NOTE: the Get Cache ROW plaques (boxTag/price/size in BagRowList) are
  NOT migrated here — they're entangled with the GSAP insist/tour system
  (data-plaque targeting, per-variant layout) and keep their own local text
  styling. The shared text rules below are deliberately scoped to
  header-price / input classes so they never leak onto the row plaques.
-->
<script lang="ts">
import type { Snippet } from "svelte";

const {
	onclick,
	empty = false,
	buzz = false,
	dataPlaque,
	dataTour,
	ariaLabel,
	caret = false,
	class: className = "",
	children,
}: {
	onclick?: (e: MouseEvent) => void;
	empty?: boolean;
	buzz?: boolean;
	dataPlaque?: string;
	dataTour?: string;
	ariaLabel?: string;
	/** The yellow chevron of a plaque that opens a picker. */
	caret?: boolean;
	class?: string;
	children: Snippet;
} = $props();
</script>

<button
	type="button"
	class="plaque-trigger"
	data-plaque={dataPlaque}
	data-tour={dataTour}
	aria-label={ariaLabel}
	{onclick}
>
	<div
		class="plaque {className} {empty ? 'plaque--empty' : ''} {buzz ? 'plaque--buzz' : ''}"
	>
		{@render children()}
		{#if caret}
			<svg class="plaque-caret" viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
			<path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
		</svg>
		{/if}
	</div>
</button>

<style>
	.plaque-trigger {
		display: block;
		width: 100%;
		min-width: 0;
		background: none;
		border: none;
		padding: 0;
		touch-action: manipulation;
	}

	.plaque {
		height: 2.5rem;
		border-radius: var(--rt-btn-radius);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0 0.2rem;
		background: var(--rt-btn-neutral-bg);
		box-shadow: var(--rt-shadow-btn);
		border: var(--rt-btn-neutral-border);
		color: var(--rt-btn-neutral-text);
		cursor: pointer;
		transition: background 100ms;
		-webkit-tap-highlight-color: transparent;
		overflow: visible;
	}

	.plaque:hover {
		background: var(--rt-btn-neutral-bg-hover);
	}

	.plaque--buzz {
		animation: mob-buzz-red 1.5s ease-out forwards;
		opacity: 1;
	}

	/* ── Editable plaque input (Quality 704). Only inputs use this class, so
	   it can't affect the Get Cache row plaques (which have no inputs). ── */
	:global(.plaque .plaque-text-input) {
		width: 100%;
		min-width: 0;
		background: none;
		border: none;
		outline: none;
		text-align: center;
		font-family: var(--rt-font-display), sans-serif;
		font-size: 1.6rem;
		font-weight: 600;
		text-transform: lowercase;
		letter-spacing: 0.03em;
		color: var(--rt-fg);
		text-shadow:
			1px 1px 0 rgba(0, 0, 0, 0.9),
			2px 2px 4px rgba(0, 0, 0, 0.7),
			0 0 8px rgba(0, 0, 0, 0.5);
		-moz-appearance: textfield;
		appearance: textfield;
	}

	:global(.plaque .plaque-text-input::-webkit-outer-spin-button),
	:global(.plaque .plaque-text-input::-webkit-inner-spin-button) {
		-webkit-appearance: none;
		margin: 0;
	}

	/* Default plaque-input placeholder. NOTE: app.css forces a global
	   `input::placeholder { color:#888 !important }`, so per-input placeholder
	   colour must use !important at the call site (see Quality704Header /
	   quality704 +page). This colour is the fallback intent only. */
	:global(.plaque .plaque-text-input::placeholder) {
		color: #939393;
		opacity: 1;
		font-family: var(--rt-font-display), sans-serif;
	}

	/* NameTag's card hugs its text; only this modifier leaves the shared 2.5rem. */
	.plaque--name-tag {
		height: auto;
		padding: 8px 14px;
		border-radius: 16px;
		justify-content: flex-start;
	}

	.plaque-caret {
		flex: none;
		align-self: center;
		margin: 0 0.5rem 0 0.4rem;
		color: var(--rt-yellow);
		opacity: 0.92;
		width: 24px;
		height: 24px;
	}

	/* ── Header-price plaque text (Get Cache header). Scoped to the
	   .plaque--header-price modifier — header-only, never the rows. ── */
	:global(.plaque--header-price .plaque-text) {
		font-size: 1.05rem;
		color: var(--rt-fg);
		white-space: nowrap;
		text-align: left;
		display: inline-flex;
		align-items: center;
		text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
	}

	:global(.plaque--header-price:not(.plaque--empty) .plaque-text) {
		color: var(--rt-yellow);
		font-family: var(--rt-font-display), sans-serif;
		font-size: 1.6rem;
		font-weight: 600;
		text-transform: lowercase;
		letter-spacing: 0.03em;
		text-shadow:
			1px 1px 0 rgba(0, 0, 0, 0.9),
			2px 2px 4px rgba(0, 0, 0, 0.7),
			0 0 8px rgba(0, 0, 0, 0.5);
	}

	:global(.plaque--header-price:not(.plaque--empty) .plaque-text--long) {
		font-size: 1.2rem;
	}

	:global(.plaque--header-price.plaque--empty .plaque-text) {
		color: var(--rt-fg);
		font-family: var(--rt-font-display), sans-serif;
		font-size: 1.6rem;
		font-weight: 600;
		opacity: 1;
		text-shadow:
			1px 1px 0 rgba(0, 0, 0, 0.9),
			2px 2px 4px rgba(0, 0, 0, 0.7),
			0 0 8px rgba(0, 0, 0, 0.5);
	}
</style>
