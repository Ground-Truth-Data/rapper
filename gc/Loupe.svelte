<!-- The map under the pointer, magnified and floated above it: a view, not an object. The crosshair is the pointer's own point; whatever the owner renders inside sits on it at the same magnification. -->
<script module lang="ts">
export const LOUPE_PX = 120;
export const LOUPE_ZOOM = 2.2;
export const LOUPE_LIFT_PX = 90;

/**
 * drawImage(src, s…, d…) arguments. (bx, by) is the point in the source's backing px, `s` its backing px per CSS px,
 * `dpr` the lens's. The source is clipped to the canvas with the destination scaled the same way, so at an edge the
 * view shows less instead of dragging the point off the crosshair.
 */
export function loupeFrame(bx: number, by: number, s: number, w: number, h: number, dpr: number) {
	const half = (LOUPE_PX / LOUPE_ZOOM / 2) * s;
	const sx = Math.max(0, bx - half);
	const sy = Math.max(0, by - half);
	const ex = Math.min(w, bx + half);
	const ey = Math.min(h, by + half);
	const k = (LOUPE_ZOOM * dpr) / s;
	return {
		sx,
		sy,
		sw: ex - sx,
		sh: ey - sy,
		dx: (sx - bx + half) * k,
		dy: (sy - by + half) * k,
		dw: (ex - sx) * k,
		dh: (ey - sy) * k,
	};
}

/** The lens's centre: above the point, kept whole inside a w×h viewport. */
export function loupeAt(x: number, y: number, w: number, h: number) {
	const r = LOUPE_PX / 2;
	return {
		x: Math.min(Math.max(x, r), w - r),
		y: Math.min(Math.max(y - LOUPE_LIFT_PX, r), h - r),
	};
}
</script>

<script lang="ts">
import type { Snippet } from "svelte";

let {
	src,
	x,
	y,
	label = "",
	children,
}: { src: HTMLCanvasElement; x: number; y: number; label?: string; children?: Snippet } = $props();

let lens: HTMLCanvasElement | undefined = $state();
const at = $derived(loupeAt(x, y, window.innerWidth, window.innerHeight));

// Copied every frame while shown: the map keeps drawing under a held pointer (its own ruler line, a pan it refused).
$effect(() => {
	const c = lens;
	if (!c) return;
	let raf = 0;
	const draw = () => {
		const r = src.getBoundingClientRect();
		const s = src.width / r.width;
		const dpr = window.devicePixelRatio;
		const size = LOUPE_PX * dpr;
		if (c.width !== size) c.width = c.height = size;
		const f = loupeFrame((x - r.left) * s, (y - r.top) * s, s, src.width, src.height, dpr);
		const ctx = c.getContext("2d");
		ctx?.clearRect(0, 0, size, size);
		ctx?.drawImage(src, f.sx, f.sy, f.sw, f.sh, f.dx, f.dy, f.dw, f.dh);
		raf = requestAnimationFrame(draw);
	};
	draw();
	return () => cancelAnimationFrame(raf);
});
</script>

<div class="loupe-at" style="left:{at.x}px; top:{at.y}px">
	<div class="loupe">
		<canvas bind:this={lens}></canvas>
		<div class="loupe-in" style="transform: translate(-50%, -50%) scale({LOUPE_ZOOM})">{@render children?.()}</div>
	</div>
	{#if label}
		<div class="loupe-label rt-line-label rt-line-label-total">{label}</div>
	{/if}
</div>

<style>
	.loupe-at {
		position: fixed;
		transform: translate(-50%, -50%);
		pointer-events: none;
		/* Just under .fake-cursor (mobile.css), so the hand stays on top of its own lens. */
		z-index: 2147483646;
	}
	.loupe {
		position: relative;
		width: 120px;
		height: 120px;
		border-radius: 50%;
		overflow: hidden;
		background: #15171c;
		box-shadow:
			0 0 0 3px var(--color-accent),
			0 0 0 4px rgba(0, 0, 0, 0.6),
			0 8px 22px rgba(0, 0, 0, 0.55);
	}
	canvas {
		display: block;
		width: 100%;
		height: 100%;
	}
	.loupe-in {
		position: absolute;
		left: 50%;
		top: 50%;
	}
	.loupe::before,
	.loupe::after {
		content: "";
		position: absolute;
		left: 50%;
		top: 50%;
		transform: translate(-50%, -50%);
		background: #fff;
		box-shadow: 0 0 2px 1px rgba(0, 0, 0, 0.7);
	}
	.loupe::before {
		width: 26px;
		height: 1px;
	}
	.loupe::after {
		width: 1px;
		height: 26px;
	}
	.loupe-label {
		position: absolute;
		left: 50%;
		bottom: 100%;
		transform: translate(-50%, -10px);
		white-space: nowrap;
	}
</style>
