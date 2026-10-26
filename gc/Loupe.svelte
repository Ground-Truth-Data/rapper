<!-- The map under the finger, magnified in a glass capsule floated above it, ringed by 36 ruler ticks that light clockwise while the finger holds still. A view, not an object: the finger's own tip is the point. -->
<script module lang="ts">
export const LOUPE_W = 150;
export const LOUPE_H = 96;
export const LOUPE_R = 48;
export const LOUPE_ZOOM = 1.8;
// The lens's bottom edge sits this far above the finger.
export const LOUPE_GAP = 62;
// The tick ring runs this far outside the lens edge.
export const RING_PAD = 4;
export const TICKS = 36;
// Finger still this long → the point locks.
export const HOLD_MS = 900;
const EDGE_PX = 14;
const TOP_PX = 50;
const BESIDE_PX = 44;
const EDGE_ZOOM = 1.14;
// A held pin's head and its dial must fit the lens's 96 px.
const PIN_ZOOM = 1.25;
const DIAL_PAD = 6;

/**
 * drawImage(src, s…, d…) arguments. (bx, by) is the point in the source's backing px, `s` its backing px per CSS px,
 * `dpr` the lens's. The source is clipped to the canvas with the destination scaled the same way, so at an edge the
 * view shows less instead of dragging the point off the crosshair.
 */
export function loupeFrame(bx: number, by: number, s: number, w: number, h: number, dpr: number, zoom = LOUPE_ZOOM) {
	const hw = (LOUPE_W / zoom / 2) * s;
	const hh = (LOUPE_H / zoom / 2) * s;
	const sx = Math.max(0, bx - hw);
	const sy = Math.max(0, by - hh);
	const ex = Math.min(w, bx + hw);
	const ey = Math.min(h, by + hh);
	const k = (zoom * dpr) / s;
	return {
		sx,
		sy,
		sw: ex - sx,
		sh: ey - sy,
		dx: (sx - bx + hw) * k,
		dy: (sy - by + hh) * k,
		dw: (ex - sx) * k,
		dh: (ey - sy) * k,
	};
}

/** Where `object-fit: contain` paints the image inside its box. */
function painted(img: HTMLImageElement) {
	const b = img.getBoundingClientRect();
	const k = Math.min(b.width / img.naturalWidth, b.height / img.naturalHeight) || 0;
	const w = img.naturalWidth * k;
	const h = img.naturalHeight * k;
	return { left: b.left + (b.width - w) / 2, top: b.top + (b.height - h) / 2, width: w, height: h };
}

/** The lens's centre: above the finger; beside it when that would run into the top; never past the side edges. */
export function loupeAt(x: number, y: number, w: number) {
	let cx = x;
	let cy = y - LOUPE_GAP - LOUPE_H / 2;
	if (cy - LOUPE_H / 2 < TOP_PX) {
		cx = x + (x < w / 2 ? 1 : -1) * (LOUPE_W / 2 + BESIDE_PX);
		cy = Math.max(TOP_PX + LOUPE_H / 2, y);
	}
	cx = Math.min(Math.max(cx, EDGE_PX + LOUPE_W / 2), w - EDGE_PX - LOUPE_W / 2);
	return { x: cx, y: cy };
}

const RING_W = LOUPE_W + 2 * RING_PAD;
const RING_H = LOUPE_H + 2 * RING_PAD;
const RING_R = RING_H / 2;
// The capsule's straight run, top and bottom.
const RUN = RING_W - 2 * RING_R;
export const RING_D = `M${RING_W / 2},0H${RING_W - RING_R}A${RING_R},${RING_R} 0 0 1 ${RING_W - RING_R},${RING_H}H${RING_R}A${RING_R},${RING_R} 0 0 1 ${RING_R},0Z`;

