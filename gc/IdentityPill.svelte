<script lang="ts" module>
/** A person as every surface draws them. `picked`: the book owner chose this
 *  colour (filled); otherwise it was handed out on arrival (dashed outline). */
export type Identity = { label: string; color: string; self: boolean; picked: boolean };
</script>

<script lang="ts">
import { m } from "$parent/src/lib/paraglide/messages";
import Icon from "./Icon.svelte";

/** One pill, one fact. `clobber`: someone other than the owner changed it — the
 *  hammer, then who did it. `edited`: the owner saved it again — a grey pen.
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
{#if clobber}
<span class="id-pill id-pill--hammer" title={m.gc_edit_replaced()}><Icon name="hammer" size={10} stroke={2.6} />{who.label}{#if times}&nbsp;{times}{/if}</span>
{:else if edited}
<span class="id-pill id-pill--pen" title={m.gc_edited_since_made()}><Icon name="pen" size={10} />{times || "×1"}</span>
{:else}
<span
    class="id-pill"
    class:id-pill--picked={who.picked && !who.self}
    class:id-pill--self={who.self}
    style:--id-c={who.color || null}
    title={who.label}>{who.label}</span
>
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
    .id-pill--hammer {
        border: 0;
        background: #4a2a1f;
        color: var(--rust);
        font-size: 0.72rem;
    }
    .id-pill--pen {
        border: 1px solid #555;
        background: none;
        color: #bbb;
    }
</style>
