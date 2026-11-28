<!-- A row of pins on a steel track, the current one bigger on a placard poking out of the top, like an odometer.
     Two halves and nothing else to tap: the host says what each does (the cache's next colour and its library,
     a block's previous and next cache). -->
<script lang="ts">
import { depthColor, listDepth } from "./NestPill.svelte";

let {
    items,
    current = 0,
    onleft,
    onright,
    leftLabel,
    rightLabel,
    more,
    color = depthColor(listDepth()),
}: {
    items: readonly { src: string; label?: string }[];
    /** Index of the pin on the placard. */
    current?: number;
    onleft?: () => void;
    onright?: () => void;
    leftLabel: string;
    rightLabel: string;
    /** The word at the far end, when the row is not all there is. */
    more?: string;
    /** The border; the depth colour unless the board says otherwise. */
    color?: string;
} = $props();
</script>

<div class="pr" style:--c={color} data-pinrow>
    {#each items as p, i (i)}
        <span class="pc" class:on={i === current}>
            <span class="plw"><img src={p.src} alt="" /></span>
            {#if p.label}<span class="pl">{p.label}</span>{/if}
        </span>
    {/each}
    {#if more}<span class="pc pm">{more}</span>{/if}
    <button type="button" class="half l" aria-label={leftLabel} disabled={!onleft} onclick={onleft}></button>
    <button type="button" class="half r" aria-label={rightLabel} disabled={!onright} onclick={onright}></button>
</div>

<style>
.pr {
    position: relative;
    display: flex;
    align-items: stretch;
    box-sizing: border-box;
    height: 64px;
    margin-top: 12px;
    padding: 0 6px 7px;
    border: 1.5px solid var(--c);
    border-radius: 20px;
    background: linear-gradient(180deg, #3a3a3a 0%, #2c2c2c 100%);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
}
.pc {
    flex: 1;
    min-width: 0;
    display: grid;
    grid-template-rows: minmax(0, 1fr) auto;
    justify-items: center;
    align-items: unsafe end;
    pointer-events: none;
}
.pc img {
    display: block;
    height: 46px;
    width: auto;
}
.plw {
    position: relative;
    display: block;
}
.on {
    flex: 1.3;
}
.on .plw::before {
    content: "";
    position: absolute;
    left: -1px;
    right: -1px;
    bottom: -3px;
    height: 82%;
    border-radius: 12px;
    background: var(--rt-btn-neutral-bg);
    box-shadow: 0 2px 0 #111, 0 3px 8px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.12);
}
.on img {
    position: relative;
    height: 74px;
    filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.7));
}
.pl {
    margin-top: 4px;
    color: #fff;
    font: 500 15px var(--rt-font-meta);
    text-shadow: 0 1px 0 #000;
}
.pm {
    align-self: center;
    display: flex;
    justify-content: center;
    color: var(--rt-yellow);
    font-family: var(--rt-font-display);
    font-size: 18px;
}
.half {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 50%;
    margin: 0;
    padding: 0;
    border: 0;
    background: none;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
}
.l {
    left: 0;
    border-radius: 18.5px 0 0 18.5px;
}
.r {
    right: 0;
    border-radius: 0 18.5px 18.5px 0;
}
.half:enabled:active {
    background: color-mix(in srgb, var(--rust) 28%, transparent);
}
.half:disabled {
    cursor: default;
}
</style>
