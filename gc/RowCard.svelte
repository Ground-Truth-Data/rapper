<!-- RowCard — universal row primitive (lists: layers, maps, files, inbox
     items). Token-driven; never reach for hex. -->
<script lang="ts">
import ConfirmedDiamond from "./ConfirmedDiamond.svelte";
import Icon from "./Icon.svelte";
import shovelGold from "./assets/shovel_gold.webp";
import treeRust from "./assets/treeFontRust_mini.webp";
import type { Snippet } from "svelte";
import { m } from "$parent/src/lib/paraglide/messages";
import { getLocale } from "$parent/src/lib/paraglide/runtime";
import Checkbox from "./Checkbox.svelte";
import IdentityPill, { type Identity } from "./IdentityPill.svelte";

type Props = {
    title: string;
    subtitle?: string;
    /** Who wrote the row — after the count chip, before everything else. */
    who?: Identity | null;
    /** The last editor when not the owner: the pill's second half. */
    editor?: Identity | null;
    /** Your version was replaced by a concurrent edit: the owner pill's second segment. */
    hammer?: boolean;
    /** Saved again after it was made: a pen in that segment, unless the hammer is up. */
    edited?: boolean;
    /** Allocated to plant it: the third line, shovel + names. */
    planters?: string[];
    /** Trees delivered here: a rust metric on line 2. */
    trees?: number | null;
    /** Their delivery: rose diamond while out there, grey once planted or removed. */
    delivery?: "" | "delivered" | "undelivered";
    /** "Last touched" (formatWhen), pinned right so every row's date lands
     *  on one vertical column. Never truncates. */
    when?: string | null;
    /** Sage tint — ONLY for "now" / a time-of-day today. */
    whenFresh?: boolean;
    /** No usable timestamp — renders the em dash in the separator colour. */
    whenMissing?: boolean;
    /** Absolute date for the screen-reader label — a11y always gets the
     *  absolute form, never the relative one. */
    whenAbsolute?: string | null;
    /** Resolved icon URL (caller looked it up via `icons.ts`). `null`
     *  renders no icon — the broken-data signal for legacy files. */
    glyphSrc?: string | null;
    /** Drawn INSTEAD of glyphSrc — an emoji pin has no asset file. */
    glyph?: Snippet;
    /** A cache draws taller than other pins, as on the map. */
    glyphCache?: boolean;
    /** The row's kind, so a glyph whose art isn't square can seat its count badge on its own corner. */
    glyphKind?: string | null;
    selected?: boolean;
    active?: boolean;
    /** Gold border without the ACTIVE pill — for "currently being
     *  inspected in a side panel" callouts. */
    inspecting?: boolean;
    /** Fade the row to recede behind a focused sibling (e.g. inbox Details
     *  sheet open). */
    dim?: boolean;
    /** Area for a piece, length for a line — same label the map draws. */
    measure?: string | null;
    /** Red pill for a row whose bytes are absent, e.g. "image missing" —
     *  status shows what arrived, so the row is flagged, never hidden. */
    missing?: string | null;
    /** Items inside (plots, tallies); the badge on the glyph. Hidden at 1, capped at 999+. */
    count?: number | null;
    /** The row holds rows: its left 70% opens and closes them, its right
     *  30% opens the row, and the badge shows the count at any count. */
    toggle?: { open: boolean; onToggle: () => void };
    /** Reason pills after the count: amber for late, red for an edit or a clock set back, gold for a state. */
    tags?: { label: string; tone: "amber" | "red" | "gold" }[];
    /** Shared by link: `n` live links to this row, or `via` the shared row it sits inside. */
    shared?: { n: number } | { via: string } | null;
    onShared?: () => void;
    /** Where the row is ("16 km W of Perth", "in Map › Block"): the last line. */
    place?: string | null;
    /** The row is a link: its root is an `<a>`, a tap navigates, no details sheet. */
    href?: string;
    /** Archive hierarchy tier — joins the Inbox three-tier color scheme
     *  ("top" cream, "child" dim cream, meta terracotta, title clips to one
     *  line). Unset keeps the neutral primitive look. */
    tier?: "top" | "child";
    showCheckbox?: boolean;
    onToggleSelect?: () => void;
    onOpen?: () => void;
    onEdit?: () => void;
    editLabel?: string;
    /** Hide the trailing `>` chevron while keeping the row tappable via
     *  `onOpen` — use when a tap acts immediately with no separate detail
     *  target. Default: chevron shown. */
    showChevron?: boolean;
    actionsSnippet?: Snippet;
};