/** The point and unit tangent `l` px along the ring, clockwise from top centre. */
function along(l: number) {
	const total = 2 * RUN + 2 * Math.PI * RING_R;
	l = ((l % total) + total) % total;
	const rcx = RING_W - RING_R;
	const lcx = RING_R;
	if (l < RUN / 2) return { x: RING_W / 2 + l, y: 0, tx: 1, ty: 0 };
	l -= RUN / 2;
	if (l < Math.PI * RING_R) {
		const a = l / RING_R;
		return { x: rcx + RING_R * Math.sin(a), y: RING_R - RING_R * Math.cos(a), tx: Math.cos(a), ty: Math.sin(a) };
	}
	l -= Math.PI * RING_R;
	if (l < RUN) return { x: rcx - l, y: RING_H, tx: -1, ty: 0 };
	l -= RUN;
	if (l < Math.PI * RING_R) {
		const a = l / RING_R;
		return { x: lcx - RING_R * Math.sin(a), y: RING_R + RING_R * Math.cos(a), tx: -Math.cos(a), ty: -Math.sin(a) };
	}
	l -= Math.PI * RING_R;
	return { x: lcx + l, y: 0, tx: 1, ty: 0 };
}

/** Ticks evenly spaced by path length, each across the ring; every sixth, from the first, is major. */
export function capsuleTicks(n = TICKS) {
	const total = 2 * RUN + 2 * Math.PI * RING_R;
	return Array.from({ length: n }, (_, k) => {
		const p = along((total * k) / n);
		const major = k % 6 === 0;
		const h = (major ? 8 : 4.4) / 2;
		const nx = p.ty;
		const ny = -p.tx;
		return { major, x1: p.x - nx * h, y1: p.y - ny * h, x2: p.x + nx * h, y2: p.y + ny * h };
	});
}
</script>

<script lang="ts">
import handGold from "./assets/hand_gold.webp";
import { HOTSPOT_X, HOTSPOT_Y } from "./ShovelCursor.svelte";

let {
	src,
	x,
	y,
	since,
	paused = false,
	out = false,
	ms = HOLD_MS,
	pin,
}: {
	src: HTMLCanvasElement;
	x: number;
	y: number;
	since?: number;
	paused?: boolean;
	out?: boolean;
	ms?: number;
	/** A held pin's image: the view centres on its head and the clock runs as a dial round it. */
	pin?: HTMLImageElement;
} = $props();

let lens: HTMLCanvasElement | undefined = $state();
let edge: HTMLCanvasElement | undefined = $state();
let on = $state(false);
let prog = $state(0);
const lit = $derived(Math.floor(prog * TICKS + 1e-6));
let locked = $state(false);
// The finger's offset from the lens centre, and the dial's radius, in lens px.
let fx = $state(0);
let fy = $state(0);
let dial = $state(0);
// The clock stops where the finger left it, so a paused ring holds its count.
let frozen = 0;
const at = $derived(loupeAt(x, y, window.innerWidth));
const left = $derived(at.x - LOUPE_W / 2);
const top = $derived(at.y - LOUPE_H / 2);
const ticks = capsuleTicks();
// Margin past the ring for the longest tick.
const M = 6;

$effect(() => {
	const id = requestAnimationFrame(() => (on = true));
	return () => cancelAnimationFrame(id);
});

