<script lang="ts" module>
/** A person as every surface draws them. `picked`: the book owner chose this
 *  colour (filled); otherwise it was handed out on arrival (dashed outline). */
export type Identity = { label: string; color: string; self: boolean; picked: boolean; key?: string };
/** One editor's saves after it was made. */
export type EditMark = { who: Identity; count: number };
</script>

<script lang="ts">
import { m } from "$parent/src/lib/paraglide/messages";
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
</script>

<!-- Dashed = a colour handed out on arrival, still unstyled; filled = chosen
     on purpose. Only you wear a solid gold outline. The editor's half is their
     own pill untouched — only its left corners square off to join. -->
{#snippet own(p: Identity, label = p.label)}<span
    class="id-pill"
    class:id-pill--picked={p.picked && !p.self}
    class:id-pill--self={p.self}
    style:--id-c={p.color || null}
    title={p.label}>{label}</span
>{/snippet}
{#if !marks.some((e) => same(e.who, who))}{@render own(who)}{/if}
{#each marks as e (e.who.key ?? e.who.label)}
    {@const hammer = !!clobberBy && same(e.who, clobberBy)}
    <span class="id-mark" title={hammer ? m.gc_edit_replaced() : m.gc_edited_since_made()}
        ><span class="id-mark-half" class:id-mark-half--hammer={hammer}><Icon name={hammer ? "hammer" : "pen"} size={10} stroke={2.6} /></span
        >{@render own(e.who, e.count > 1 ? `${e.who.label} ×${e.count}` : e.who.label)}</span
    >
{/each}

<style>
    .id-pill {
        --id-ink: var(--id-c, var(--rt-row-sender, #c3c8ac));
        display: inline-flex;
        align-items: center;
        flex: none;
        gap: 3px;
        max-width: 9rem;
        height: 1.15rem;
        padding: 0 0.45rem;
        box-sizing: border-box;
        border: 2px dashed var(--id-ink);
        border-radius: 999px;
        /* Dashed ink alone washes out on the steel buttons it sits on. */
        background: #111;
        color: var(--id-ink);
        font-family: var(--rt-font-body);
        font-size: 0.7rem;
        font-weight: 700;
        line-height: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .id-pill--picked {
        border-style: solid;
        background: var(--id-ink);
        color: #14150c;
    }
    .id-pill--self {
        border-style: solid;
        font-weight: 800;
    }
    .id-mark {
        display: inline-flex;
        flex: none;
        max-width: 9rem;
    }
    .id-mark-half {
        display: inline-flex;
        align-items: center;
        flex: none;
        height: 1.15rem;
        padding: 0 4px 0 6px;
        border-radius: 999px 0 0 999px;
        background: #555;
        color: #eee;
    }
    .id-mark-half--hammer {
        background: var(--rust);
        color: #1a1a1a;
    }
    .id-mark .id-pill {
        min-width: 0;
        border-radius: 0 999px 999px 0;
    }
</style>
