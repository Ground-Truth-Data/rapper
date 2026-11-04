<script lang="ts">
// Draws ONE frame clip: steps its folder at the declared fps and stops, or
// loops. No placement, no anchors, no targets — the surface around it decides
// where it sits. Size comes from the clip's facts, so every surface that plays
// a clip inherits one width instead of re-deriving it.

import { onDestroy, untrack } from "svelte";
import { frameUrls, type ClipFacts } from "./frameClips";

let {
	root,
	clip,
	facts,
	loop = false,
	from = 1,
	to = undefined,
	frames = undefined,
	decodeFirst = false,
	clock = "interval",
	onDone = undefined,
	onFrame = undefined,
}: {
	/** where the frame folders are served from, no trailing slash */
	root: string;
	clip: string;
	facts: ClipFacts;
	/** loop forever instead of holding the last frame; a number plays it that many times, then holds and says done */
	loop?: boolean | number;
	/** play a 1-based range of the clip; a wipe plays its closing half, waits, then its opening half */
	from?: number;
	to?: number;
	/** an exposure sheet: the 1-based frame each tick shows, in place of from/to */
	frames?: number[];
	/** never swap to a frame that has not decoded: the next clip's first waits at most 300 ms, and within a clip each frame decodes two ticks ahead, an undecoded one skipped */
	decodeFirst?: boolean;
	/** "elapsed": each tick shows the frame wall time has reached, so a late tick skips instead of stretching the rest */
	clock?: "interval" | "elapsed";
	/** called when a non-looping clip reaches its last frame */
	onDone?: () => void;
	/** called with each 1-based frame as it shows; the curtains swap the page at their midpoint */
	onFrame?: (frame: number) => void;
} = $props();

const urls = $derived(frameUrls(root, clip, facts));
const sheet = $derived.by(() => {
	const n = urls.length;
	if (frames?.length) return frames.map((f) => Math.min(Math.max(1, f), n));
	const first = Math.max(1, from);
	const last = Math.min(n, to ?? n);
	return Array.from({ length: Math.max(1, last - first + 1) }, (_, k) => first + k);
});

// Only the stepping below writes it, so a new clip never meets the old clip's frame index.
let src = $state<string | undefined>(undefined);
let timer: ReturnType<typeof setTimeout> | undefined;
let decodeCap: ReturnType<typeof setTimeout> | undefined;

function stop() {
	clearInterval(timer);
	clearTimeout(timer);
	clearTimeout(decodeCap);
	timer = undefined;
}

const DECODE_CAP_MS = 300;

// Kept for the player's life: a frame is decoded from its own element, and the <img> finds it by URL.
const pool = new Map<string, HTMLImageElement>();
const ready = new Set<string>();
const decoding = new Map<string, Promise<void>>();
function pooled(url: string): HTMLImageElement {
	let img = pool.get(url);
	if (!img) {
		img = new Image();
		img.src = url;
		pool.set(url, img);
	}
	return img;
}
function decodeAhead(url: string | undefined): Promise<void> {
	if (!url || ready.has(url)) return Promise.resolve();
	let p = decoding.get(url);
	if (!p) {
		const img = pooled(url);
		p = (typeof img.decode === "function" ? img.decode() : Promise.resolve())
			.catch(() => {})
			.then(() => {
				ready.add(url);
				decoding.delete(url);
			});
		decoding.set(url, p);
	}
	return p;
}

// Pre: the new clip's first frame is written before the template reads src.
// Cleanup kills the previous timer, so two clips never step the same <img> at once.
$effect.pre(() => {
	const ticks = sheet;
	const at = urls;
	const ms = 1000 / facts.fps;
	const total = ticks.length * (loop === true ? Infinity : typeof loop === "number" ? Math.max(1, loop) : 1);
	const elapsed = clock === "elapsed";
	const firstUrl = at[ticks[0] - 1];
	const wait = decodeFirst && untrack(() => src) !== firstUrl;
	let live = true;
	let k = 0;
	let t0 = 0;
	stop();

	const show = (tick: number) => {
		const f = ticks[tick % ticks.length];
		const url = at[f - 1];
		if (decodeFirst) {
			void decodeAhead(at[ticks[(tick + 1) % ticks.length] - 1]);
			void decodeAhead(at[ticks[(tick + 2) % ticks.length] - 1]);
			if (!ready.has(url) && url !== src) {
				void decodeAhead(url);
				return;
			}
		}
		src = url;
		onFrame?.(f);
	};
	const advance = (next: number) => {
		if (next >= total) {
			stop();
			onDone?.();
			return false;
		}
		k = next;
		show(k);
		return true;
	};
	const arm = () => {
		timer = setTimeout(
			() => {
				if (advance(Math.max(k + 1, Math.floor((performance.now() - t0) / ms)))) arm();
			},
			Math.max(0, t0 + (k + 1) * ms - performance.now()) + 1,
		);
	};
	const start = () => {
		if (!live) return;
		clearTimeout(decodeCap);
		t0 = performance.now();
		show(0);
		if (elapsed) arm();
		else timer = setInterval(() => advance(k + 1), ms);
	};

	if (wait) {
		const capped = new Promise<void>((r) => {
			decodeCap = setTimeout(r, DECODE_CAP_MS);
		});
		void Promise.race([decodeAhead(firstUrl), capped]).then(() => untrack(start));
	} else untrack(start);

	return () => {
		live = false;
		stop();
	};
});

onDestroy(stop);

// Without the preload the first play of a 163-frame clip stutters once, during the take.
$effect(() => {
	for (const u of urls) {
		if (decodeFirst) pooled(u);
		else new Image().src = u;
	}
});
</script>

<!-- One <img>, src swapped per frame — not 163 stacked elements the browser keeps in the layer tree. -->
<img
	class="frame-clip"
	{src}
	alt=""
	draggable="false"
	style="width: {facts.widthRem}rem"
/>

<style>
	/* No object-fit and no crop: a clip set shares one coordinate space, so
	   squeezing any one breaks entrance → turn → exit alignment. Raise widthRem instead. */
	.frame-clip {
		display: block;
		height: auto;
		max-width: none;
		user-select: none;
		-webkit-user-drag: none;
	}
</style>