// Copied every frame while shown: the map keeps drawing under a held finger, and the ticks follow the clock.
$effect(() => {
	const c = lens;
	const e = edge;
	if (!c || !e) return;
	let raf = 0;
	const draw = () => {
		const r = src.getBoundingClientRect();
		const s = src.width / r.width;
		const dpr = window.devicePixelRatio;
		// The head is the circle across the top of the teardrop; read live, so the dial follows the pin's swell.
		const h = pin && painted(pin);
		const vx = h ? h.left + h.width / 2 : x;
		const vy = h ? h.top + h.width / 2 : y;
		const z = h ? PIN_ZOOM : LOUPE_ZOOM;
		fx = (x - vx) * z;
		fy = (y - vy) * z;
		dial = h ? (h.width / 2) * z + DIAL_PAD : 0;
		// Pins are DOM over the canvas, so the copy misses them; each is drawn in from its own image.
		// Every image in a marker, nested ones too (a cluster's skins), each at its wrapper's turn and opacity.
		const pins = [...(src.closest(".mapboxgl-map, .maplibregl-map")?.querySelectorAll<HTMLImageElement>(":is(.mapboxgl-marker, .maplibregl-marker) img") ?? [])].flatMap((img) => {
			const b = img.getBoundingClientRect();
			// No zoom shows more than a lens-width round its centre.
			if (Math.abs(b.left + b.width / 2 - vx) > LOUPE_W || Math.abs(b.top + b.height / 2 - vy) > LOUPE_W) return [];
			const wrap = img.parentElement;
			if (!wrap || wrap.matches(".mapboxgl-marker, .maplibregl-marker")) return [{ img, ...painted(img), turn: 0, alpha: 1 }];
			const cs = getComputedStyle(wrap);
			const alpha = Number(cs.opacity);
			if (!alpha) return [];
			const m = new DOMMatrix(cs.transform === "none" ? undefined : cs.transform);
			const s = Math.hypot(m.a, m.b);
			const k = Math.min((img.offsetWidth * s) / img.naturalWidth, (img.offsetHeight * s) / img.naturalHeight) || 0;
			const [width, height] = [img.naturalWidth * k, img.naturalHeight * k];
			return [{ img, left: b.left + (b.width - width) / 2, top: b.top + (b.height - height) / 2, width, height, turn: Math.atan2(m.b, m.a), alpha }];
		});
		for (const [canvas, zoom] of [
			[c, z],
			[e, z * EDGE_ZOOM],
		] as const) {
			if (canvas.width !== LOUPE_W * dpr) {
				canvas.width = LOUPE_W * dpr;
				canvas.height = LOUPE_H * dpr;
			}
			const f = loupeFrame((vx - r.left) * s, (vy - r.top) * s, s, src.width, src.height, dpr, zoom);
			const ctx = canvas.getContext("2d");
			if (!ctx) continue;
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			ctx.drawImage(src, f.sx, f.sy, f.sw, f.sh, f.dx, f.dy, f.dw, f.dh);
			const k = zoom * dpr;
			for (const b of pins) {
				const dx = ((b.left - vx) * zoom + LOUPE_W / 2) * dpr;
				const dy = ((b.top - vy) * zoom + LOUPE_H / 2) * dpr;
				const [w, h] = [b.width * k, b.height * k];
				if (dx >= canvas.width || dy >= canvas.height || dx + w <= 0 || dy + h <= 0) continue;
				ctx.save();
				ctx.globalAlpha = b.alpha;
				ctx.translate(dx + w / 2, dy + h / 2);
				ctx.rotate(b.turn);
				ctx.drawImage(b.img, -w / 2, -h / 2, w, h);
				ctx.restore();
			}
		}
		const now = paused ? (frozen ||= performance.now()) : performance.now();
		// No clock (a hand drag): the ring stays dark.
		const p = since === undefined ? 0 : Math.min(1, (now - since) / ms);
		prog = p;
		if (p >= 1 && !locked) {
			locked = true;
			navigator.vibrate?.(12);
		}
		if (p < 1) locked = false;
		raf = requestAnimationFrame(draw);
	};
	draw();
	return () => cancelAnimationFrame(raf);
});
</script>

<div
	class="lw"
	class:on={on && !out}
	class:out
	class:locked
	style="left:{left}px; top:{top}px; transform-origin:{x - left}px {y - top}px; --hx:{HOTSPOT_X - fx}px; --hy:{HOTSPOT_Y - fy}px"
