<!-- A tree and its number, one unit that never breaks: the tree stands on the digits' baseline, a hair to
     their left, sized by the text around it. `n` arrives formatted. `label` is the small word over the number. -->
<script lang="ts">
import type { HTMLAttributes } from "svelte/elements";
import TreeGlyph from "./TreeGlyph.svelte";

let { n, label, ...rest }: { n: string | number; label?: string } & HTMLAttributes<HTMLSpanElement> = $props();
</script>

<span class="tc" {...rest}><TreeGlyph /><span class="tc-n" data-label={label}>{n}</span></span>

<style>
    .tc {
        flex: none;
        display: inline-flex;
        align-items: baseline;
        white-space: nowrap;
        font-variant-numeric: tabular-nums;
    }
    /* The label hangs over the number without becoming the unit's baseline, or part of its text. */
    .tc-n[data-label] {
        position: relative;
        padding-top: 11px;
    }
    .tc-n[data-label]::before {
        content: attr(data-label);
        position: absolute;
        top: 0;
        left: 50%;
        translate: -50%;
        font: 600 9px/1 var(--rt-font-meta);
        letter-spacing: 0.02em;
        color: var(--rust);
    }
</style>
