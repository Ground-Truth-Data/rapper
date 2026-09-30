<!--
  The one spreadsheet body used by every admin table screen: frozen left edge,
  header pinning, column width, which element scrolls — not filters, search,
  paging, export or the page title. Rules it enforces, none a page can opt out of:
  a column is as wide as its header (never `1fr` or `max-content`, `fit` the
  exception); the frozen edge is cells that TILE, offset from frozenLeft(),
  or a gap lets the scrolling columns show through; the header pins via one
  box owning both axes, capped at `100dvh`.
-->
<script lang="ts">
import type { Snippet } from "svelte";
import { type SortState, nextSort } from "./sortRows";
import {
	applyColumnOrder,
	type ColumnPrefs,
	loadColumnPrefs,
	moveColumn,
	saveColumnPrefs,
	widthStyle,
} from "./columnPrefs";
import { frozenLeft } from "./frozenLeft";

type Props = {
	/** Column keys, in display order. */
	columns: readonly string[];
	/** Human label for a column. Defaults to the key itself. */
	label?: (col: string) => string;
	/** Hover text for a column HEADER — what it counts, or its denominator. */
	headerTitle?: (col: string) => string | undefined;
	/** Columns rendered as an "open it" button — the value is not on the page. */
	peekColumns?: readonly string[];
	rows: readonly Record<string, unknown>[];
	/** Stable per-row identity. Never the array index. */
	rowKey: (row: Record<string, unknown>) => string;
	sort: SortState;
	onSort: (next: SortState) => void;
	/** Leading DATA columns that hold their place; excludes the lead track — that's the component's, not the caller's. */
	frozen?: number;
	/** Rendered ahead of every row, inside the frozen panel. The checkbox. */
	lead?: Snippet<[Record<string, unknown> | null]>;
	/** Width of the `lead` track. */
	leadWidth?: string;
	/** Row numbers from this 0-based offset — pass the PAGE's offset, not a per-page restart ("row 412" can't be quoted otherwise). Omit for none. */
	rowNumberOffset?: number;
	/** A cell was clicked and has something worth showing. */
	onPeek?: (col: string, row: Record<string, unknown>) => void;
	/** Per-column totals, already formatted. A missing key = not numeric. */
	totals?: Record<string, string>;
	/** The Σ row's first cell — the matched total, not this page's row count. */
	totalLabel?: string;
	/** Cell display text. Defaults to the raw value. */
	render?: (col: string, row: Record<string, unknown>) => string;
	/** Full control of a cell's contents for what `render` can't express as text; the cell box, freezing and truncation stay the table's. */
	cell?: Snippet<[string, Record<string, unknown>]>;
	/** Title attribute for a cell — the untruncated value. */
	cellTitle?: (col: string, row: Record<string, unknown>) => string | undefined;
	/** Extra classes for a row, e.g. selection state. */
	rowClass?: (row: Record<string, unknown>) => string;
	/** Drag-to-reorder/resize, remembered under this key. Omit for neither. Key by TABLE NAME, not route, so the table opens arranged the same from any screen. */
	prefsKey?: string;
	/** Rendered in a last, unfrozen cell of every row; `null` for the header. */
	trail?: Snippet<[Record<string, unknown> | null]>;
	/** Rendered full-width under the row whose `rowKey` equals `openKey`. */
	detail?: Snippet<[Record<string, unknown>]>;
	openKey?: string | null;
	/** Fill the page column instead of bleeding to the window edges — for a few columns, where header-wide sizing would truncate inside a mostly empty band. */
	fit?: boolean;
	/** A click or Enter on the row, not on a control inside it — that one is the control's. */
	onRowClick?: (row: Record<string, unknown>) => void;
};
let {
	columns,
	label = (c) => c,
	headerTitle,
	peekColumns = [],
	rows,
	rowKey,
	sort,
	onSort,
	frozen = 0,
	lead,
	leadWidth = "2.2rem",
	onPeek,
	totals = {},
	rowNumberOffset = undefined,
	totalLabel,
	render,
	cellTitle,
	cell,
	rowClass,
	prefsKey,
	trail,
	detail,
	openKey = null,
	fit = false,
	onRowClick,
}: Props = $props();

const CONTROL = "form, button, a, input, select, textarea, label";
const onControl = (t: EventTarget | null) => t instanceof Element && t.closest(CONTROL) !== null;

let colPrefs = $state<ColumnPrefs>({});
$effect(() => {
	colPrefs = prefsKey ? loadColumnPrefs(prefsKey) : {};
});

let dragCol = $state<string | null>(null);
let dragOverCol = $state<string | null>(null);
let resizingCol = $state<string | null>(null);

