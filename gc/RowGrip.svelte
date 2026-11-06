<!-- A row's drag grip. It sits in the row's track: a 1.5rem strip right of the card, grey when the row can move. -->
<script lang="ts">
import type { Attachment } from "svelte/attachments";

let { attach, label, dragging = false }: { attach: Attachment<HTMLElement>; label: string; dragging?: boolean } = $props();
</script>

<div class="inbox2-handle" class:inbox2-handle--dragging={dragging} {@attach attach} aria-label={label} role="button" tabindex="0">
    {#each { length: 8 } as _, n (n)}<div class="inbox2-grip"></div>{/each}
</div>

<style>
/* The track: the grip lives in it, so the card reserves no space of its own. */
:global(.rt-row-track) {
    position: relative;
    border-radius: var(--rt-radius-lg);
    padding-right: var(--rt-row-grip-w, 1.5rem);
    --rt-row-handle-reserve: 0;
}
/* A strip with no dots reads as a broken handle, so only a draggable row has one. */
:global(.rt-row-track--grip) {
    background: #666;
}
:global(.rt-row-track--dragging) {
    z-index: 5;
    box-shadow: 0 0 0 2px rgba(255, 215, 0, 0.5);
}
.inbox2-handle {
    /* Exactly the strip, so the dots sit centred in it however wide a host makes it. */
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    width: var(--rt-row-grip-w, 1.5rem);
    z-index: 4;
    display: grid;
    grid-template-columns: 5px 5px;
    gap: 5px 4px;
    align-content: center;
    justify-content: center;
    cursor: grab;
    touch-action: none;
    -webkit-tap-highlight-color: transparent;
    -webkit-user-select: none;
    user-select: none;
    background: transparent;
    border: 0;
}
.inbox2-handle:active {
    cursor: grabbing;
}
.inbox2-grip {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.35);
}
.inbox2-handle--dragging .inbox2-grip {
    background: rgba(255, 215, 0, 0.6);
}
</style>
