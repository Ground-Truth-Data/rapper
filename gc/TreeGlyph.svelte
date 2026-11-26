<!-- The Get Cache tree, filled with the text colour around it (gold, white, grey). A host counting
     something else (cones) sets --thing-glyph on an ancestor. -->
<script lang="ts">
import tree from "./assets/tree_white.webp";
</script>

<i class="tg" style:--tg="url({tree})" aria-hidden="true"></i>

<style>
    .tg {
        display: inline-block;
        width: var(--thing-w, 0.62em);
        height: 0.95em;
        margin-right: 0.18em;
        flex: none;
        background: currentColor;
        /* Drawn from the box's bottom edge, which is the text baseline: the tree stands on the line. */
        mask: var(--thing-glyph, var(--tg)) bottom / contain no-repeat;
    }
</style>
