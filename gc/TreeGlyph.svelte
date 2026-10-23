<!-- The Get Cache tree, filled with the text colour around it (gold, white, grey). -->
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
        vertical-align: -0.1em;
        background: currentColor;
        mask: var(--tg) center / contain no-repeat;
    }
</style>
