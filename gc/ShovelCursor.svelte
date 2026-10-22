<script lang="ts" module>
/** The fingertip, in px from the image's top-left at the rendered 72×100. Every frame shares the one box, so it holds for all of them. */
export const HOTSPOT_X = 11;
export const HOTSPOT_Y = 5;
</script>

<script lang="ts">
/**
 * The hand-and-shovel pointer, drawn in the DOM in place of the OS cursor.
 * A CSS `cursor: url(...)` flickers against the OS-reported cursor under
 * screen recorders, so the native pointer is hidden (`body.shovel-cursor`
 * in mobile.css) and this is the only visible one. A click adds an
 * expanding ring, so a recorded tap shows WHEN as well as where.
 *
 * A map press (doubleTapToPin.ts emits `gc-press`) turns the hand gold.
 * Held a beat, a Loupe floats above the finger showing the map there
 * magnified, with a halo at the finger and a coordinate chip top-left; its
 * ruler ticks fill while the finger holds still, and the lift then seeds the
 * snake ruler under the finger. Moving early pans the map instead, and the
 * hand opens, then fists, for the rest of that press. Mouse and finger behave
 * the same, so the desktop rehearses the phone; on touch the hand shows only
 * during a map press, and a press the map claims (a feature to open, a
 * popover to close) shows nothing unless it becomes a drag or a hold.
 */
import { onMount } from "svelte";
import Loupe from "./Loupe.svelte";
import handPoint from "./assets/hand_point.webp";
import handOpen from "./assets/hand_open.webp";
import handFist from "./assets/hand_fist.webp";
import handGold from "./assets/hand_gold.webp";

type Frame = "point" | "open" | "fist" | "gold";
// All four stay mounted and decoded; swapping a src flickers under a recorder like the old CSS variants did.
const FRAMES: [Frame, string][] = [
	["point", handPoint],
	["open", handOpen],
	["fist", handFist],
	["gold", handGold],
];
// A drag's open hand: a flick as it grabs, a beat as it lets go.
const GRAB_OPEN_MS = 100;
const LET_GO_OPEN_MS = 250;
// The lens shrinks into the finger over 180 ms (Loupe.svelte); gone once that has played.
const LOUPE_OUT_MS = 200;

let el: HTMLDivElement | undefined = $state();
let frame: Frame = $state("point");
let pressing = $state(false);
// The hold under the finger: the map canvas the lens reads, and when the finger last came to rest.
let loupe: { x: number; y: number; src: HTMLCanvasElement; since: number; out: boolean } | null = $state(null);
// The coordinates, top-left of the map canvas rather than the window, so the desktop's phone frame holds it too.
let chip: { text: string; x: number; y: number } | null = $state(null);

$effect(() => {
	document.body.classList.toggle("gc-map-pressing", pressing);
});

onMount(() => {
	document.body.classList.add("shovel-cursor");
	let frameTimer: ReturnType<typeof setTimeout> | undefined;
	let outTimer: ReturnType<typeof setTimeout> | undefined;
	let dragging = false;

	const place = (x: number, y: number) => {
		if (!el) return;
		el.style.transform = `translate3d(${x - HOTSPOT_X}px, ${y - HOTSPOT_Y}px, 0)`;
		if (el.style.visibility !== "visible") el.style.visibility = "visible";
	};

	const release = () => {
		clearTimeout(frameTimer);
		if (!dragging) {
			frame = "point";
			pressing = false;
			return;
		}
		dragging = false;
		frame = "open";
		frameTimer = setTimeout(() => {
			frame = "point";
			pressing = false;
		}, LET_GO_OPEN_MS);
	};

	const onPress = (e: Event) => {
		const { phase, x, y, canvas, label = "", since = 0, locked = false, veiled = false } = (
			e as CustomEvent<{
				phase: "arm" | "drag" | "aim" | "end" | "drop";
				x: number;
				y: number;
				canvas?: HTMLCanvasElement;
				label?: string;
				since?: number;
				locked?: boolean;
				veiled?: boolean;
			}>
		).detail;
		if (phase === "arm") {
			clearTimeout(frameTimer);
			clearTimeout(outTimer);
			loupe = null;
			chip = null;
			dragging = false;
			pressing = !veiled;
			frame = "gold";
			place(x, y);
		} else if (phase === "drag") {
			clearTimeout(frameTimer);
			dragging = true;
			pressing = true;
			frame = "open";
			frameTimer = setTimeout(() => (frame = "fist"), GRAB_OPEN_MS);
		} else if (phase === "aim" && canvas) {
			pressing = true;
			loupe = { x, y, src: canvas, since, out: false };
			// The canvas runs under the top bar; MapTopControls measures that bar into --top-bar-h.
			const r = canvas.getBoundingClientRect();
			const bar = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--top-bar-h")) || 0;
			chip = { text: label, x: r.left + 14, y: r.top + bar + 8 };
		} else if (phase === "end") {
			if (loupe) {
				loupe.out = true;
				outTimer = setTimeout(() => (loupe = null), LOUPE_OUT_MS);
			}
			if (!locked) chip = null;
		} else {
			loupe = null;
			chip = null;
		}
	};

	// Pointer, not mouse, events: a ruler hand cancels its pointerdown, which silences the mouse events for that drag.
	const onPointerMove = (e: PointerEvent) => (e.pointerType === "mouse" || pressing) && place(e.clientX, e.clientY);
	const onMouseLeave = () => {
		if (el) el.style.visibility = "hidden";
	};
	// Appended to <body> and self-removing, so it needs no state and cannot leak.
	const onMouseDown = (e: MouseEvent) => {
		const splash = document.createElement("span");
		splash.className = "click-splash";
		splash.style.left = `${e.clientX}px`;
		splash.style.top = `${e.clientY}px`;
		splash.addEventListener("animationend", () => splash.remove());
		document.body.appendChild(splash);
	};
	const onPointerUp = (e: PointerEvent) => (e.pointerType !== "mouse" || e.button === 0) && release();

	window.addEventListener("pointermove", onPointerMove, { passive: true, capture: true });
	window.addEventListener("mousedown", onMouseDown, { passive: true });
	window.addEventListener("pointerup", onPointerUp, { passive: true });
	window.addEventListener("pointercancel", onPointerUp, { passive: true });
	window.addEventListener("gc-press", onPress);
	document.addEventListener("mouseleave", onMouseLeave);

	return () => {
		clearTimeout(frameTimer);
		clearTimeout(outTimer);
		window.removeEventListener("pointermove", onPointerMove, true);
		window.removeEventListener("mousedown", onMouseDown);
		window.removeEventListener("pointerup", onPointerUp);
		window.removeEventListener("pointercancel", onPointerUp);
		window.removeEventListener("gc-press", onPress);
		document.removeEventListener("mouseleave", onMouseLeave);
		document.body.classList.remove("shovel-cursor", "gc-map-pressing");
	};
});
</script>

<!-- Hidden until the first pointer move places it. -->
<div bind:this={el} class="fake-cursor" data-frame={frame} style="visibility: hidden">
	{#each FRAMES as [name, src] (name)}
		<img class="fake-cursor-{name}" {src} alt="" draggable="false" />
	{/each}
</div>

{#if loupe}
	{#if !loupe.out}
		<div class="touch-halo" style="left:{loupe.x}px; top:{loupe.y}px"></div>
	{/if}
	<Loupe src={loupe.src} x={loupe.x} y={loupe.y} since={loupe.since} out={loupe.out} />
{/if}
{#if chip}
	<div class="coord-chip" style="left:{chip.x}px; top:{chip.y}px">{chip.text}</div>
{/if}
