<!--
  NameTag — a title as every sheet and popover draws it: the item's icon, then
  the name alone in the steel plaque, then the meta line beneath both, OUTSIDE
  the plaque: the YYMMDD date, the owner's pill, and the figure at the far right. The plaque is the tap target for renaming; the date and
  the owner are facts about the row, not part of its name.

  It FORMATS NOTHING. `date` arrives as six digits, minted from the row's
  `createdAt` by `naming.ts` `dateTag`.

  It WRITES NOTHING. `onclick` opens the caller's drawer; the caller owns the
  store write.

  An empty name renders as a DASH, not as nothing: a dash reads as an empty
  slot and asks to be filled.

  WHITE, not gold. Gold means "this is the commit"; a name is not a commit.

  A long NAME steps down one size, then wraps; it is never cut.
-->
<script lang="ts">
import type { Snippet } from "svelte";
import IdentityPill, { type Identity } from "$gc/IdentityPill.svelte";
import SharedPill from "$gc/SharedPill.svelte";
import Icon from "$gc/Icon.svelte";
import Plaque from "./Plaque.svelte";
import { setNestDepth } from "./NestPill.svelte";

const {
	art,
	name = "",
	date = "",
	placeholder = "—",
	who,
	editors = [],
	clobberBy = null,
	onMarks,
	chip,
	shared = null,
	onShared,
	trail,
	onclick,
	empty = false,
	caret = false,
	dataPlaque,
	ariaLabel,
	ring = false,
	children,
}: {
	/** A white ring around the plaque: the name heads everything nested under it. */
	ring?: boolean;
	/** Hung under the name on a dashed line, after the meta line: the sheet's pills. */
	children?: Snippet;
	/** The item's icon, outside the plaque on its left, about the plaque's height. */
	art?: Snippet;
	name?: string;
	/** Six digits, YYMMDD. Already formatted — this component never formats. */
	date?: string;
	/** Stands in for an absent label — a dash, so the slot asks to be filled. */
	placeholder?: string;
	/** The owner: who made or sent it. Read-only, right of the date. */
	who?: Identity | null;
	/** Everyone who saved it again: one joined pen pill each. */
	editors?: readonly Identity[];
	/** Whose version beat yours: their joined pill wears the hammer. */
	clobberBy?: Identity | null;
	/** A tap on the pills: the sheet scrolls to its History. */
	onMarks?: () => void;
	/** Sits after the date: the survey's shovel and planters. */
	chip?: Snippet;
	/** Shared by link, as the inbox row shows it: right of the owner. */
	shared?: { n: number } | { via: string } | null;
	onShared?: () => void;
	/** Pushed to the far right of the meta line: the item's figure (trees, length, area). */
	trail?: Snippet;
	onclick?: (e: MouseEvent) => void;
	empty?: boolean;
	caret?: boolean;
	dataPlaque?: string;
	ariaLabel?: string;
} = $props();

// The nest's line is white, the list's first depth: the pills hung on it are the next, gold.
setNestDepth(2);

const label = $derived(name.trim());

// One step, not a slide: a name that won't fit on one line drops a size and wraps from there.
function fit(el: HTMLElement, _label: string) {
	const run = () => {
		el.style.whiteSpace = "nowrap";
		el.style.fontSize = "";
		const over = el.scrollWidth > el.clientWidth;
		el.style.whiteSpace = "";
		el.style.fontSize = over ? "1.05rem" : "";
	};
	run();
	void document.fonts.ready.then(run);
	// The update lands before the new text does.
	return { update: () => requestAnimationFrame(run) };
}
</script>

<div class="name-tag">
	<div class="name-tag-row" class:name-tag-ring={ring}>
	{#if art}<span class="name-tag-art">{@render art()}</span>{/if}
	<Plaque class="plaque--name-tag" {onclick} {empty} {caret} {dataPlaque} {ariaLabel}>
		{#if label}
			<span class="name-tag-label" use:fit={label}>{label}</span>
		{:else if placeholder}
			<span class="name-tag-label">{placeholder}</span>
		{/if}
		{#if onclick && !caret}<span class="name-tag-pen"><Icon name="pen" size={14} /></span>{/if}
	</Plaque>
	</div>
	{#if children}
		<div class="name-tag-nest">{@render foot()}{@render children()}</div>
	{:else}{@render foot()}{/if}
</div>

{#snippet foot()}
	{#if date || who || chip || shared || trail}
		<div class="name-tag-foot">
			{#if date}<span class="name-tag-date">{date}</span>{/if}
			{#if chip}{@render chip()}{/if}
			{#if who}
				{#if onMarks && (editors.length || clobberBy)}<button type="button" class="name-tag-marks" onclick={(e) => (e.stopPropagation(), onMarks())}><IdentityPill {who} {editors} {clobberBy} /></button>
				{:else}<IdentityPill {who} {editors} {clobberBy} />{/if}
			{/if}
			{#if shared}<SharedPill {shared} onclick={onShared} />{/if}
			{#if trail}<span class="name-tag-figure">{@render trail()}</span>{/if}
		</div>
	{/if}
{/snippet}

<style>
	.name-tag {
		flex: 1;
		min-width: 0;
		width: 100%;
	}

	.name-tag-label {
		max-width: 100%;
		font-family: var(--rt-font-display), sans-serif;
		font-size: 20px;
		font-weight: 600;
		line-height: 1;
		letter-spacing: 0.03em;
		color: var(--rt-fg);
		text-align: left;
		overflow-wrap: anywhere;
		text-shadow: 0 1px 0 #000;
	}

	.name-tag-pen {
		flex: none;
		display: flex;
		margin-left: auto;
		padding-left: 8px;
		color: #d6d3c4;
	}

	.name-tag-marks {
		display: contents;
		cursor: pointer;
	}
	.name-tag-row {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.name-tag-row > :global(.plaque-trigger) {
		flex: 1;
		min-width: 0;
	}
	.name-tag-ring {
		padding: 4px;
		border: 1.5px solid var(--rt-fg);
		border-radius: 20px;
	}
	.name-tag-nest {
		display: flex;
		flex-direction: column;
		gap: 7px;
		margin-left: 16px;
		padding: 8px 0 4px 10px;
		border-left: 1.5px dashed color-mix(in srgb, var(--rt-fg) 70%, transparent);
	}
	.name-tag-nest > .name-tag-foot {
		margin-top: 0;
		min-height: 22px;
	}
	.name-tag-art {
		flex: none;
		display: flex;
		align-items: center;
	}
	.name-tag-art :global(:is(img, svg)) {
		width: auto;
		height: 36px;
		max-width: 40px;
		object-fit: contain;
	}
	/* Numbers white, joiners and units (`.unit`) sage. */
	.name-tag-foot {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 7px;
		margin-top: 7px;
		font-family: var(--rt-font-meta);
		font-size: 12px;
		font-weight: 500;
		line-height: 1;
		color: var(--rt-fg);
		white-space: nowrap;
	}
	.name-tag-date {
		color: var(--rust);
	}
	.name-tag-figure {
		margin-left: auto;
	}
	.name-tag-foot :global(.unit) {
		color: var(--rt-sage);
	}
</style>
