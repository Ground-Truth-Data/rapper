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
 * Press: open hand, then a fist while held; release: fist, open, point.
 * A held map press counts 1·2 in a keycap up-left of the press — the
 * map's long-press (doubleTapToPin.ts) emits `gc-press` — and turns the
 * hand gold when the snake ruler fires.
 */
import { onMount } from "svelte";
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
const OPEN_MS = 333;
const LET_GO_MS = 500;
const COUNT_STEP_MS = 1000;
// Up-left of the press: clear of the hand on desktop and of a right thumb on a phone.
const BADGE_OFFSET = 56;

let el: HTMLDivElement | undefined = $state();
let frame: Frame = $state("point");
let count: { n: number; x: number; y: number; fired: boolean } | null = $state(null);

onMount(() => {
	document.body.classList.add("shovel-cursor");
	let frameTimer: ReturnType<typeof setTimeout> | undefined;
	let countTimer: ReturnType<typeof setTimeout> | undefined;
	const after = (ms: number, f: Frame, then?: () => void) => {
		clearTimeout(frameTimer);
		frameTimer = setTimeout(() => {
			frame = f;
			then?.();
		}, ms);
	};

	const onMouseMove = (e: MouseEvent) => {
		if (!el) return;
		el.style.transform = `translate3d(${e.clientX - HOTSPOT_X}px, ${e.clientY - HOTSPOT_Y}px, 0)`;
		if (el.style.visibility !== "visible") el.style.visibility = "visible";
	};
	const onMouseLeave = () => {
		if (el) el.style.visibility = "hidden";
	};
	// Appended to <body> and self-removing, so it needs no state and cannot leak.
	const onMouseDown = (e: MouseEvent) => {
		const ring = document.createElement("span");
		ring.className = "click-splash";
		ring.style.left = `${e.clientX}px`;
		ring.style.top = `${e.clientY}px`;
		ring.addEventListener("animationend", () => ring.remove());
		document.body.appendChild(ring);
		if (e.button !== 0) return;
		frame = "open";
		after(OPEN_MS, "fist");
	};
	const onMouseUp = (e: MouseEvent) => {
		if (e.button !== 0) return;
		if (frame === "open") frame = "fist";
		after(LET_GO_MS, "open", () => after(LET_GO_MS, "point"));
	};

	const onPress = (e: Event) => {
		const { phase, x, y } = (e as CustomEvent<{ phase: "arm" | "end" | "fire"; x: number; y: number }>).detail;
		clearTimeout(countTimer);
		if (phase === "end") {
			count = null;
			return;
		}
		if (phase === "fire") {
			if (count) count = { ...count, n: 2, fired: true };
			frame = "gold";
			clearTimeout(frameTimer);
			countTimer = setTimeout(() => (count = null), 600);
			return;
		}
		const pad = 20;
		count = {
			n: 1,
			x: Math.max(pad, x - BADGE_OFFSET),
			y: Math.max(pad, y - BADGE_OFFSET),
			fired: false,
		};
		countTimer = setTimeout(() => count && (count = { ...count, n: 2 }), COUNT_STEP_MS);
	};

	window.addEventListener("mousemove", onMouseMove, { passive: true });
	window.addEventListener("mousedown", onMouseDown, { passive: true });
	window.addEventListener("mouseup", onMouseUp, { passive: true });
	window.addEventListener("gc-press", onPress);
	document.addEventListener("mouseleave", onMouseLeave);

	return () => {
		clearTimeout(frameTimer);
		clearTimeout(countTimer);
		window.removeEventListener("mousemove", onMouseMove);
		window.removeEventListener("mousedown", onMouseDown);
		window.removeEventListener("mouseup", onMouseUp);
		window.removeEventListener("gc-press", onPress);
		document.removeEventListener("mouseleave", onMouseLeave);
		document.body.classList.remove("shovel-cursor");
	};
});
</script>

<!-- Hidden until the first mousemove places it. -->
<div bind:this={el} class="fake-cursor" data-frame={frame} style="visibility: hidden">
	{#each FRAMES as [name, src] (name)}
		<img class="fake-cursor-{name}" {src} alt="" draggable="false" />
	{/each}
</div>

{#if count}
	<div class="press-count" class:fired={count.fired} style="left:{count.x}px; top:{count.y}px">
		{count.n}
	</div>
{/if}
