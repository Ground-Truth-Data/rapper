<!-- The Get Cache tree, filled with the text colour around it (gold, white, grey). A host counting
     something else (cones) sets --thing-glyph on an ancestor. -->
<script lang="ts">
import tree from "./assets/tree_white.webp";
</script>

<i class="tg" style:--tg="url({tree})" aria-hidden="true"></i>

<style>
    .tg {
        display: inline-block;
        width: 0.62em;
        height: 0.95em;
        margin-right: 0.18em;
        /* A margin, not vertical-align: it also holds in a baseline-aligned flex row. */
        flex: none;
        margin-bottom: -0.1em;
        background: currentColor;
        mask: var(--thing-glyph, var(--tg)) center / contain no-repeat;
    }
</style>
