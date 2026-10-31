<script lang="ts">
// Imported, not a `/mobileAssets/...` URL: a static URL resolves only on the
// server that holds the file, so every other tier needed its own copy.
import handPoint from "$gc/assets/hand_point.webp";
import handOpen from "$gc/assets/hand_open.webp";
import handFist from "$gc/assets/hand_fist.webp";

type Grip = "point" | "open" | "fist";
// All three stay mounted and decoded, so a swap never flickers (as in ShovelCursor).
const GRIPS: [Grip, string][] = [
	["point", handPoint],
	["open", handOpen],
	["fist", handFist],
];

// The teaching hand: a pointing cursor with async motion primitives (fadeIn,
// moveTo, tap, clench, press, boom, lift, pad, fadeOut) that a scheduler
// choreographs into a wordless lesson. Furniture by the import-list test (no
// store, no auth, no API), so it lives here in rapper/gc; Get Cache's online
// map (its draw controls and ruler scheduler) and ReTreever's who/what lessons
// import it. Coordinates are FRAME-LOCAL px: inside a phone frame on dt-web
// (the caller subtracts the frame's rect), viewport px where there is no frame.

const HAND_H = 140; // px — rendered hand height
// Fingertip position inside the image, as a fraction of the rendered box
// (0,0 = top-left; the asset points up-left). Nudge if the tip misses.
const TIP_X = 0.2;
const TIP_Y = 0.08;

let visible = $state(false);
let tipX = $state(0); // fingertip target x (frame-local px)
let tipY = $state(0); // fingertip target y
let rot = $state(0);
let scale = $state(1);
let opacity = $state(0);
let grip = $state<Grip>("point");
// Fingertip effects: the filling ring of a long press, the shockwave of a boom.
let fx = $state<"press" | "boom" | null>(null);
let pressS = $state(0.6);
let boomN = $state(0);

async function G() {
	return (await import("gsap")).gsap;
}

let live: { kill?: () => void }[] = [];
function track<T extends { kill?: () => void }>(t: T): T {
	live.push(t);
	return t;
}

export function isVisible(): boolean {
	return visible;
}

// Drop the hand in (hidden) at a fingertip position, ready to fade in.
export function place(x: number, y: number, r = 0): void {
	tipX = x;
	tipY = y;
	rot = r;
	scale = 1;
	opacity = 0;
	grip = "point";
	fx = null;
	visible = true;
}

export async function fadeIn(duration = 0.3): Promise<void> {
	const g = await G();
	const p = { o: opacity };
	await track(
		g.to(p, {
			o: 1,
			duration,
			ease: "power2.out",
			onUpdate: () => {
				opacity = p.o;
			},
		}),
	);
}

export async function fadeOut(duration = 0.3): Promise<void> {
	const g = await G();
	const p = { o: opacity };
	await track(
		g.to(p, {
			o: 0,
			duration,
			ease: "power2.in",
			onUpdate: () => {
				opacity = p.o;
			},
		}),
	);
}

// `curve` is the perpendicular bow in px (sign flips which way it arcs); 0 = straight.
// `onStep` sees the fingertip every frame, so a drag can carry something along.
export async function moveTo(
	x: number,
	y: number,
	opts: {
		curve?: number;
		rot?: number;
		duration?: number;
		ease?: string;
		onStep?: (x: number, y: number) => void;
	} = {},
): Promise<void> {
	const g = await G();
	const sx = tipX,
		sy = tipY,
		sr = rot;
	const tr = opts.rot ?? rot;
	const curve = opts.curve ?? 0;
	const mx = (sx + x) / 2,
		my = (sy + y) / 2;
	const dx = x - sx,
		dy = y - sy;
	const len = Math.hypot(dx, dy) || 1;
	const nx = -dy / len,
		ny = dx / len; // unit perpendicular
	const cx = mx + nx * curve,
		cy = my + ny * curve;
	const p = { t: 0 };
	await track(
		g.to(p, {
			t: 1,
			duration: opts.duration ?? 1,
			ease: opts.ease ?? "power2.inOut",
			onUpdate: () => {
				const t = p.t,
					m = 1 - t;
				tipX = m * m * sx + 2 * m * t * cx + t * t * x;
				tipY = m * m * sy + 2 * m * t * cy + t * t * y;
				rot = sr + (tr - sr) * t;
				opts.onStep?.(tipX, tipY);
			},
		}),
	);
}

function tweenScale(g: typeof import("gsap").gsap, to: number, duration: number, ease: string) {
	const p = { s: scale };
	return track(
		g.to(p, {
			s: to,
			duration,
			ease,
			onUpdate: () => {
				scale = p.s;
			},
		}),
	);
}

// Quick press: dip the scale and spring back (a tap on a button).
export async function tap(): Promise<void> {
	const g = await G();
	await tweenScale(g, 0.82, 0.12, "power2.in");
	await tweenScale(g, 1, 0.16, "back.out(2)");
}

export function setGrip(g: Grip): void {
	grip = g;
}

// Close on a handle: the fist frame with a squeeze.
export async function clench(): Promise<void> {
	const g = await G();
	grip = "fist";
	await tweenScale(g, 0.9, 0.1, "power2.in");
	await tweenScale(g, 1, 0.14, "back.out(2)");
}

