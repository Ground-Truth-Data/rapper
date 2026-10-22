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
 * A map press (doubleTapToPin.ts emits `gc-press`) turns the hand gold and
 * fills a HoldRing under the pointer, with a Loupe above it showing the map
 * there magnified, ring and all; held still it fires the snake ruler where
 * the pointer lifts. Moving past slop drops the ring and the hand opens,
 * then fists, for the rest of that press. Mouse and finger behave the same,
 * so the desktop rehearses the phone; on touch the hand shows only during a
 * map press, and a press the map claims (a feature to open, a popover to
 * close) shows nothing unless it becomes a drag or a hold.
 */
import { onMount } from "svelte";
import HoldRing from "./HoldRing.svelte";
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
const RETRACT_MS = 300;
// A plain click never sees the ring: it shows from three o'clock on.
const SHOW_AT = 3 / 12;
const RING_SCALE = 0.6;

let el: HTMLDivElement | undefined = $state();
let frame: Frame = $state("point");
let pressing = $state(false);
// The press under the pointer: its ring, the map canvas the loupe reads, and once the hold lands, where it would commit.
let ring: { x: number; y: number; progress: number; done: boolean; src: HTMLCanvasElement; label: string } | null =
	$state(null);

$effect(() => {
	document.body.classList.toggle("gc-map-pressing", pressing);
});

onMount(() => {
	document.body.classList.add("shovel-cursor");
	let frameTimer: ReturnType<typeof setTimeout> | undefined;
	let raf = 0;
	let dragging = false;

	const place = (x: number, y: number) => {
		if (!el) return;
		el.style.transform = `translate3d(${x - HOTSPOT_X}px, ${y - HOTSPOT_Y}px, 0)`;
		if (el.style.visibility !== "visible") el.style.visibility = "visible";
	};
	// Linear from `from` to `to` over `ms`, then `then`.
	const animateRing = (from: number, to: number, ms: number, then?: () => void) => {
		cancelAnimationFrame(raf);
		const t0 = performance.now();
		const step = (t: number) => {
			if (!ring) return;
			const f = Math.min(1, (t - t0) / ms);
			ring.progress = from + (to - from) * f;
			if (ring.progress >= SHOW_AT) pressing = true;
			if (f < 1) raf = requestAnimationFrame(step);
			else then?.();
		};
		raf = requestAnimationFrame(step);
	};
	const dropRing = () => {
		cancelAnimationFrame(raf);
		ring = null;
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
		const { phase, x, y, ms, canvas, label = "", veiled = false } = (
			e as CustomEvent<{
				phase: "arm" | "drag" | "end" | "aim" | "drop";
				x: number;
				y: number;
				ms: number;
				canvas?: HTMLCanvasElement;
				label?: string;
				veiled?: boolean;
			}>
		).detail;
		if (phase === "arm" && canvas) {
			clearTimeout(frameTimer);
			dropRing();
			dragging = false;
			pressing = !veiled;
			frame = "gold";
			place(x, y);
			ring = { x, y, progress: 0, done: false, src: canvas, label: "" };
			animateRing(0, 1, ms);
		} else if (phase === "drag") {
			dropRing();
			clearTimeout(frameTimer);
			dragging = true;
			pressing = true;
			frame = "open";
			frameTimer = setTimeout(() => (frame = "fist"), GRAB_OPEN_MS);
		} else if (phase === "aim") {
			if (!ring) return;
			if (!ring.done) navigator.vibrate?.(10);
			cancelAnimationFrame(raf);
			ring = { ...ring, x, y, progress: 1, done: true, label };
		} else if (phase === "end") {
			if (!ring) return;
			if (ring.done || ring.progress < SHOW_AT) dropRing();
			else animateRing(ring.progress, SHOW_AT, RETRACT_MS, dropRing);
		} else dropRing();
	};

	const onMouseMove = (e: MouseEvent) => place(e.clientX, e.clientY);
	const onTouchMove = (e: TouchEvent) => {
		const t = e.touches[0];
		if (pressing && t) place(t.clientX, t.clientY);
	};
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
	// pointerup, not mouseup: a ruler handle's preventDefault on pointerdown swallows the mouseup.
	const onPointerUp = (e: PointerEvent) => e.pointerType === "mouse" && e.button === 0 && release();
	const onTouchEnd = (e: TouchEvent) => e.touches.length === 0 && release();

	window.addEventListener("mousemove", onMouseMove, { passive: true });
	window.addEventListener("mousedown", onMouseDown, { passive: true });
	window.addEventListener("pointerup", onPointerUp, { passive: true });
	window.addEventListener("touchmove", onTouchMove, { passive: true, capture: true });
	window.addEventListener("touchend", onTouchEnd, { passive: true });
	window.addEventListener("touchcancel", onTouchEnd, { passive: true });
	window.addEventListener("gc-press", onPress);
	document.addEventListener("mouseleave", onMouseLeave);

	return () => {
		clearTimeout(frameTimer);
		cancelAnimationFrame(raf);
		window.removeEventListener("mousemove", onMouseMove);
		window.removeEventListener("mousedown", onMouseDown);
		window.removeEventListener("pointerup", onPointerUp);
		window.removeEventListener("touchmove", onTouchMove, true);
		window.removeEventListener("touchend", onTouchEnd);
		window.removeEventListener("touchcancel", onTouchEnd);
		window.removeEventListener("gc-press", onPress);
		document.removeEventListener("mouseleave", onMouseLeave);
		document.body.classList.remove("shovel-cursor", "gc-map-pressing");
	};
});
</script>

<!-- Hidden until the first mousemove places it. -->
<div bind:this={el} class="fake-cursor" data-frame={frame} style="visibility: hidden">
	{#each FRAMES as [name, src] (name)}
		<img class="fake-cursor-{name}" {src} alt="" draggable="false" />
	{/each}
</div>

{#if ring && ring.progress >= SHOW_AT}
	<div class="hold-ring-at" style="left:{ring.x}px; top:{ring.y}px; transform: translate(-50%, -50%) scale({RING_SCALE})">
		<HoldRing progress={ring.progress} done={ring.done} />
	</div>
	<Loupe src={ring.src} x={ring.x} y={ring.y} label={ring.label}>
		<div style="transform: scale({RING_SCALE})">
			<HoldRing progress={ring.progress} done={ring.done} />
		</div>
	</Loupe>
{/if}
