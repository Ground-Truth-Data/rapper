<!--
  Checkbox — small square checkbox. Used inside RowCard, popovers, etc.
  Token-driven: terracotta when checked (mode-indicator) by default.
-->
<script lang="ts">
import Icon from "./Icon.svelte";

type Props = {
	checked?: boolean;
	/** Third state — the box stays LIT with a dash instead of flipping
	 *  empty. "Some, not all" for a master checkbox; it never claims the
	 *  full set. `checked` wins when both are set. */
	indeterminate?: boolean;
	size?: number;
	accent?: "rust" | "yellow";
};
let {
	checked = false,
	indeterminate = false,
	size = 16,
	accent = "rust",
}: Props = $props();
</script>

<span
    class="rt-cb rt-cb--{accent}"
    class:rt-cb--on={checked || indeterminate}
    style="--rt-cb-size: {size}px"
    aria-hidden="true"
>
    {#if checked}
        <Icon name="check-bold" size={size * 0.65} />
    {:else if indeterminate}
        <span class="rt-cb__dash"></span>
    {/if}
</span>

<style>
    .rt-cb {
        width: var(--rt-cb-size);
        height: var(--rt-cb-size);
        border-radius: 4px;
        border: 1.5px solid var(--rt-border-active);
        background: rgba(0, 0, 0, 0.4);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: var(--rt-bg);
        flex-shrink: 0;
    }
    .rt-cb--rust.rt-cb--on {
        background: var(--rt-rust);
        border-color: var(--rt-rust);
    }
    .rt-cb--yellow.rt-cb--on {
        background: var(--rt-yellow);
        border-color: var(--rt-yellow);
        color: var(--rt-gold-ink);
    }
    /* Indeterminate dash — inherits the checked state's ink colour. */
    .rt-cb__dash {
        width: 58%;
        height: 2px;
        border-radius: 2px;
        background: currentColor;
    }
</style>
