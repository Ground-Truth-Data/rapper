<!-- Repeating data under a pill, hung from it like a sack: no top edge, brass sides and grid, round bottom corners.
     Sits right after its pill in a NestGroup. Rows are `.ht-row`, one child per column. -->
<script lang="ts">
import type { Snippet } from "svelte";

/** `cols`: the grid's column widths, shared by every row. */
let { cols, children }: { cols: string; children: Snippet } = $props();
</script>

<div class="ht" style:grid-template-columns={cols}>{@render children()}</div>

<style>
.ht {
    --line: var(--brass);
    display: grid;
    /* Joined to the pill above; inset by the pill's corner radius so its sides start where the curve ends. */
    margin: calc(-1 * var(--nest-gap, 6px)) 14px 0;
    border: 1.5px solid var(--line);
    border-top: 0;
    border-radius: 0 0 12px 12px;
    overflow: hidden;
    background: #111;
    color: var(--rt-fg);
    font: 500 15px var(--rt-font-meta);
}
.ht :global(.ht-row) {
    display: grid;
    grid-column: 1 / -1;
    grid-template-columns: subgrid;
    min-height: 42px;
    margin: 0;
    padding: 0;
    border: 0;
    border-top: 1px solid var(--line);
    background: none;
    color: inherit;
    font: inherit;
    text-align: left;
}
.ht :global(.ht-row:first-child) {
    border-top: 0;
}
.ht :global(.ht-row > *) {
    display: flex;
    align-items: center;
    min-width: 0;
    box-sizing: border-box;
    padding: 0 7px;
}
.ht :global(.ht-row > * + *) {
    border-left: 1px solid var(--line);
}
.ht :global(.ht-row > :first-child) {
    font-weight: 600;
}
.ht :global(.ht-r) {
    justify-content: flex-end;
    gap: 4px;
    white-space: nowrap;
}
/* Two lines in one cell: a name over its tag, or two labelled people. */
.ht :global(.ht-stack) {
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    line-height: 1.1;
}
.ht :global(.ht-stack > *) {
    max-width: 100%;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
}
.ht :global(.ht-name) {
    color: var(--rt-yellow);
    font-size: 14px;
    font-weight: 600;
}
.ht :global(.ht-tag) {
    color: var(--rust);
    font-size: 11px;
    font-weight: 500;
}
.ht :global(.ht-small) {
    font-size: 13px;
}
.ht :global(.ht-money) {
    color: var(--rt-yellow);
}
.ht :global(.ht-people) {
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    gap: 4px;
    padding: 6px 9px;
}
.ht :global(.ht-people > *) {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
}
</style>
