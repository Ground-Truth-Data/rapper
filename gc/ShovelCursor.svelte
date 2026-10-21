<script lang="ts">
/**
 * The hand-and-shovel, drawn in the DOM beside the OS arrow, never instead of
 * it. The pointer holds the shovel handle and the fingertip, up-left of it,
 * is what clicks. A map press (doubleTapToPin.ts emits `gc-press`) plants the
 * hand gold and fills a HoldRing on its fingertip; held still it fires the
 * snake ruler there. Moving past slop pans the map, and the hand opens,
 * then fists, riding the pointer. Let go and the hand stays LINGER_MS: grab
 * it by the palm to drag it anywhere, press it and hold to fire the ruler at
 * its fingertip. Mouse and finger behave the same, so the desktop rehearses
 * the phone. A press the map claims (a feature to open, a popover to close)
 * arrives `veiled`: the tap is the map's, and the hand shows only if the
 * press turns into a drag or a hold. A
 * click adds an expanding ring, so a recorded tap shows WHEN as well as where.
 */
import { onMount } from "svelte";
import HoldRing from "./HoldRing.svelte";
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
// Left on the map after a press, so a missed aim is dragged into place instead of pressed again.
const LINGER_MS = 2000;
// = SLOP_PX in doubleTapToPin.ts: past this a press on the hand is a drag, not a hold.
const SLOP_PX = 14;
// In px from the image's top-left at the rendered 72×100; every frame shares the one box.
const TIP_X = 11;
const TIP_Y = 5;
const GRIP_X = 50;
const GRIP_Y = 72;
// Pointer (on the grip) to fingertip. = TIP_DX/TIP_DY in doubleTapToPin.ts, which commits the hold there.
const REACH = { dx: TIP_X - GRIP_X, dy: TIP_Y - GRIP_Y };
// A tap on the hand this soon after the press that planted it is that press's double-click.
const DBL_MS = 500;
// A plain click never sees the ring: it shows from three o'clock on.
const SHOW_AT = 3 / 12;
// A finished ring stays this long after the lift: the hold landed and the ruler has taken over.
const FLASH_MS = 1000;

let el: HTMLDivElement | undefined = $state();
let palm: HTMLDivElement | undefined = $state();
let frame: Frame = $state("point");
let pressing = $state(false);
let linger = $state(false);
let ring: { x: number; y: number; progress: number; done: boolean; flash?: boolean } | null = $state(null);
// A completed hold: the ring rides the pointer with its coordinates until the lift commits.
let aim: { label: string } | null = $state(null);

$effect(() => {
	document.body.classList.toggle("gc-map-pressing", pressing);
});

