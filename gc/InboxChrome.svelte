<!-- The inbox's top: pill rows, search and buttons; RowCard draws the rows below it. Get Cache's inbox and Ops' plugins both draw through it. -->
<script lang="ts" module>
export type ChromePill = { key: string; label: string; icon?: string | null; sep?: "chev" | "div" | null; on?: boolean; chain?: boolean };
export type ChromeButton = { label: string; aria?: string; icon: Snippet; gold?: boolean; /** Gold border on black: the lead button without the fancy fill. */ ring?: boolean; onclick?: () => void; href?: string; /** As wide as its label, not an even share of the row. */ hug?: boolean };
</script>

<script lang="ts">
import type { Snippet } from "svelte";
import { flip } from "svelte/animate";
import FancyButton from "./FancyButton.svelte";
import Icon from "./Icon.svelte";
import SearchInput from "./SearchInput.svelte";

type Props = {
    /** One scrolling row each; search shows only when there is a row. */
    rows?: ChromePill[][];
    onpill?: (key: string, row: number) => void;
    query?: string;
    placeholder?: string;
    clearLabel?: string;
    /** After a divider at the end of the first row: the inbox's trash. */
    pillsEnd?: Snippet;
    /** Beside the search field: the inbox's filter button. */
    searchEnd?: Snippet;
    below?: Snippet;
    buttons?: ChromeButton[];
};

let { rows = [], onpill, query = $bindable(""), placeholder, clearLabel, pillsEnd, searchEnd, below, buttons = [] }: Props = $props();

let scrollers = $state<HTMLElement[]>([]);
// The lit pill slides to the front, so its row scrolls back to show it.
$effect(() => {
    rows.forEach((r, i) => {
        void r.find((p) => p.on)?.key;
        scrollers[i]?.scrollTo({ left: 0, behavior: "smooth" });
    });
});
</script>