function commitPrefs(next: ColumnPrefs) {
	colPrefs = next;
	if (prefsKey) saveColumnPrefs(prefsKey, next);
}

function onColDragStart(col: string, e: DragEvent) {
	dragCol = col;
	e.dataTransfer?.setData("text/plain", col);
	if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
}

function onColDragOver(col: string, e: DragEvent) {
	if (!dragCol || dragCol === col) return;
	e.preventDefault();
	dragOverCol = col;
}

function onColDrop(col: string, e: DragEvent) {
	e.preventDefault();
	if (dragCol && dragCol !== col)
		commitPrefs({ ...colPrefs, order: moveColumn([...allCols], dragCol, col) });
	dragCol = null;
	dragOverCol = null;
}

function onColDragEnd() {
	dragCol = null;
	dragOverCol = null;
}

function startResize(col: string, e: PointerEvent) {
	e.stopPropagation();
	e.preventDefault();
	const th = (e.currentTarget as HTMLElement).closest("th");
	if (!th) return;
	resizingCol = col;
	const startX = e.clientX;
	const startW = th.offsetWidth;
	// Saved once on release, not per pointermove — a write per pixel is a write per pixel.
	const move = (ev: PointerEvent) => {
		const w = Math.max(48, Math.round(startW + ev.clientX - startX));
		colPrefs = { ...colPrefs, widths: { ...colPrefs.widths, [col]: w } };
	};
	const up = () => {
		window.removeEventListener("pointermove", move);
		window.removeEventListener("pointerup", up);
		resizingCol = null;
		commitPrefs(colPrefs);
	};
	window.addEventListener("pointermove", move);
	window.addEventListener("pointerup", up);
}

/** Double-click the grip → back to auto width for that column. */
function clearWidth(col: string) {
	const widths = { ...colPrefs.widths };
	delete widths[col];
	commitPrefs({ ...colPrefs, widths });
}

/** A resized column keeps the width it was given; the rest fall back to the
 *  header-derived one. */
const headWidth = (c: string) =>
	colPrefs.widths?.[c]
		? widthStyle(colPrefs, c)
		: `width: ${fitWidths?.[c] ?? colWidth(label(c))}`;

// MAX across real column names, not the mean: a mean clips the widest header.
const CH = 0.502;
const SORT_ARROW = 1.6;
const colWidth = (name: string) => `${(name.length * CH + SORT_ARROW).toFixed(2)}rem`;
const CELL_CH = 0.48;
const FIT_CAP = 40;
// Percentages summing to 100%, not lengths, so the band never scrolls sideways.
const fitWidths = $derived.by(() => {
	if (!fit) return null;
	const want = allCols.map((c) => {
		let n = 0;
		for (const r of rows) n = Math.max(n, text(c, r).length);
		const head = label(c).length * CH + SORT_ARROW;
		return Math.max(head, Math.min(n, FIT_CAP) * CELL_CH + SORT_ARROW);
	});
	const sum = want.reduce((a, b) => a + b, 0);
	return Object.fromEntries(allCols.map((c, i) => [c, `${((want[i] / sum) * 100).toFixed(2)}%`]));
});

const allCols = $derived(
	applyColumnOrder([...columns, ...peekColumns], colPrefs.order),
);
const isPeek = (c: string) => peekColumns.includes(c);

// Row numbers ride the lead track but don't depend on the `lead` snippet: a
// page wanting a gutter of numbers and no checkboxes gets one.
const hasLead = $derived(Boolean(lead) || rowNumberOffset !== undefined);
const leadCount = $derived(hasLead ? 1 : 0);
const span = $derived(leadCount + allCols.length + (trail ? 1 : 0));
// Clamped: a `frozen` past the last column would freeze the whole table.
const frozenTotal = $derived(
	frozen > 0 ? Math.min(frozen, allCols.length) + leadCount : 0,
);

function clickSort(col: string) {
	onSort(nextSort(sort, col));
}
const arrow = (c: string) => (sort.col === c ? (sort.asc ? "↑" : "↓") : "↕");

// "—" is the server's rendering of null, and a popup saying "—" answers no
// question anyone asked.
const openable = (s: string) => s !== "" && s !== "—";
const text = (c: string, row: Record<string, unknown>) =>
	render ? render(c, row) : String(row[c] ?? "");

// EACH CELL CARRIES ITS OWN OFFSET, never `nth-child`: header/Σ row/data row
// don't agree on cell count, so the same column is a different nth-child in each.
const frozenLeftVar = (index: number) =>
	index < frozenTotal ? `left: var(--fz${index}, 0px)` : undefined;
</script>

