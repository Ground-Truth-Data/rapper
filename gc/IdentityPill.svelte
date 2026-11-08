<script lang="ts" module>
/** A person as every surface draws them. `picked`: the book owner chose this
 *  colour (filled); otherwise it was handed out on arrival (dashed outline). */
export type Identity = { label: string; color: string; self: boolean; picked: boolean };
</script>

<script lang="ts">
import { m } from "$parent/src/lib/paraglide/messages";
import Icon from "./Icon.svelte";

/** One pill, one fact. `clobber`: someone other than the owner changed it — a rust
 *  hammer half joined to the editor's own pill, so their colour still says who. `edited`: the owner saved it again — a grey pen.
 *  Either sits beside the owner's own pill, never joined to it. */
let {
    who,
    clobber = false,
    edited = false,
    count = 0,
}: { who: Identity; clobber?: boolean; edited?: boolean; count?: number } = $props();
const times = $derived(count > 1 ? `×${count}` : "");
</script>

<!-- Dashed = a colour handed out on arrival, still unstyled; filled = chosen
     on purpose. Only you wear a solid gold outline. -->
{#snippet own(label: string)}<span
    class="id-pill"
    class:id-pill--picked={who.picked && !who.self}
    class:id-pill--self={who.self}
    style:--id-c={who.color || null}
    title={who.label}>{label}</span
>{/snippet}
{#if clobber}
<span class="id-hammer" title={m.gc_edit_replaced()}><span class="id-hammer-half"><Icon name="hammer" size={10} stroke={2.6} /></span>{@render own(times ? `${who.label} ${times}` : who.label)}</span>
{:else if edited}
<span class="id-pill id-pill--pen" title={m.gc_edited_since_made()}><Icon name="pen" size={10} />{times || "×1"}</span>
{:else}
{@render own(who.label)}
{/if}

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
    .id-hammer {
        display: inline-flex;
        flex: none;
        max-width: 9rem;
    }
    .id-hammer-half {
        display: inline-flex;
        align-items: center;
        flex: none;
        height: 1.15rem;
        padding: 0 4px 0 6px;
        border-radius: 999px 0 0 999px;
        background: var(--rust);
        color: #1a1a1a;
    }
    .id-hammer .id-pill {
        min-width: 0;
        border-radius: 0 999px 999px 0;
    }
    .id-pill--pen {
        border: 1px solid #555;
        background: none;
        color: #bbb;
    }
</style>
