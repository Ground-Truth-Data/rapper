<!-- A calculated difference ("vs allocated"), nested under the thing it compares: rose when over, teal when under. -->
<script lang="ts">
import NestPill from "./NestPill.svelte";

let { label, n, text = Math.abs(n).toLocaleString() }: { label: string; n: number; /** |n| in the host's locale. */ text?: string } = $props();
</script>

<NestPill detail dotted>
    {label}
    {#snippet values()}<span class="nest-value" class:up={n > 0} class:dn={n < 0}>{n > 0 ? "+" : n < 0 ? "−" : ""}{text}</span>{/snippet}
</NestPill>

<style>
.up {
    color: var(--rt-q704-over);
}
.dn {
    color: var(--rt-q704-under);
}
</style>
