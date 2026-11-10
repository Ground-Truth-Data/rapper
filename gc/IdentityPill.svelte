<script lang="ts" module>
/** A person as every surface draws them. `picked`: the book owner chose this
 *  colour (filled); otherwise it was handed out on arrival (dashed outline). */
export type Identity = { label: string; color: string; self: boolean; picked: boolean; key?: string };
/** One editor's saves after it was made. */
export type EditMark = { who: Identity; count: number };
</script>

<script lang="ts">
import { m } from "$parent/src/lib/paraglide/messages";
import { SvelteSet } from "svelte/reactivity";
import Icon from "./Icon.svelte";

/** The owner, then one joined pill per editor: a pen half for their saves (×n), a rust hammer half on
 *  `clobberBy`, whose version beat yours. An owner who edited is one joined pill, never two. */
let {
    who,
    editors = [],
    clobberBy = null,
}: { who: Identity; editors?: readonly EditMark[]; clobberBy?: Identity | null } = $props();

// Keyless people match by label, as the #each below keys them; otherwise one person draws twice and the each throws.
const same = (a: Identity, b: Identity) => (a.self && b.self) || (a.key || b.key ? a.key === b.key : a.label === b.label);
const marks = $derived.by(() => {
    const all = clobberBy && !editors.some((e) => same(e.who, clobberBy)) ? [{ who: clobberBy, count: 0 }, ...editors] : [...editors];
    return all.sort((a, b) => Number(same(b.who, who)) - Number(same(a.who, who)));
});

// A name cut short by its cell reads whole on a tap, in place; the tap is the pill's, not the row's under it.
const full = new SvelteSet<string>();
function read(e: MouseEvent, label: string) {
    const el = e.currentTarget as HTMLElement;
    if (!full.has(label) && el.scrollWidth <= el.clientWidth) return;
    e.stopPropagation();
    if (!full.delete(label)) full.add(label);
}
</script>

<!-- Dashed = a colour handed out on arrival, still unstyled; filled = chosen
     on purpose. Only you wear a solid gold outline. The editor's half is their
     own pill untouched — only its left corners square off to join. -->
{#snippet own(p: Identity, label = p.label, count = 0)}<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions --><span
    class="id-pill"
    class:id-pill--full={full.has(label)}
    onclick={(e) => read(e, label)}
    class:id-pill--picked={p.picked && !p.self}
    class:id-pill--self={p.self}
    style:--id-c={p.color || null}
    title={p.label}>{label}{#if count > 1}{" "}<span class="id-count">×{count}</span>{/if}</span
>{/snippet}
{#if !marks.some((e) => same(e.who, who))}{@render own(who)}{/if}
{#each marks as e (e.who.key ?? e.who.label)}
    {@const hammer = !!clobberBy && same(e.who, clobberBy)}
    <span class="id-mark" title={hammer ? m.gc_edit_replaced() : m.gc_edited_since_made()}
        ><span class="id-mark-half" class:id-mark-half--hammer={hammer}><Icon name={hammer ? "hammer" : "pen"} size={9} stroke={2.2} /></span
        >{@render own(e.who, e.who.label, e.count)}</span
    >
{/each}

<style>
    .id-pill {
        --id-ink: var(--id-c, var(--rt-row-sender, #c3c8ac));
        /* inline-block, not flex: a flex box clips the name but never draws its …. */
        display: inline-block;
        vertical-align: middle;
        flex: none;
        max-width: min(9rem, 100%);
        height: 1rem;
        padding: 0 0.35rem;
        box-sizing: border-box;
        border: 1.5px dashed var(--id-ink);
        border-radius: 999px;
        /* Dashed ink alone washes out on the steel buttons it sits on. */
        background: #111;
        color: var(--id-ink);
        font-family: var(--rt-font-body);
        font-size: 0.68rem;
        font-weight: 600;
        line-height: calc(1rem - 3px);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .id-pill--full {
        height: auto;
        min-height: 1rem;
        padding-block: 2px;
        border-radius: 0.6rem;
        white-space: normal;
        overflow-wrap: anywhere;
        line-height: 1.15;
    }
    .id-pill--picked {
        border-style: solid;
        background: var(--id-ink);
        color: #14150c;
    }
    .id-pill--self {
        border-style: solid;
        font-weight: 700;
    }
    .id-count {
        font-size: 0.85em;
        font-weight: 600;
    }
    .id-mark {
        display: inline-flex;
        flex: none;
        max-width: min(9rem, 100%);
    }
    .id-mark-half {
        display: inline-flex;
        align-items: center;
        flex: none;
        height: 1rem;
        padding: 0 3px 0 5px;
        box-sizing: border-box;
        border: 1.5px solid #eee;
        border-right: 0;
        border-radius: 999px 0 0 999px;
        background: #555;
        color: #eee;
    }
    .id-mark-half--hammer {
        background: var(--rust);
        color: #1a1a1a;
    }
    .id-mark .id-pill {
        flex: 0 1 auto;
        min-width: 0;
        border-radius: 0 999px 999px 0;
    }
</style>
