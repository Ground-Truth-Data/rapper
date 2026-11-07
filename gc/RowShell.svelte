<!-- The row card's shell: layout and styling, nothing it says. Get Cache's RowCard fills it with the inbox's
     content, Ops with plugins. Its CSS is global so the content a caller passes in is styled too. -->
<script lang="ts">
import type { Snippet } from "svelte";

type Props = {
    title: string;
    /** The row is a link: its root is an `<a>`. */
    href?: string;
    onclick?: () => void;
    /** Inbox hierarchy: "top" cream border, "child" dim cream; the title clips to one line. */
    tier?: "top" | "child";
    selected?: boolean;
    active?: boolean;
    /** Gold border without the active wash: inspected in a side panel. */
    inspecting?: boolean;
    dim?: boolean;
    glyphCache?: boolean;
    glyphKind?: string | null;
    /** Before the icon: the inbox's checkbox. */
    lead?: Snippet;
    /** The icon slot. */
    glyph?: Snippet;
    /** Right of the title, on its line. */
    titleEnd?: Snippet;
    /** The subtitle line under the title. */
    subtitle?: Snippet;
    /** Lines under the subtitle. */
    children?: Snippet;
    /** Over the whole row, under the lead: tap zones. */
    overlay?: Snippet;
    /** The right slot. */
    end?: Snippet;
};

let { title, href, onclick, tier, selected = false, active = false, inspecting = false, dim = false, glyphCache = false, glyphKind = null, lead, glyph, titleEnd, subtitle, children, overlay, end }: Props = $props();
</script>

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
    {onclick}
>
    <span class="rt-row__main">
        {@render lead?.()}
        <span class="rt-row__glyph" class:rt-row__glyph--cache={glyphCache} data-glyph={glyphKind}>{@render glyph?.()}</span>
        <span class="rt-row__body">
            <span class="rt-row__title-row">
                <span class="rt-row__title">{title}</span>
                {@render titleEnd?.()}
            </span>
            {#if subtitle}<span class="rt-row__meta">{@render subtitle()}</span>{/if}
            {@render children?.()}
        </span>
    </span>
    {@render overlay?.()}
    {#if end}<span class="rt-row__actions">{@render end()}</span>{/if}
</svelte:element>

<style>
:global {
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
    .rt-row--child .rt-row__subtitle { color: var(--rust); }
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
    /* A row that holds rows: chevron down while open, right while folded. The row's tap zone under it does the folding. */
    .rt-row__fold { display: flex; flex-shrink: 0; width: 16px; margin-inline: -4px; color: var(--rt-yellow); pointer-events: none; }
    .rt-row__fold svg { transition: transform 180ms ease; }
    .rt-row__fold--shut svg { transform: rotate(-90deg); }

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
        color: var(--rust);
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
        border: 1px solid var(--rust);
        color: var(--rust);
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
        color: var(--rust);
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
        -webkit-tap-highlight-color: color-mix(in srgb, var(--rust) 35%, transparent);
        transition: background 140ms ease;
    }
    /* Folding is the common tap on a row that holds rows; the chevron's 30% opens its details. */
    .rt-row__half--toggle { left: 0; width: 70%; background: color-mix(in srgb, var(--rust) 7%, transparent); }
    .rt-row__half--open { right: 0; width: 30%; }
    .rt-row .rt-row__half:hover { background: color-mix(in srgb, var(--rt-yellow) 10%, transparent); }
    .rt-row .rt-row__half:active { background: color-mix(in srgb, var(--rust) 28%, transparent); }
    .rt-row__half:focus-visible { outline: 2px solid var(--rt-yellow); outline-offset: -2px; }
    .rt-row__checkbox { z-index: 2; }
    .rt-row__badge--gold { color: var(--rt-yellow); border-color: var(--rt-yellow); white-space: nowrap; }
}
</style>