onMount(() => {
	let frameTimer: ReturnType<typeof setTimeout> | undefined;
	let raf = 0;
	let dragging = false;
	// Where the fingertip was last put, and the hold length the map last armed with.
	let at = { x: 0, y: 0 };
	let holdMs = 1200;
	let releasedAt = 0;
	let veiled = false;
	// A press on the lingering hand: pointer-to-fingertip offset, and whether it has become a drag.
	let grab: { dx: number; dy: number; x0: number; y0: number; moved: boolean; timer: ReturnType<typeof setTimeout> } | null = null;

	const place = (x: number, y: number) => {
		if (!el) return;
		at = { x, y };
		el.style.transform = `translate3d(${x - TIP_X}px, ${y - TIP_Y}px, 0)`;
		el.style.visibility = veiled ? "hidden" : "visible";
	};
	const reveal = () => {
		veiled = false;
		if (el) el.style.visibility = "visible";
	};
	// Linear from `from` to `to` over `ms`, then `then`.
	const animateRing = (from: number, to: number, ms: number, then?: () => void) => {
		cancelAnimationFrame(raf);
		const t0 = performance.now();
		const step = (t: number) => {
			if (!ring) return;
			const f = Math.min(1, (t - t0) / ms);
			ring.progress = from + (to - from) * f;
			if (veiled && ring.progress >= SHOW_AT) reveal();
			if (f < 1) raf = requestAnimationFrame(step);
			else then?.();
		};
		raf = requestAnimationFrame(step);
	};
	const dropRing = () => {
		cancelAnimationFrame(raf);
		ring = null;
	};
	const flashRing = () => {
		cancelAnimationFrame(raf);
		ring = { ...at, progress: 1, done: true, flash: true };
		setTimeout(() => ring?.flash && (ring = null), FLASH_MS);
	};

	const hide = () => {
		clearTimeout(frameTimer);
		pressing = linger = false;
		frame = "point";
	};
	const release = () => {
		if (!pressing) return;
		if (veiled) return hide();
		clearTimeout(frameTimer);
		frame = dragging ? "open" : "point";
		dragging = false;
		releasedAt = performance.now();
		frameTimer = setTimeout(() => {
			frame = "point";
			linger = true;
			frameTimer = setTimeout(hide, LINGER_MS);
		}, LET_GO_OPEN_MS);
	};

	const onPress = (e: Event) => {
		const { phase, x, y, ms, label = "", veiled: onFeature = false } = (
			e as CustomEvent<{
				phase: "arm" | "drag" | "end" | "aim" | "drop";
				x: number;
				y: number;
				ms: number;
				label?: string;
				veiled?: boolean;
			}>
		).detail;
		if (phase === "aim") {
			if (!aim) {
				clearTimeout(frameTimer);
				cancelAnimationFrame(raf);
				navigator.vibrate?.(10);
			}
			pressing = true;
			frame = "point";
			aim = { label };
			ring = { x, y, progress: 1, done: true };
			place(x, y);
		} else if (phase === "drop") {
			dropRing();
			hide();
		} else if (phase === "end" && aim) {
			// The lift seeds the ruler; its own hand takes over from this one.
			aim = null;
			flashRing();
			hide();
		} else if (phase === "arm") {
			clearTimeout(frameTimer);
			dropRing();
			dragging = false;
			pressing = true;
			linger = false;
			holdMs = ms;
			veiled = onFeature;
			frame = "gold";
			place(x + REACH.dx, y + REACH.dy);
			ring = { ...at, progress: 0, done: false };
			animateRing(0, 1, ms);
		} else if (phase === "drag") {
			// Only a map press pans with the hand; a ruler handle's drag (no arm first) is its own hand.
			if (!pressing) return;
			dropRing();
			reveal();
			clearTimeout(frameTimer);
			dragging = true;
			frame = "open";
			frameTimer = setTimeout(() => (frame = "fist"), GRAB_OPEN_MS);
		} else if (phase === "end") {
			if (!ring || ring.done) return;
			if (ring.progress < SHOW_AT) dropRing();
			else animateRing(ring.progress, SHOW_AT, RETRACT_MS, dropRing);
		}
	};

	// Held still, the grabbed hand fires the ruler at its fingertip (doubleTapToPin plants it).
	const onPalmDown = (e: PointerEvent) => {
		if (!linger || !palm) return;
		e.preventDefault();
		e.stopPropagation();
		palm.setPointerCapture(e.pointerId);
		clearTimeout(frameTimer);
		linger = false;
		frame = "gold";
		ring = { ...at, progress: 0, done: false };
		animateRing(0, 1, holdMs);
		grab = {
			dx: at.x - e.clientX,
			dy: at.y - e.clientY,
			x0: e.clientX,
			y0: e.clientY,
			moved: false,
			timer: setTimeout(seedAtTip, holdMs),
		};
	};
	const onPalmMove = (e: PointerEvent) => {
		if (!grab) return;
		place(e.clientX + grab.dx, e.clientY + grab.dy);
		if (grab.moved || Math.hypot(e.clientX - grab.x0, e.clientY - grab.y0) <= SLOP_PX) return;
		grab.moved = true;
		// Dragging the hand keeps it pointing gold, ring gone; only a map pan closes it into a fist.
		clearTimeout(grab.timer);
		dropRing();
	};
	const seedAtTip = () => {
		grab = null;
		flashRing();
		hide();
		window.dispatchEvent(new CustomEvent("gc-hand-seed", { detail: at }));
	};
	const onPalmUp = () => {
		if (!grab) return;
		clearTimeout(grab.timer);
		if (!grab.moved && performance.now() - releasedAt < DBL_MS) return seedAtTip();
		grab = null;
		dropRing();
		release();
	};

	const onMove = (x: number, y: number) => dragging && !grab && place(x + REACH.dx, y + REACH.dy);
	const onMouseMove = (e: MouseEvent) => onMove(e.clientX, e.clientY);
	const onTouchMove = (e: TouchEvent) => e.touches[0] && onMove(e.touches[0].clientX, e.touches[0].clientY);
	const onMouseLeave = () => {
		if (el && !pressing) el.style.visibility = "hidden";
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
	// pointerup, not mouseup: a ruler handle's preventDefault on pointerdown swallows the mouseup and the moves.
	const onPointerUp = (e: PointerEvent) => !grab && (e.pointerType !== "mouse" || e.button === 0) && release();

	window.addEventListener("mousemove", onMouseMove, { passive: true });
	window.addEventListener("mousedown", onMouseDown, { passive: true });
	window.addEventListener("pointerup", onPointerUp, { passive: true });
	window.addEventListener("pointercancel", onPointerUp, { passive: true });
	window.addEventListener("touchmove", onTouchMove, { passive: true, capture: true });
	window.addEventListener("gc-press", onPress);
	document.addEventListener("mouseleave", onMouseLeave);
	palm?.addEventListener("pointerdown", onPalmDown);
	palm?.addEventListener("pointermove", onPalmMove);
	palm?.addEventListener("pointerup", onPalmUp);
	palm?.addEventListener("pointercancel", onPalmUp);

	return () => {
		clearTimeout(frameTimer);
		clearTimeout(grab?.timer);
		cancelAnimationFrame(raf);
		window.removeEventListener("mousemove", onMouseMove);
		window.removeEventListener("mousedown", onMouseDown);
		window.removeEventListener("pointerup", onPointerUp);
		window.removeEventListener("pointercancel", onPointerUp);
		window.removeEventListener("touchmove", onTouchMove, true);
		window.removeEventListener("gc-press", onPress);
		document.removeEventListener("mouseleave", onMouseLeave);
		palm?.removeEventListener("pointerdown", onPalmDown);
		palm?.removeEventListener("pointermove", onPalmMove);
		palm?.removeEventListener("pointerup", onPalmUp);
		palm?.removeEventListener("pointercancel", onPalmUp);
		document.body.classList.remove("gc-map-pressing");
	};
});
</script>

<!-- Hidden until a press places it. -->
<div bind:this={el} class="fake-cursor" class:linger data-frame={frame} style="visibility: hidden">
	{#each FRAMES as [name, src] (name)}
		<img class="fake-cursor-{name}" {src} alt="" draggable="false" />
	{/each}
	<div bind:this={palm} class="fake-cursor-palm"></div>
</div>

{#if ring && ring.progress >= SHOW_AT}
	<div class="hold-ring-at" style="left:{ring.x}px; top:{ring.y}px">
		<HoldRing progress={ring.progress} done={ring.done} />
	</div>
	{#if aim}
		<div class="aim-label rt-line-label rt-line-label-total" style="left:{ring.x}px; top:{ring.y}px">{aim.label}</div>
	{/if}
{/if}