let {
    title,
    subtitle = "",
    who = null,
    editor = null,
    hammer = false,
    edited = false,
    planters = [],
    trees = null,
    delivery = "",
    when = null,
    whenFresh = false,
    whenMissing = false,
    whenAbsolute = null,
    glyphSrc = null,
    glyph,
    glyphCache = false,
    glyphKind = null,
    selected = false,
    active = false,
    inspecting = false,
    dim = false,
    measure = null,
    missing = null,
    count = null,
    toggle,
    tags = [],
    shared = null,
    onShared,
    place = null,
    href,
    tier,
    showCheckbox = false,
    onToggleSelect,
    onOpen,
    onEdit,
    editLabel = m.gc_row_edit(),
    showChevron = true,
    actionsSnippet,
}: Props = $props();

function handleCardClick() {
    if (onOpen) onOpen();
    else if (showCheckbox && onToggleSelect) onToggleSelect();
}
function stopAnd(fn?: () => void) {
    return (e: MouseEvent) => {
        e.stopPropagation();
        fn?.();
    };
}
// The time stands over the go-arrow, leaving a deep row's name its width.
const hasEnd = $derived(!actionsSnippet && (!!onEdit || ((!!onOpen || !!href) && showChevron)));
</script>

<!-- Sky is used for nothing else. The word stays beside the filled cloud, because the backup's cloud means "backed up". -->
{#snippet sharedPill()}
    {#if shared}
        {@const own = "n" in shared}
        <span
            class="rt-row__shared"
            class:rt-row__shared--own={own}
            role="button"
            tabindex="0"
            aria-label={own ? undefined : m.gc_row_shared_via({ name: shared.via })}
            title={own ? undefined : m.gc_row_shared_via({ name: shared.via })}
            onclick={stopAnd(onShared)}
            onkeydown={(e) => {
                if (e.key === " " || e.key === "Enter") { e.preventDefault(); e.stopPropagation(); onShared?.(); }
            }}
        >
            <Icon name="cloud" size={16} fill={own ? "currentColor" : "none"} stroke={own ? 0 : 2.4} />
            {#if own}{m.gc_row_shared_count({ n: shared.n > 99 ? "99+" : String(shared.n) })}{/if}        </span>
    {/if}
{/snippet}

{#snippet whenCell()}
    {#if when}
        <span
            class="rt-row__when"
            class:rt-row__when--fresh={whenFresh}
            class:rt-row__when--missing={whenMissing}
            aria-hidden="true">{when}</span
        >
        {#if whenAbsolute}
            <span class="rt-row__sr">{m.gc_row_last_touched({ when: whenAbsolute })}</span>
        {/if}
    {/if}
    {#if delivery}<ConfirmedDiamond muted={delivery === "undelivered"} size={12} />{/if}
{/snippet}

<!-- svelte-ignore a11y_no_static_element_interactions -->
<svelte:element
    this={href ? "a" : "button"}
    type={href ? undefined : "button"}
    {href}
    class="rt-row"
    class:rt-row--selected={selected}
    class:rt-row--active={active}
    class:rt-row--inspecting={inspecting}
    class:rt-row--dim={dim}
    class:rt-row--top={tier === "top"}
    class:rt-row--child={tier === "child"}
    onclick={handleCardClick}
>
    <span class="rt-row__main">
    {#if showCheckbox}
        <!-- Span, not a button — RowCard's root is already a <button> and
             nested buttons are invalid. role="checkbox" + key handler give
             the same accessibility surface a real button would. -->
        <span
            class="rt-row__checkbox"
            role="checkbox"
            aria-checked={selected}
            tabindex="0"
            onclick={stopAnd(onToggleSelect)}
            onkeydown={(e) => {
                if (e.key === " " || e.key === "Enter") { e.preventDefault(); onToggleSelect?.(); }
            }}
        >
            <Checkbox checked={selected} accent="yellow" />
        </span>
    {/if}

    <span class="rt-row__glyph" class:rt-row__glyph--cache={glyphCache} data-glyph={glyphKind}>
        {#if glyph}
            {@render glyph()}
        {:else if glyphSrc}
            <img src={glyphSrc} alt="" class="rt-row__glyph-img" class:rt-row__glyph-img--cache={glyphCache} />
        {/if}
        {#if toggle}
            <span class="rt-count-badge">{count ?? 0}</span>
        {:else if count != null && count > 1}
            <span class="rt-count-badge">{count > 999 ? "999+" : count}</span>
        {/if}
    </span>

    <span class="rt-row__body">
        <!-- With no end column the time holds the right edge of line 1; the title gives way to it. -->
        <span class="rt-row__title-row">
            <span class="rt-row__title">{title}</span>
            {#if !hasEnd}{@render whenCell()}{/if}
        </span>
        {#if subtitle || measure || missing || who || trees || tags.length || shared}
            <!-- One outline on the line, the owner's; the sky pill is filled or bare. The measure is plain text and the only part that truncates. -->
            <span class="rt-row__meta">
                {#if tier === "top"}{@render sharedPill()}{/if}
                {#if who}
                    <IdentityPill {who} {editor} {hammer} {edited} />
                {/if}
                {#if tier !== "top"}{@render sharedPill()}{/if}
                {#each tags as tag (tag.label)}
                    <span class="rt-row__badge rt-row__badge--{tag.tone}">{tag.label}</span>
                {/each}
                {#if missing}
                    <span class="rt-row__num rt-row__num--missing">{missing}</span>
                {/if}
                {#if trees}
                    <span class="rt-row__num rt-row__trees"><img src={treeRust} alt={m.gc_row_trees()} />{trees.toLocaleString(getLocale())}</span>
                {/if}
                {#if measure || subtitle}
                    <span class="rt-row__num" class:rt-row__subtitle={!who}>{[measure, subtitle].filter(Boolean).join(" · ")}</span>
                {/if}
            </span>
        {/if}
        {#if planters.length}
            <!-- Plain text, no pill: a filled pill would read as ownership. -->
            <span class="rt-row__planters">
                <img src={shovelGold} alt="" width="22" height="22" />
                <span class="rt-row__planters-names">{planters.join(", ")}</span>
            </span>
        {/if}
        {#if place}
            <span class="rt-row__place">{place}</span>
        {/if}
    </span>
    </span>

    {#if toggle}
        <!-- Spans over the whole row, under the checkbox: a phone has no hover, so each half lights where it is pressed. -->
        <span
            class="rt-row__half rt-row__half--toggle"
            role="button"
            tabindex="0"
            aria-expanded={toggle.open}
            aria-label={toggle.open ? m.gc_row_close() : m.gc_row_open()}
            onclick={stopAnd(toggle.onToggle)}
            onkeydown={(e) => {
                if (e.key === " " || e.key === "Enter") { e.preventDefault(); toggle.onToggle(); }
            }}
        ></span>
        <span class="rt-row__half rt-row__half--open" aria-hidden="true" onclick={stopAnd(handleCardClick)}></span>
    {/if}

    {#if actionsSnippet || hasEnd}
    <span class="rt-row__actions">
        {#if actionsSnippet}
            {@render actionsSnippet()}
        {:else if href}
            <span class="rt-row__cell rt-row__cell--chevron" aria-hidden="true">
                {@render whenCell()}
                <Icon name="chevron-right" size={14} stroke={2.5} />
            </span>
        {:else if onEdit || onOpen}
            <span
                class="rt-row__cell rt-row__cell--chevron"
                role="button"
                tabindex="0"
                aria-label={onEdit ? editLabel : m.gc_row_open()}
                onclick={onEdit ? stopAnd(onEdit) : (onOpen ? stopAnd(onOpen) : undefined)}
                onkeydown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        (onEdit ?? onOpen)?.();
                    }
                }}
            >
                {@render whenCell()}
                <Icon name="chevron-right" size={14} stroke={2.5} />
            </span>
        {/if}
    </span>
    {/if}
</svelte:element>

<style>
    .rt-row {
        position: relative;
        display: flex;
        align-items: stretch;
        width: 100%;
        /* The glyph centres on the row and its count badge rides 8px above it:
           any shorter and overflow:hidden cuts the badge on a two-line row. */
        min-height: 76px;
        padding: 0;
        /* Reserve space for the drag handle all inbox items will adopt. */
        padding-right: var(--rt-row-handle-reserve, 28px);
        background: var(--rt-surface);
        border: var(--rt-border-w-interactive) solid var(--rt-border-subtle);
        border-radius: var(--rt-radius-lg);
        color: var(--rt-fg);
        text-align: left;
        cursor: pointer;
        font-family: inherit;
        overflow: hidden;
        transition: background 140ms ease, border-color 140ms ease;
    }
    .rt-row:hover { background: var(--rt-input); }
    .rt-row__main {
        flex: 1;
        min-width: 0;
        display: flex;
        align-items: center;
        gap: var(--rt-space-3);
        padding: var(--rt-space-3) var(--rt-space-3);
    }
    /* Border carries the tier hierarchy; title stays full cream at both
       tiers — a child row is no less important to read than its parent. */
    .rt-row--top { border-color: var(--rt-cream); }
    .rt-row--child { border-color: var(--rt-cream-dim); }
    .rt-row--top .rt-row__title { color: var(--rt-cream); }
    .rt-row--child .rt-row__title { color: var(--rt-cream); }
    .rt-row--top .rt-row__subtitle,
    .rt-row--child .rt-row__subtitle { color: var(--rt-meta); }
    /* Tiered titles never wrap — clip to one line with ellipsis instead. */
    .rt-row--top .rt-row__title,
    .rt-row--child .rt-row__title {
        display: block;
        -webkit-line-clamp: none;
        line-clamp: none;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        overflow-wrap: normal;
        word-break: normal;
    }

    /* selected/active share a look (gold border, no fill) so a list with
       everything selected doesn't read as a different style than one
       selection. Selected is signaled by the checkbox; active by the pill. */
    .rt-row--selected,
    .rt-row--inspecting { border-color: var(--rt-border-active); }
    .rt-row--active {
        border-color: var(--rt-yellow);
        box-shadow: inset 0 0 0 1px var(--rt-yellow);
        /* background-image layer so the row's base surface stays black,
           just gold-washed. */
        background-image: linear-gradient(
            color-mix(in srgb, var(--rt-yellow) 12%, transparent),
            color-mix(in srgb, var(--rt-yellow) 12%, transparent)
        );
    }
    .rt-row--dim {
        opacity: 0.4;
    }
    /* Never dim the row whose sheet is open even if a stale flag races. */
    .rt-row--inspecting { opacity: 1; }
    .rt-row--inspecting .rt-row__title { color: var(--rt-yellow); }

    /* ::before extends the tap area beyond the 16px Checkbox so a missed
       thumb tap still hits the toggle instead of the row button. */
    .rt-row__checkbox {
        position: relative;
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
        background: transparent;
    }
    .rt-row__checkbox::before {
        content: "";
        position: absolute;
        inset: -12px;
    }

    .rt-row__glyph {
        position: relative;
        display: flex; align-items: center; justify-content: center;
        width: 52px; height: 52px;
        flex-shrink: 0;
        /* Even side margins centre the icon between the checkbox and the title. */
        margin: -15px 0;
        color: var(--rt-yellow);
    }
    /* The map's 36:46 pin-to-cache ratio, at row scale. */
    .rt-row__glyph-img {
        width: 40px; height: 40px;
        object-fit: contain;
        display: block;
    }
    .rt-row__glyph-img--cache { width: 50px; height: 50px; }
    /* A cache's count badge would touch the title. */
    .rt-row__glyph--cache { margin-right: 8px; }
    /* The box's saplings fill the top of its art: the badge sits on the box's corner, below them. */
    .rt-row__glyph[data-glyph="box"] .rt-count-badge { top: 8px; right: -8px; }

    .rt-row__body {
        flex: 1; min-width: 0;
        display: flex; flex-direction: column;
        gap: 2px;
        line-height: 1.2;
    }
    .rt-row__title-row {
        display: flex; align-items: center;
        gap: var(--rt-space-2);
        min-width: 0;
    }
    .rt-row__title-row .rt-row__title { min-width: 0; flex: 1; }
    .rt-row__title {
        font-family: var(--rt-font-display);
        font-size: var(--rt-fs-row);
        color: var(--rt-fg);
        text-shadow:
            1px 1px 0 rgba(0, 0, 0, 0.9),
            2px 2px 4px rgba(0, 0, 0, 0.7),
            0 0 8px rgba(0, 0, 0, 0.5);
        display: -webkit-box;
        -webkit-line-clamp: 2;
        line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        /* Filenames like 20260505_Truck_CFH have no spaces, so allow
           breaking anywhere instead of clipping with ellipsis. */
        overflow-wrap: anywhere;
        word-break: break-word;
    }
    .rt-row__meta {
        display: flex;
        align-items: center;
        gap: var(--rt-space-2);
        min-width: 0;
        overflow: hidden;
    }
    .rt-row__planters {
        display: flex;
        align-items: center;
        gap: 5px;
        min-width: 0;
    }
    /* As quiet as the date: the shovel is the signal, the names are the footnote. */
    .rt-row__planters-names {
        min-width: 0;
        color: var(--rt-yellow);
        opacity: 0.85;
        font-family: var(--rt-font-display);
        font-size: 0.8rem;
        font-weight: 300;
        letter-spacing: 0.02em;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .rt-row__subtitle {
        font-family: var(--rt-font-body);
        font-size: 0.7rem;
        color: var(--rt-fg-dim);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        min-width: 0;
    }
    /* The numbers give way, never the pill before them. Plain text, not a
       pill: the owner pill is the only outline on the line. */
    .rt-row__num {
        min-width: 0;
        font-family: var(--rt-font-body);
        font-size: 0.7rem;
        color: var(--rt-row-size);
        font-weight: 700;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .rt-row__trees { display: flex; align-items: center; gap: 2px; flex: none; }
    .rt-row__trees img { width: auto; height: 1em; }
    .rt-row__num--missing { color: var(--rt-danger); flex: none; }
    /* No width reserve — a fixed box left dead space beside short dates
       like "now". */
    .rt-row__when {
        flex: none;
        margin-left: auto;
        text-align: right;
        font-family: var(--rt-font-body);
        font-size: 0.66rem;
        font-weight: 600;
        color: var(--rt-row-when);
        white-space: nowrap;
    }
    .rt-row__when--fresh { color: var(--rt-row-when-fresh); }
    .rt-row__when--missing { color: var(--rt-row-sep); }
    /* Visually hidden, still read by screen readers. */
    .rt-row__sr {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip-path: inset(50%);
        white-space: nowrap;
    }
    a.rt-row { text-decoration: none; }
    .rt-row__badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 1.05rem;
        height: 1.05rem;
        padding: 0 0.32rem;
        border-radius: 999px;
        background: transparent;
        border: 1px solid var(--rt-meta);
        color: var(--rt-meta);
        font-family: var(--rt-font-body);
        font-size: 0.66rem;
        font-weight: 600;
        flex-shrink: 0;
    }
    .rt-row__shared {
        position: relative;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        flex-shrink: 0;
        color: var(--palette-sky);
        cursor: pointer;
        /* Over the row's tap halves, or the pill on a map with rows inside never hears a tap. */
        z-index: 2;
    }
    .rt-row__shared--own {
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
    .rt-row__shared::after {
        content: "";
        position: absolute;
        inset: -13px -4px;
    }
    .rt-row__badge--amber { color: var(--palette-amber); border-color: var(--palette-amber); }
    .rt-row__badge--red { color: var(--palette-red); border-color: var(--palette-red); }
    .rt-row__actions {
        display: flex;
        align-items: stretch;
        flex-shrink: 0;
    }
    .rt-row__cell {
        display: flex; align-items: center; justify-content: center;
        cursor: pointer;
        color: var(--rt-yellow);
        background: transparent;
        transition: background 140ms ease;
    }
    .rt-row__cell:hover { background: var(--rt-yellow-tint); }
    .rt-row__cell--chevron {
        flex-direction: column;
        align-items: flex-end;
        gap: 4px;
        min-width: 36px;
        padding: 0 10px 0 4px;
    }
    .rt-row__place {
        min-width: 0;
        font-family: var(--rt-font-body);
        font-size: 0.7rem;
        color: var(--rt-meta);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    /* iOS paints :active only with a touch listener; the tap highlight is its pressed state. */
    .rt-row__half {
        position: absolute;
        top: 0;
        bottom: 0;
        z-index: 1;
        cursor: pointer;
        -webkit-tap-highlight-color: color-mix(in srgb, var(--palette-terracotta) 35%, transparent);
        transition: background 140ms ease;
    }
    /* Folding is the common tap on a row that holds rows; the chevron's 30% opens its details. */
    .rt-row__half--toggle {
        left: 0;
        width: 70%;
        background: color-mix(in srgb, var(--palette-terracotta) 7%, transparent);
    }
    .rt-row__half--open { right: 0; width: 30%; }
    .rt-row .rt-row__half:hover { background: color-mix(in srgb, var(--rt-yellow) 10%, transparent); }
    .rt-row .rt-row__half:active { background: color-mix(in srgb, var(--palette-terracotta) 28%, transparent); }
    .rt-row__half:focus-visible { outline: 2px solid var(--rt-yellow); outline-offset: -2px; }
    .rt-row__checkbox { z-index: 2; }
    .rt-row__badge--gold { color: var(--rt-yellow); border-color: var(--rt-yellow); white-space: nowrap; }
</style>
