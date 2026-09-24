/**
 * The gold ATV that drives out from behind a share button. The sprite rides
 * its own layer at Z_HANDS (the hands' home) with the button's rect masked
 * out, so the real button is the mask and the ride paints over any drawer.
 */

import { localFrom } from "./fixedContainingBlock.js";
import { frameFor } from "./handPortal";
import { Z_HANDS } from "./zTiers";
import { FILE_EXPORTED_EVENT } from "./fileEvents.js";

const MIN_H = 36; // px floor so tiny icon buttons still throw a visible ATV
const MIN_RUNWAY = 48; // one quad-length; less and exiting right reads as a glitch

// The sprite is a treadmill (quad drives in place, registered on its nose,
// loops forever); CSS owns the travel along a random polyline. Duration is
// derived from path length so ground speed is constant however twisty.
const SPRITE_W = 314;
const SPRITE_H = 132;
// Rear axle in sprite px: a quad pivots about its back wheels.
const PIVOT_X = 175;
const PIVOT_Y = 100;
// Ground speed of the source clip: 911px canvas in 19 frames @ 58ms, per unit of scale.
const SPEED_SPRITE_PX_PER_S = (911 / (19 * 58)) * 1000;
const LAUNCH_FRAC = 0.06; // straight run out from under the button
const MIN_LEG_FRAC = 0.15; // below this a leg reads as vibration
const MAX_TURN_DEG = 25;
// Kept well under 45°: a long leg's vertical drift is len*sin(heading), and
// at 55° it walks the quad off the top or bottom before it reaches the side.
const MAX_HEADING_DEG = 30;
const SETTLE_MS = 120;

type Exit = "left" | "right" | "auto";

// The quad CONFIRMS an export: buttons ARM it and FILE_EXPORTED_EVENT rides
// it, so a flow that never announces never rides.
let armed: { btn: HTMLElement; exit: Exit; at: number } | null = null;
let listenerInstalled = false;
const ARM_TTL_MS = 3 * 60_000; // a stale arm from an abandoned flow never rides
const RIDE_DELAY_MS = 200; // let closing sheets unmount + the origin unhide

export function armAtvShare(btn: HTMLElement, exit: Exit = "auto"): void {
	armed = { btn, exit, at: Date.now() };
	if (listenerInstalled || typeof window === "undefined") return;
	listenerInstalled = true;
	window.addEventListener(FILE_EXPORTED_EVENT, () => {
		const a = armed;
		armed = null;
		if (!a || Date.now() - a.at > ARM_TTL_MS) return;
		setTimeout(() => {
			if (a.btn.isConnected) playAtvShare(a.btn, a.exit);
		}, RIDE_DELAY_MS);
	});
}

function resolveExit(btn: HTMLElement, exit: Exit): "left" | "right" {
	if (exit !== "auto") return exit;
	// Runway against the app shell, not the viewport: the dt-web preview window
	// is far wider than the app. Measured in CSS px and in the PAGE's rightward
	// direction — turned a quarter turn, screen px and screen right are wrong.
	const host = btn.closest(".mobile-shell") ?? document.documentElement;
	const { point } = localFrom(btn);
	const hr = host.getBoundingClientRect();
	const br = btn.getBoundingClientRect();
	const hostXs = [
		point(hr.left, hr.top).x,
		point(hr.right, hr.bottom).x,
	];
	const btnXs = [point(br.left, br.top).x, point(br.right, br.bottom).x];
	const roomRight = Math.max(...hostXs) - Math.max(...btnXs);
	return roomRight >= MIN_RUNWAY ? "right" : "left";
}

type Leg = { x: number; y: number; heading: number; len: number };

/**
 * Random route in fractions of `run`, so a 40px icon and a full-width bar get
 * the same-shaped ride. Headings are in the quad's own frame (0 = ahead);
 * only the final transform flips for a left-bound quad.
 */