{#if rows.length || buttons.length}
    <div class="inbox2-chrome">
        {#each rows as row, ri (ri)}
            <div class="inbox2-pills" bind:this={scrollers[ri]}>
                {#each row as p (p.key)}
                    <span class="inbox2-pill-slot" animate:flip={{ duration: 460 }}>
                        {#if p.sep === "div"}
                            <span class="inbox2-pill-div"></span>
                        {:else if p.sep}
                            <span class="inbox2-pill-sep"><Icon name="chevron-right" size={14} stroke={2.6} /></span>
                        {/if}
                        <button
                            type="button"
                            class="inbox2-pill"
                            class:inbox2-pill--on={p.on}
                            class:inbox2-pill--chain={p.chain}
                            class:inbox2-pill--bare={!p.icon}
                            aria-pressed={!!p.on}
                            onclick={() => onpill?.(p.key, ri)}
                        >
                            {#if p.icon}<img src={p.icon} alt="" />{/if}
                            {p.label}
                        </button>
                    </span>
                {/each}
                {#if ri === 0 && pillsEnd}
                    <span class="inbox2-pill-div"></span>
                    {@render pillsEnd()}
                {/if}
            </div>
        {/each}
        {#if rows.length}
            <div class="inbox2-search">
                <div class="inbox2-search-field">
                    <SearchInput bind:value={query} {placeholder} {clearLabel} />
                </div>
                {@render searchEnd?.()}
            </div>
            {@render below?.()}
        {/if}
        {#if buttons.length}
            <div class="inbox2-actions">
                {#each buttons as b (b.label)}
                    <div class="inbox2-slot" class:inbox2-slot--hug={b.hug}>
                        {#if b.gold}
                            <FancyButton size="md" href={b.href} onclick={b.onclick} ariaLabel={b.aria} icon={b.icon}>{b.label}</FancyButton>
                        {:else}
                            <svelte:element this={b.href ? "a" : "button"} type={b.href ? undefined : "button"} href={b.href} class="inbox2-newmap" class:inbox2-newmap--ring={b.ring} aria-label={b.aria} onclick={b.onclick} role={b.href ? "link" : "button"}>
                                <span class="inbox2-newmap-badge">{@render b.icon()}</span>
                                <span class="inbox2-newmap-label">{b.label}</span>
                            </svelte:element>
                        {/if}
                    </div>
                {/each}
            </div>
        {/if}
    </div>
{/if}

<style>
/* Deliberately non-sticky: sticky chrome clipped the back button and
   fought dragged-row transforms. */
.inbox2-chrome {
    display: flex;
    flex-direction: column;
    gap: var(--rt-space-2);
    padding: var(--rt-space-3) 0 var(--rt-space-2);
}

/* The trash is the row's last stop: you scroll all the way right to reach it. */
.inbox2-pills {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 2px 28px 2px 0;
    overflow-x: auto;
    scrollbar-width: none;
    -webkit-mask-image: linear-gradient(90deg, #000 84%, transparent);
    mask-image: linear-gradient(90deg, #000 84%, transparent);
}
.inbox2-pill-slot {
    flex: none;
    display: flex;
    align-items: center;
    gap: 6px;
}
.inbox2-pill-sep {
    flex: none;
    display: flex;
    color: var(--rt-row-sep);
}
.inbox2-pills::-webkit-scrollbar {
    display: none;
}
.inbox2-pill {
    flex: none;
    display: flex;
    align-items: center;
    gap: 6px;
    height: 40px;
    padding: 0 13px 0 8px;
    border: 0;
    border-radius: 20px;
    background: transparent;
    box-shadow: inset 0 0 0 1.6px color-mix(in srgb, var(--palette-terracotta-hint) 60%, transparent);
    color: var(--palette-terracotta-hint);
    font-family: var(--rt-font-body);
    font-size: 13.5px;
    font-weight: 700;
    letter-spacing: 0.4px;
    text-transform: uppercase;
    white-space: nowrap;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition: background 150ms ease;
}
/* With no icon the label sits in the middle. */
.inbox2-pill--bare {
    padding: 0 16px;
}
.inbox2-pill--chain {
    color: var(--rt-cream);
}
.inbox2-pill img {
    width: 26px;
    height: 26px;
    object-fit: contain;
}
/* theme.css inks every [aria-pressed] for a gold FILL; this pill is only tinted. */
.inbox2-pill.inbox2-pill--on,
.inbox2-pill.inbox2-pill--on * {
    color: var(--rt-yellow) !important;
    text-shadow: none;
}
.inbox2-pill--on {
    background: color-mix(in srgb, var(--rt-yellow) 14%, transparent);
    box-shadow: inset 0 0 0 2px var(--rt-yellow);
}
.inbox2-pill-div {
    flex: none;
    width: 2px;
    height: 26px;
    margin: 0 3px;
    border-radius: 1px;
    background: color-mix(in srgb, var(--rt-cream) 22%, transparent);
}

.inbox2-search {
    display: flex;
    align-items: stretch;
    gap: var(--rt-space-2);
}
.inbox2-search-field {
    flex: 1;
    min-width: 0;
}

.inbox2-actions {
    display: flex;
    align-items: stretch;
    gap: var(--rt-space-2);
}
.inbox2-slot {
    flex: 1 1 0;
    min-width: 0;
    display: flex;
}
.inbox2-slot--hug {
    flex: none;
}

/* Geometry: keep in sync with FancyButton's .fb + .size-md. */
.inbox2-newmap {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    gap: 10px;
    padding: 0.7rem 1rem;
    font-size: 1.25rem;
    font-weight: 500;
    font-family: "Retreever", sans-serif;
    border-radius: 0.75rem;
    background: transparent;
    border: 1px solid var(--rt-cream);
    box-shadow: 0 2px 0 rgba(0, 0, 0, 0.25);
    cursor: pointer;
    box-sizing: border-box;
    text-decoration: none;
    -webkit-tap-highlight-color: transparent;
    transition:
        transform 80ms ease,
        background 80ms ease;
}
/* Beats the global `body.mobile-app span` colour rules. */
.inbox2-newmap,
.inbox2-newmap .inbox2-newmap-label,
.inbox2-newmap .inbox2-newmap-badge {
    color: var(--rt-cream);
}
.inbox2-newmap--ring {
    background: #000;
    border: 2px solid var(--rt-yellow);
}
.inbox2-newmap--ring .inbox2-newmap-label {
    color: var(--rt-yellow);
}
.inbox2-newmap:active {
    background: rgba(255, 255, 255, 0.1);
    transform: translateY(1px);
}
.inbox2-newmap-label {
    display: inline-block;
}
/* Sized by its icon: a fixed box squashed any wider mark. */
.inbox2-newmap-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 24px;
    min-height: 24px;
    flex-shrink: 0;
}
</style>
