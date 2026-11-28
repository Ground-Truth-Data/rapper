<script lang="ts" module>
/** A person as every surface draws them. `picked`: the book owner chose this
 *  colour (filled); otherwise it was handed out on arrival (dashed outline). */
export type Identity = { label: string; color: string; self: boolean; picked: boolean; key?: string };

/** You are always this gold, whatever your row holds. */
export const SELF_GOLD = "#e8c53a";

/** One person once: the same key (a folded twin resolves to its person's), the self, or a keyless label. */
export const samePerson = (a: Identity, b: Identity) => (a.self && b.self) || (a.key || b.key ? a.key === b.key : a.label === b.label);

/** Pills for a list, each person once, keyed `(w.key ?? w.label)`: two people may share a name, never a key. */
export const onePerPerson = (ws: readonly Identity[]): Identity[] => ws.filter((w, i) => ws.findIndex((o) => samePerson(o, w)) === i);

/** THE cut of a person's name, everywhere one is drawn: over 12 characters, its first 12 and an ellipsis. */
export const nameCut = (name: string) => (name.length > 12 ? `${name.slice(0, 12)}…` : name);
</script>

<script lang="ts">
import { m } from "$parent/src/lib/paraglide/messages";
import { SvelteSet } from "svelte/reactivity";
import Icon from "./Icon.svelte";
import { inPill } from "./NestPill.svelte";

/** The owner, then one joined pill per editor: a pen half for having saved it again, a rust hammer half on
 *  `clobberBy`, whose version beat yours. An owner who edited is one joined pill, never two. */
let {
    who,
    editors = [],
    clobberBy = null,
}: { who: Identity; editors?: readonly Identity[]; clobberBy?: Identity | null } = $props();

// A nameless author is no one (a file the old map import signed with): no pill, no pen.
const marks = $derived(
    onePerPerson((clobberBy ? [clobberBy, ...editors] : editors).filter((e) => e.label)).sort((a, b) => Number(samePerson(b, who)) - Number(samePerson(a, who))),
);

// A cut name reads whole on a tap, in place; the tap is the pill's, not the row's under it.
const full = new SvelteSet<string>();
const still = inPill();
function read(e: MouseEvent, label: string) {
    if (nameCut(label) === label) return;
    e.stopPropagation();
    if (!full.delete(label)) full.add(label);
}
</script>

<!-- Dashed = a colour handed out on arrival, still unstyled; filled = chosen
     on purpose. Only you wear a solid gold outline. The editor's half is their
     own pill untouched — only its left corners square off to join. -->
{#snippet own(p: Identity, label = p.label)}<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions --><span
    class="id-pill"
    class:id-pill--full={full.has(label)}
    onclick={still ? undefined : (e) => read(e, label)}
    class:id-pill--picked={p.picked && !p.self}
    class:id-pill--self={p.self}
    style:--id-c={p.self ? SELF_GOLD : p.color || null}
    title={p.label}>{full.has(label) ? label : nameCut(label)}</span
>{/snippet}
{#if who.label && !marks.some((e) => samePerson(e, who))}{@render own(who)}{/if}
{#each marks as e (e.key ?? e.label)}
    {@const hammer = !!clobberBy && samePerson(e, clobberBy)}
    <span class="id-mark" title={hammer ? m.gc_edit_replaced() : m.gc_edited_since_made()}
        ><span class="id-mark-half" class:id-mark-half--hammer={hammer}><Icon name={hammer ? "hammer" : "pen"} size={hammer ? 11 : 9} stroke={2.2} /></span
        >{@render own(e)}</span
    >
{/each}

<style>
    .id-pill {
        --id-ink: var(--id-c, var(--rt-row-sender, #c3c8ac));
        display: inline-block;
        vertical-align: middle;
        flex: none;
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
    }
    .id-pill--full {
        max-width: 100%;
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
    .id-mark {
        display: inline-flex;
        flex: none;
        max-width: 100%;
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
        border-color: var(--rust);
        background: #111;
        color: var(--rust);
    }
    .id-mark .id-pill {
        border-radius: 0 999px 999px 0;
    }
</style>