function buildRoute(run: number, drift: number): Leg[] {
	const legs: Leg[] = [];
	let x = 0;
	let y = 0;
	let heading = 0;

	// A random launch heading: launched straight, a 1-turn route has its only
	// turn cancelled by the homing exit leg and ~1 ride in 5 drives dead straight.
	heading = (Math.random() * 2 - 1) * MAX_TURN_DEG;
	const launch = run * LAUNCH_FRAC;
	const lrad = (heading * Math.PI) / 180;
	x += Math.cos(lrad) * launch;
	y += Math.sin(lrad) * launch;
	legs.push({ x, y, heading, len: launch });

	// 1–5 turns including the one that sets up the exit leg.
	const turns = 1 + Math.floor(Math.random() * 5);
	const minLeg = run * MIN_LEG_FRAC;

	for (let i = 0; i < turns - 1; i++) {
		const forwardLeft = run - x;
		if (forwardLeft <= minLeg) break;

		// Steer back toward centre as vertical room runs out: a hard clamp shows
		// as the quad sliding along an invisible wall.
		const swing = (Math.random() * 2 - 1) * MAX_TURN_DEG;
		const room = drift > 0 ? y / drift : 0; // -1..1, how close to the edge
		heading = Math.max(
			-MAX_HEADING_DEG,
			Math.min(MAX_HEADING_DEG, heading + swing - room * MAX_TURN_DEG),
		);

		const maxLeg = forwardLeft / Math.max(1, turns - i);
		let len = Math.max(minLeg, maxLeg * (0.6 + Math.random() * 0.6));

		// Never let a single leg punch through the vertical budget.
		const rad = (heading * Math.PI) / 180;
		const dy = Math.sin(rad);
		if (drift > 0 && Math.abs(dy) > 0.01) {
			const room2 = dy > 0 ? drift - y : -drift - y;
			len = Math.min(len, Math.abs(room2 / dy));
		}
		if (len < 1) break;

		x += Math.cos(rad) * len;
		y += dy * len;
		legs.push({ x, y, heading, len });
	}

	// Final leg always clears the edge, shedding MOST of the drift: homing
	// exactly to y=0 straightens the ride just as it leaves.
	const forwardLeft = run - x;
	if (forwardLeft > 0) {
		heading = Math.max(
			-MAX_HEADING_DEG,
			Math.min(
				MAX_HEADING_DEG,
				(Math.atan2(-y * 0.6, forwardLeft) * 180) / Math.PI,
			),
		);
		const rad = (heading * Math.PI) / 180;
		const len = forwardLeft / Math.max(0.3, Math.cos(rad));
		x += Math.cos(rad) * len;
		y += Math.sin(rad) * len;
		legs.push({ x, y, heading, len });
	}

	return legs;
}