// Long press: dip and HOLD while a ring fills at the fingertip. Resolves when the hold is up.
export async function press(holdS = 0.6): Promise<void> {
	const g = await G();
	pressS = holdS;
	fx = "press";
	await tweenScale(g, 0.86, 0.14, "power2.in");
	await track(g.to({}, { duration: Math.max(0, holdS - 0.14) }));
}

// The release: a gold shockwave from the fingertip while the hand springs back up.
export async function boom(): Promise<void> {
	const g = await G();
	boomN++;
	fx = "boom";
	await tweenScale(g, 1, 0.28, "back.out(3)");
}

// A beat of surprise: the hand rears up and settles.
export async function lift(): Promise<void> {
	const g = await G();
	const r0 = rot;
	const p = { s: scale, r: rot };
	const apply = () => {
		scale = p.s;
		rot = p.r;
	};
	await track(g.to(p, { s: 1.18, r: r0 - 8, duration: 0.22, ease: "power2.out", onUpdate: apply }));
	await track(g.to(p, { s: 1, r: r0, duration: 0.3, ease: "back.out(1.6)", onUpdate: apply }));
}

// Tickle a spot: slide the fingertip back and forth across (x,y) a few times.
export async function pad(
	x: number,
	y: number,
	opts: { times?: number; amp?: number; duration?: number } = {},
): Promise<void> {
	const g = await G();
	const times = opts.times ?? 3;
	const amp = opts.amp ?? 11;
	const dur = opts.duration ?? 0.26;
	tipY = y;
	for (let i = 0; i < times; i++) {
		const sign = i % 2 === 0 ? 1 : -1;
		const p = { d: 0 };
		await track(
			g.to(p, {
				d: 1,
				duration: dur,
				ease: "sine.inOut",
				onUpdate: () => {
					tipX = x + Math.sin(p.d * Math.PI) * amp * sign;
				},
			}),
		);
	}
	tipX = x;
}

export function cancel(): void {
	for (const t of live)
		try {
			t.kill?.();
		} catch {
			/* tween already disposed */
		}
	live = [];
	visible = false;
	opacity = 0;
	fx = null;
}
</script>

{#if visible}
	{#if fx === "press"}
		<div class="hand-fx hand-press" style="left:{tipX}px; top:{tipY}px; animation-duration:{pressS}s"></div>
	{:else if fx === "boom"}
		{#key boomN}
			<div class="hand-fx hand-boom" style="left:{tipX}px; top:{tipY}px"></div>
		{/key}
	{/if}
	{#each GRIPS as [name, src] (name)}
		<img
			class="draw-demo-hand"
			{src}
			alt=""
			aria-hidden="true"
			style="left:{tipX}px; top:{tipY}px; height:{HAND_H}px; opacity:{grip === name ? opacity : 0};
			       transform-origin: {TIP_X * 100}% {TIP_Y * 100}%;
			       transform: translate(-{TIP_X * 100}%, -{TIP_Y * 100}%) rotate({rot}deg) scale({scale});"
		/>
	{/each}
{/if}

<style>
	.draw-demo-hand {
		position: fixed;
		z-index: 60;
		pointer-events: none;
		width: auto;
		filter: drop-shadow(0 6px 12px rgba(0, 0, 0, 0.55));
		will-change: transform, left, top, opacity;
	}
	.hand-fx {
		position: fixed;
		z-index: 59;
		pointer-events: none;
		border-radius: 50%;
		translate: -50% -50%;
	}
	/* Gold = the ruler's own fill (#ffd54a), so the ring reads as "the ruler is coming". */
	.hand-press {
		width: 84px;
		height: 84px;
		border: 3px solid rgba(255, 213, 74, 0.7);
		background: radial-gradient(circle, rgba(255, 255, 255, 0.5) 0 8%, rgba(255, 213, 74, 0.18) 9% 100%);
		box-shadow:
			0 0 14px 3px rgba(255, 213, 74, 0.35),
			inset 0 0 12px rgba(255, 255, 255, 0.25);
		animation: hand-press-fill linear forwards;
	}
	@keyframes hand-press-fill {
		from {
			scale: 0.2;
			opacity: 0.3;
		}
		to {
			scale: 1;
			opacity: 0.55;
		}
	}
	.hand-boom {
		width: 220px;
		height: 220px;
		border: 3px solid rgba(255, 213, 74, 0.7);
		box-shadow:
			0 0 20px 6px rgba(255, 213, 74, 0.3),
			inset 0 0 30px rgba(255, 255, 255, 0.35);
		animation: hand-boom 0.9s cubic-bezier(0.15, 0.85, 0.3, 1) forwards;
	}
	@keyframes hand-boom {
		0% {
			scale: 0.1;
			opacity: 0.45;
			background: rgba(255, 255, 255, 0.35);
		}
		35% {
			opacity: 0.45;
			background: rgba(255, 213, 74, 0.12);
		}
		100% {
			scale: 1;
			opacity: 0;
			background: rgba(255, 213, 74, 0);
		}
	}
</style>