>
	<div class="lens" class:pulse={locked}>
		<canvas bind:this={lens}></canvas>
		<canvas class="edge" bind:this={edge}></canvas>
		{#if dial}
			<!-- The snake ruler's ticks, round the held pin's head. -->
			<svg class="dial" viewBox="{-LOUPE_W / 2} {-LOUPE_H / 2} {LOUPE_W} {LOUPE_H}" aria-hidden="true">
				<circle class="band" r={dial} />
				<circle class="trace" r={dial} pathLength="100" transform="rotate(-90)" style="stroke-dashoffset:{100 - 100 * prog}" />
				{#each { length: TICKS }, k}
					<line class:major={k % 6 === 0} class:lit={k < lit} transform="rotate({(360 * k) / TICKS})" y1={-dial - (k % 6 ? 2.2 : 4)} y2={-dial + (k % 6 ? 2.2 : 4)} />
				{/each}
			</svg>
		{/if}
		<div class="rim"></div>
		<img class="finger" src={handGold} alt="" draggable="false" />
	</div>
	<svg
		class="ticks"
		class:gone={pin}
		width={RING_W + 2 * M}
		height={RING_H + 2 * M}
		viewBox="{-M} {-M} {RING_W + 2 * M} {RING_H + 2 * M}"
		style="left:{-RING_PAD - M}px; top:{-RING_PAD - M}px"
		aria-hidden="true"
	>
		<path class="band" d={RING_D} />
		<path class="trace" d={RING_D} pathLength="100" style="stroke-dashoffset:{100 - 100 * prog}" />
		{#each ticks as t, k}
			<line class:major={t.major} class:lit={k < lit} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} />
		{/each}
	</svg>
</div>

<style>
	.lw {
		position: fixed;
		width: 150px;
		height: 96px;
		pointer-events: none;
		/* Just under .fake-cursor (mobile.css), so the hand stays on top of its own lens. */
		z-index: 2147483646;
		opacity: 0;
		transform: scale(0.35);
		transition:
			transform 0.16s cubic-bezier(0.2, 0.9, 0.3, 1.2),
			opacity 0.12s;
	}
	.lw.on {
		opacity: 1;
		transform: scale(1);
	}
	.lw.out {
		opacity: 0;
		transform: scale(0.1);
		transition:
			transform 0.18s ease-in,
			opacity 0.18s ease-in;
	}
	.lens {
		position: absolute;
		inset: 0;
		border-radius: 48px;
		overflow: hidden;
		background: #15171c;
		box-shadow:
			0 12px 30px rgba(0, 0, 0, 0.38),
			0 2px 6px rgba(0, 0, 0, 0.25);
	}
	.lens.pulse {
		animation: pulse 0.28s ease-out;
	}
	@keyframes pulse {
		40% {
			transform: scale(1.045);
		}
	}
	canvas {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}
	/* The outer fifth bends the map a touch further, like glass. */
	.edge {
		filter: blur(1.2px) saturate(1.3) brightness(1.08);
		-webkit-mask: radial-gradient(closest-side, transparent 78%, #000 100%);
		mask: radial-gradient(closest-side, transparent 78%, #000 100%);
	}
	.rim {
		position: absolute;
		inset: 0;
		border-radius: inherit;
		box-shadow:
			inset 0 0 0 1px rgba(255, 255, 255, 0.38),
			inset 0 1.5px 1px rgba(255, 255, 255, 0.75),
			inset 0 -1px 1px rgba(255, 255, 255, 0.3),
			inset 4px 0 5px -2px rgba(255, 60, 110, 0.55),
			inset -4px 0 5px -2px rgba(60, 170, 255, 0.55),
			inset 0 4px 5px -2px rgba(255, 230, 120, 0.35);
		background: radial-gradient(120% 80% at 28% 6%, rgba(255, 255, 255, 0.2), transparent 42%);
	}
	/* The finger itself, its tip on the crosshair, so the lens shows what it is touching. */
	.finger {
		position: absolute;
		left: calc(50% - var(--hx));
		top: calc(50% - var(--hy));
		width: 72px;
		opacity: 0.85;
	}
	/* Not `.ring`: Tailwind's utility of that name would draw a 1px box round the svg. */
	.ticks {
		position: absolute;
		overflow: visible;
	}
	/* A pin's clock is its dial; one clock at a time. */
	.ticks.gone {
		display: none;
	}
	.dial {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		overflow: visible;
	}
	.band {
		fill: none;
		stroke: rgba(22, 23, 20, 0.5);
		stroke-width: 9;
	}
	/* The gold line creeps round under the ticks as the hold fills. */
	.trace {
		fill: none;
		stroke: #f3c61e;
		stroke-width: 2.5;
		stroke-linecap: round;
		stroke-dasharray: 100;
		filter: drop-shadow(0 0 1.5px rgba(0, 0, 0, 0.55));
	}
	.locked .trace {
		filter: drop-shadow(0 0 4px rgba(243, 198, 30, 0.9));
	}
	line {
		stroke: rgba(255, 255, 255, 0.22);
		stroke-width: 2;
		stroke-linecap: butt;
		transition: stroke 0.06s;
	}
	line.major {
		stroke-width: 3;
	}
	line.lit {
		stroke: #fff;
	}
	line.major.lit {
		stroke: #f3c61e;
	}
	.locked line.lit {
		filter: drop-shadow(0 0 3px rgba(243, 198, 30, 0.9));
	}
</style>