export function playAtvShare(btn: HTMLElement, exit: Exit = "auto"): void {
	// Not gated on prefers-reduced-motion: the guard silently killed the app's
	// share signature on every Mac with Reduce Motion on.
	const dir = resolveExit(btn, exit);

	// All distances go through point(): a raw rect/offsetWidth divide reads
	// the aspect ratio, not the scale, once the rig is turned a quarter turn.
	const local = localFrom(btn);
	const { point } = local;
	// The fixed layer resolves against the containing block localFrom measured
	// from; frameFor is only the fallback for a page with none (native).
	const home = local.origin ?? frameFor(btn) ?? document.body;

	const h = btn.offsetHeight;
	if (!h) return;
	const w = btn.offsetWidth;
	const btnRect = btn.getBoundingClientRect();
	const { x: bx, y: by } = point(btnRect.left, btnRect.top);
	const bcs = getComputedStyle(btn);
	const rRaw =
		Number.parseFloat(
			dir === "left" ? bcs.borderTopLeftRadius : bcs.borderTopRightRadius,
		) || 0;
	const overlap = Math.min(rRaw, h / 2) + 2;
	const imgH = Math.max(h * 1.05, MIN_H);
	const scale = imgH / SPRITE_H;

	type AtvHost = HTMLElement & { __atvLayer?: HTMLElement | null };
	(btn as AtvHost).__atvLayer?.remove();

	// Full-home layer with the button's rect masked out (composited exclude), so
	// the quad starts under the button. WebKit needs the -webkit- mask props.
	const layer = document.createElement("div");
	(btn as AtvHost).__atvLayer = layer;
	layer.setAttribute("aria-hidden", "true");
	const maskImg = "linear-gradient(#000 0 0), linear-gradient(#000 0 0)";
	const maskSize = `100% 100%, ${w}px ${h}px`;
	const maskPos = `0 0, ${bx}px ${by}px`;
	layer.style.cssText = [
		"position:fixed",
		"inset:0",
		"overflow:hidden",
		"pointer-events:none",
		`z-index:${Z_HANDS}`,
		`-webkit-mask-image:${maskImg}`,
		`mask-image:${maskImg}`,
		`-webkit-mask-size:${maskSize}`,
		`mask-size:${maskSize}`,
		`-webkit-mask-position:${maskPos}`,
		`mask-position:${maskPos}`,
		"-webkit-mask-repeat:no-repeat",
		"mask-repeat:no-repeat",
		"-webkit-mask-composite:xor",
		"mask-composite:exclude",
	].join(";");

	const img = new Image();
	img.alt = "";
	img.setAttribute("aria-hidden", "true");
	img.src =
		dir === "left"
			? "/mobileAssets/share_atv_tread_left.webp"
			: "/mobileAssets/share_atv_tread_right.webp";

	// Park the nose at the button's edge, tucked under by the corner radius.
	const st = img.style;
	st.position = "absolute";
	st.pointerEvents = "none";
	st.height = `${imgH}px`;
	st.width = `${SPRITE_W * scale}px`;
	st.maxWidth = "none";
	st.top = `${by + h / 2 - imgH / 2}px`;
	st.left =
		dir === "left"
			? `${bx + overlap}px`
			: `${bx + w - overlap - SPRITE_W * scale}px`;
	const pvx = dir === "left" ? SPRITE_W - PIVOT_X : PIVOT_X;
	st.transformOrigin = `${pvx * scale}px ${PIVOT_Y * scale}px`;
	// Feather the cut edge on oversized strips so it reads as dust, not a crop.
	if (imgH > h * 1.05) {
		const m = `linear-gradient(to ${dir}, transparent 2px, #000 14px)`;
		st.webkitMaskImage = m;
		st.maskImage = m;
	}

	// Every shell edge goes through point() too: a raw rect difference is a
	// screen-space distance, and turned a quarter turn "right of the button"
	// is the gap BELOW it. A turn also swaps the ends, so the corners are sorted.
	const host = btn.closest(".mobile-shell") ?? document.documentElement;
	const hostRect = host.getBoundingClientRect();
	const a = point(hostRect.left, hostRect.top);
	const b = point(hostRect.right, hostRect.bottom);
	const hostLeft = Math.min(a.x, b.x);
	const hostRight = Math.max(a.x, b.x);
	const hostTop = Math.min(a.y, b.y);
	const hostBottom = Math.max(a.y, b.y);
	const run =
		(dir === "right" ? hostRight - (bx + w) : bx - hostLeft) +
		SPRITE_W * scale;

	const driftUp = by - hostTop;
	const driftDown = hostBottom - (by + h);

	const legs = buildRoute(run, Math.max(0, Math.min(driftUp, driftDown)));
	const total = legs.reduce((s, l) => s + l.len, 0);
	// Divide in sprite px, the space the clip's speed was measured in.
	const durMs = (total / scale / SPEED_SPRITE_PX_PER_S) * 1000;

	// `sx` flips both the advancing axis and the turn direction for a left-bound quad.
	const sx = dir === "left" ? -1 : 1;
	let acc = 0;
	const frames = [
		{ offset: 0, transform: "translate(0px, 0px) rotate(0deg)" },
		...legs.map((l) => {
			acc += l.len;
			return {
				offset: Math.min(1, acc / total),
				transform: `translate(${sx * l.x}px, ${l.y}px) rotate(${sx * l.heading}deg)`,
			};
		}),
	];

	layer.appendChild(img);
	home.appendChild(layer);

	const anim = img.animate(frames, {
		duration: durMs,
		easing: "linear",
		fill: "forwards",
	});

	const cleanup = () => {
		layer.remove();
		if ((btn as AtvHost).__atvLayer === layer)
			(btn as AtvHost).__atvLayer = null;
	};
	anim.addEventListener("finish", () => setTimeout(cleanup, SETTLE_MS));
	// A backgrounded tab freezes the WAAPI clock and `finish` never lands.
	setTimeout(cleanup, durMs + SETTLE_MS + 1500);
}

/** Svelte action: arms the quad on tap; `{ exit }` overrides auto. */
export function atvShare(node: HTMLElement, opts?: { exit?: Exit }) {
	let exit: Exit = opts?.exit ?? "auto";
	const onClick = () => armAtvShare(node, exit);
	node.addEventListener("click", onClick);
	return {
		update(next?: { exit?: Exit }) {
			exit = next?.exit ?? "auto";
		},
		destroy() {
			node.removeEventListener("click", onClick);
		},
	};
}