<div class="admin-tablewrap adt-wrap" class:adt-fit={fit}>
	<table class="admin-table adt" use:frozenLeft={frozenTotal}>
		<thead>
			<tr>
				{#if hasLead}
					<th
						class="admin-th adt-lead"
						class:adt-frozen={frozenTotal > 0}
						class:adt-seam={frozenTotal === 1}
						style="width: {leadWidth}; {frozenLeftVar(0) ?? ''}"
					>
						{#if lead}{@render lead(null)}{/if}
					</th>
				{/if}
				{#each allCols as c, i (c)}
					{#if isPeek(c)}
						<!-- Not sortable: the value was never fetched with the page. -->
						<th
							class="admin-th adt-peek-th"
							class:adt-frozen={i + leadCount < frozenTotal}
							class:adt-seam={i + leadCount === frozenTotal - 1}
							style="{headWidth(c)}; {frozenLeftVar(i + leadCount) ?? ''}"
							title="{label(c)} — open from a row">{label(c)}</th
						>
					{:else}
						<th
							class="admin-th adt-th"
							class:adt-frozen={i + leadCount < frozenTotal}
							class:adt-seam={i + leadCount === frozenTotal - 1}
							class:sorted={sort.col === c}
							class:adt-dragover={dragOverCol === c}
							aria-sort={sort.col === c
								? sort.asc
									? "ascending"
									: "descending"
								: undefined}
							style="{headWidth(c)}; {frozenLeftVar(i + leadCount) ?? ''}"
							title={headerTitle?.(c)}
							onclick={() => clickSort(c)}
							draggable={prefsKey ? resizingCol === null : undefined}
							ondragstart={prefsKey
								? (e: DragEvent) => onColDragStart(c, e)
								: undefined}
							ondragover={prefsKey
								? (e: DragEvent) => onColDragOver(c, e)
								: undefined}
							ondrop={prefsKey ? (e: DragEvent) => onColDrop(c, e) : undefined}
							ondragend={prefsKey ? onColDragEnd : undefined}
						>
							{label(c)}<span class="arr">{arrow(c)}</span>
							{#if prefsKey}
								<!-- Sibling of the label, not a wrapper, so a drag on it never starts a column drag. -->
								<span
									class="adt-grip"
									role="separator"
									aria-orientation="vertical"
									aria-label="Resize {label(c)}"
									title="Drag to resize — double-click for auto width"
									onpointerdown={(e: PointerEvent) => startResize(c, e)}
									ondblclick={(e: MouseEvent) => {
										e.stopPropagation();
										clearWidth(c);
									}}
								></span>
							{/if}
						</th>
					{/if}
				{/each}
				{#if trail}<th class="admin-th adt-trail">{@render trail(null)}</th>{/if}
			</tr>
			<!-- A Σ over nothing says nothing, so an empty table shows headers and stops. -->
			{#if totalLabel !== undefined && rows.length > 0}
				<!-- INSIDE <thead> so it stays with the head band on re-sort; `.subtotal` keeps it out of the sticky rule. -->
				<tr class="subtotal">
					{#if hasLead}<th
							class="sub"
							class:adt-frozen={frozenTotal > 0}
							style={frozenLeftVar(0)}
						></th>{/if}
					{#each allCols as c, i (c)}
						<th
							class="sub adt-sub"
							class:adt-frozen={i + leadCount < frozenTotal}
							class:adt-seam={i + leadCount === frozenTotal - 1}
							style={frozenLeftVar(i + leadCount)}
						>
							{#if i === 0}<span class="adt-sig">Σ</span>{totalLabel}
							{:else if totals[c]}<span class="adt-sig">Σ</span>{totals[c]}{/if}
						</th>
					{/each}
					{#if trail}<th class="sub adt-sub"></th>{/if}
				</tr>
			{/if}
		</thead>
		<tbody>
			<!-- Keyed by identity, never index: a re-sort/page change would otherwise leave a tick on the wrong row. -->
			{#each rows as row, rowIx (rowKey(row))}
				<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
				<tr
					class={rowClass?.(row) ?? ""}
					class:adt-clickable={!!onRowClick}
					tabindex={onRowClick ? 0 : undefined}
					onclick={onRowClick
						? (e) => {
								if (!onControl(e.target)) onRowClick(row);
							}
						: undefined}
					onkeydown={onRowClick
						? (e) => {
								if (onControl(e.target) || (e.key !== "Enter" && e.key !== " ")) return;
								e.preventDefault();
								onRowClick(row);
							}
						: undefined}
				>
					{#if hasLead}<td
							class="adt-lead"
							class:adt-frozen={frozenTotal > 0}
							class:adt-seam={frozenTotal === 1}
							style={frozenLeftVar(0)}
						>{#if lead}{@render lead(row)}{/if}{#if rowNumberOffset !== undefined}<span
									class="adt-rownum">{(rowNumberOffset + rowIx + 1).toLocaleString()}</span
								>{/if}</td>{/if}
					{#each allCols as c, i (c)}
						<td
							class="adt-cell"
							class:adt-frozen={i + leadCount < frozenTotal}
							class:adt-seam={i + leadCount === frozenTotal - 1}
							style={frozenLeftVar(i + leadCount)}
							title={cellTitle?.(c, row)}
						>
							{#if isPeek(c)}
								<!-- Unconditional: the value is not present to test for emptiness. -->
								<button
									type="button"
									class="adt-peek-btn"
									onclick={() => onPeek?.(c, row)}
									aria-label="Open {label(c)}">{"{…}"}</button
								>
							{:else if onPeek && openable(text(c, row))}
								<!-- <button>, not a <span> with a click handler (unreachable by keyboard), stripped of button affordance or 500 of them read as a form. -->
								<button type="button" class="adt-cell-btn" onclick={() => onPeek(c, row)}>
									{text(c, row)}
								</button>
							{:else if cell}
								{@render cell(c, row)}
							{:else}
								{text(c, row)}
							{/if}
						</td>
					{/each}
					{#if trail}<td class="adt-trail">{@render trail(row)}</td>{/if}
				</tr>
				{#if detail && openKey !== null && openKey === rowKey(row)}
					<tr class="adt-detail">
						<td colspan={span}>{@render detail(row)}</td>
					</tr>
				{/if}
			{/each}
		</tbody>
	</table>
</div>

<style>
	.adt-th[draggable="true"] {
		cursor: pointer;
	}
	/* Where the dragged column would land — a left edge, since a drop puts the column BEFORE this one. */
	.adt-dragover {
		box-shadow: inset 2px 0 0 var(--at-gold, #eab627);
	}
	.adt-grip {
		position: absolute;
		top: 0;
		right: 0;
		width: 7px;
		height: 100%;
		cursor: col-resize;
		touch-action: none;
	}
	.adt-grip:hover {
		background: color-mix(in srgb, var(--at-gold, #eab627), transparent 60%);
	}
	.adt-th {
		position: relative;
	}

	/* Row number is a coordinate for pointing at a row, not data — must never compete with the values beside it. Tabular figures so it doesn't jitter. */
	.adt-rownum {
		margin-left: 5px;
		font-size: 9.5px;
		font-variant-numeric: tabular-nums;
		color: #5f5b50;
		user-select: none;
	}
	/* Overrides the shared sheet's `width: 100%`, which would leave nothing to scroll sideways. */
	.adt {
		width: auto;
	}
	/* Full-bleed. NO LEFT PADDING: padding on a scroller travels with the
	   scrolling columns, leaving a transparent strip a frozen cell's edge
	   would show through — the gutter lives on the first cell instead. */
	.adt-wrap {
		/* Under CSS `zoom` a vw is still pre-zoom, so it is divided back out or the table starts off-screen. */
		margin-inline: calc(50% - 50vw / var(--page-zoom, 1));
		padding-inline: 0 24px;
	}

	.adt-th {
		cursor: pointer;
		user-select: none;
	}
	/* A header must not wrap — a wrapped header would silently make every row in the table taller. */
	.adt :global(th),
	.adt-cell {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.adt-cell {
		font-family: var(--rt-font-mono, ui-monospace, Menlo, monospace);
		font-size: 12.5px;
		max-width: 0;
	}

	/* THE FROZEN LEFT EDGE: these cells hold their place while everything else
	   slides under them. THE INSET SHADOW IS AN OPAQUE FLOOR, not decoration —
	   the scrolling columns pass UNDERNEATH, so a plain `background` per state
	   would leave a hole for any state nobody enumerated; every rule below
	   repeats the shadow rather than replacing it. Z stack: sliding body 0,
	   sliding header 5, frozen body 7 (must beat the sliding HEADER), frozen
	   header 8 — frozen always beats sliding on both axes, or a column name
	   could travel across the frozen edge. */
	.adt :global(td.adt-frozen),
	.adt :global(th.adt-frozen) {
		position: sticky;
		z-index: 7;

		background: var(--at-bg);
		box-shadow: inset 0 0 0 100vmax var(--at-bg);
	}
	/* `!important` is the point: the shared sheet pins headers at z-index 5 with
	   a more specific selector, so without it the frozen header ties with the
	   sliding ones and a later column paints over it. */
	.adt :global(thead th.adt-frozen) {
		z-index: 8 !important;
		background: var(--at-inset);
		box-shadow: inset 0 0 0 100vmax var(--at-inset);
	}
	.adt :global(tr.subtotal th.adt-frozen) {
		background: var(--at-panel);
		box-shadow: inset 0 0 0 100vmax var(--at-panel);
	}
	.adt :global(tbody tr:hover td.adt-frozen) {
		background: var(--at-hover);
		box-shadow: inset 0 0 0 100vmax var(--at-hover);
	}
	/* Without this a ticked row's highlight stops at the frozen seam (the floor
	   paints over the shared sheet's background). After hover in source order,
	   so a ticked row stays ticked-coloured under the pointer. */
	.adt :global(tbody tr.row-selected td.adt-frozen) {
		background: var(--at-selected);
		box-shadow: inset 0 0 0 100vmax var(--at-selected);
	}
	.adt :global(tbody tr.row-selected td.adt-seam) {
		box-shadow: inset 0 0 0 100vmax var(--at-selected),
			6px 0 8px -6px rgb(0 0 0 / 90%);
	}
	/* Marks where the sliding half begins, or the two halves read as one grid
	   whose left columns stopped moving. Each variant repeats the floor since
	   `box-shadow` is ONE property — a bare seam rule blanks the hiding layer. */
	.adt :global(td.adt-seam) {
		box-shadow: inset 0 0 0 100vmax var(--at-bg), 6px 0 8px -6px rgb(0 0 0 / 90%);
	}
	.adt :global(thead th.adt-seam) {
		box-shadow: inset 0 0 0 100vmax var(--at-inset), 6px 0 8px -6px rgb(0 0 0 / 90%);
	}
	.adt :global(tr.subtotal th.adt-seam) {
		box-shadow: inset 0 0 0 100vmax var(--at-panel), 6px 0 8px -6px rgb(0 0 0 / 90%);
	}
	.adt :global(tbody tr:hover td.adt-seam) {
		box-shadow: inset 0 0 0 100vmax var(--at-hover), 6px 0 8px -6px rgb(0 0 0 / 90%);
	}

	/* Page gutter carried by the row's FIRST cell, not the scroller (see
	   .adt-wrap) — on every frozen column it would open a 24px gap before each one. */
	.adt :global(tr > *:first-child) {
		padding-left: 24px;
	}

	.adt-fit {
		margin-inline: 0;
		padding-inline: 0;
	}
	.adt-fit .adt {
		width: 100%;
	}
	.adt-fit .adt :global(tr > *:first-child) {
		padding-left: var(--at-cell-pad-x);
	}
	.adt-trail {
		width: 5.5rem;
		text-align: right;
	}
	.adt :global(tbody tr.adt-detail),
	.adt :global(tbody tr.adt-detail:hover) {
		background: color-mix(in srgb, var(--at-selected), var(--at-bg) 45%);
	}
	.adt :global(tr.adt-detail > td) {
		white-space: normal;
		box-shadow: inset 2px 0 0 var(--at-gold, #eab627);
		border-bottom-color: color-mix(in srgb, var(--at-gold, #eab627), transparent 65%);
	}

	.adt-clickable {
		cursor: pointer;
	}
	.adt-clickable:focus-visible {
		outline: 1px solid var(--at-gold, #eab627);
		outline-offset: -1px;
	}

	.adt-lead {
		width: 2.2rem;
		text-align: center;
	}

	.adt-cell-btn {
		display: block;
		width: 100%;
		border: 0;
		padding: 0;
		background: none;
		font: inherit;
		color: inherit;
		text-align: left;
		cursor: pointer;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.adt-cell-btn:hover {
		color: var(--at-th-hover, #eab627);
	}
	.adt-cell-btn:focus-visible {
		outline: 1px solid var(--at-gold, #eab627);
		outline-offset: 1px;
	}

	.adt-sub {
		cursor: default;
		font-family: var(--rt-font-mono, ui-monospace, Menlo, monospace);
	}
	.adt-sig {
		opacity: 0.55;
		font-weight: 500;
		margin-right: 0.35em;
	}

	.adt-peek-th {
		opacity: 0.5;
		cursor: default;
	}
	.adt-peek-btn {
		border: 1px solid var(--at-line);
		background: transparent;
		color: var(--at-accent);
		border-radius: 4px;
		padding: 0 0.4rem;
		font-family: var(--rt-font-mono, ui-monospace, Menlo, monospace);
		font-size: 12px;
		line-height: 1.7;
		cursor: pointer;
	}
	.adt-peek-btn:hover {
		border-color: var(--at-gold, #eab627);
	}
</style>
