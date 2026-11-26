<!-- The one plugins list, phone and Ops alike. Your own forms stand loose, in the order you drag them to; a company's
     forms sit under its pill, which folds. Swiped left a form rests on the archive box; a tap there
     archives it for you alone, and its own page unarchives it. -->
<script lang="ts" module>
	import type { PluginCardData } from "./PluginCard.svelte";

	export type PluginOrg = { key: string; name: string; color?: string | null; logo?: string | null };
	export type PluginListItem = PluginCardData & { href: string; mine: boolean; retired: boolean; org?: PluginOrg | null };
</script>

<script lang="ts">
	import type { Snippet } from "svelte";
	import Icon from "./Icon.svelte";
	import PluginCard from "./PluginCard.svelte";
	import NestGroup from "./NestGroup.svelte";
	import NestPill from "./NestPill.svelte";
	import RowGrip from "./RowGrip.svelte";
	import { ago } from "./ago";
	import { type RowDrag, rowDragHandle, rowShift, rowSwipe } from "./rowDrag";

	let {
		items,
		match = () => true,
		orderKey,
		go,
		onretire,
		isOpen,
		ontoggle,
		folded,
	}: {
		items: PluginListItem[];
		/** The search and the All/You pills: which forms show. */
		match?: (p: PluginListItem) => boolean;
		/** This browser's drag order lives under this localStorage key. */
		orderKey: string;
		go: (href: string) => void;
		onretire: (id: string) => void;
		/** A host with submissions to show folds each card open on its left half; with none, a card only fills out. */
		isOpen?: (id: string) => boolean;
		ontoggle?: (id: string) => void;
		folded?: Snippet<[PluginListItem]>;
	} = $props();

	const RETIRE_PX = 84;
	const read = () => {
		try {
			return JSON.parse(localStorage.getItem(orderKey) ?? "[]") as string[];
		} catch {
			return [];
		}
	};
	// svelte-ignore state_referenced_locally
	let order = $state<string[]>(read());
	// A form this browser hasn't placed yet goes on top; the past sinks below the rest.
	const sorted = $derived(items.toSorted((x, y) => +x.past - +y.past || order.indexOf(x.id) - order.indexOf(y.id)));
	const shown = $derived(sorted.filter(match));
	const loose = $derived(shown.filter((p) => p.mine || !p.org));
	const orgs = $derived([...new Map(shown.filter((p) => !p.mine && p.org).map((p) => [p.org!.key, p.org!])).values()]);
	const ofOrg = (key: string) => shown.filter((p) => !p.mine && p.org?.key === key);
	let shut = $state<Record<string, boolean>>({});

	let drag = $state<RowDrag | null>(null);
	function drop(d: RowDrag) {
		drag = null;
		if (d.fromIndex === d.targetIndex) return;
		const ids = loose.map((p) => p.id);
		ids.splice(d.targetIndex, 0, ...ids.splice(d.fromIndex, 1));
		let k = 0;
		order = sorted.map((p) => (ids.includes(p.id) ? ids[k++] : p.id));
		try {
			localStorage.setItem(orderKey, JSON.stringify(order));
		} catch (e) {
			console.warn("[plugins] order", e);
		}
	}

	// Until a company picks its colour, its key picks one of these, the same on every screen.
	const TINTS = ["#3fb8af", "#b58be0", "#6fa8dc", "#e8a24a", "#e07a9a"];
	const tint = (o: PluginOrg) => o.color || TINTS[[...o.key].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % TINTS.length];
	const initials = (name: string) =>
		name
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((w) => w[0].toUpperCase())
			.join("");
	const newest = (list: PluginListItem[]) => list.map((p) => p.created).filter((c): c is string => !!c).sort().at(-1);
</script>

{#snippet form(p: PluginListItem)}
	<div class="swipe" class:past={p.past}>
		{#if !p.retired}
			<button type="button" class="retire" aria-label="Archive {p.title || 'Untitled'}" onclick={() => onretire(p.id)} data-retire><Icon name="archive" size={26} /></button>
		{/if}
		<div class="track" use:rowSwipe={p.retired ? null : { hold: RETIRE_PX }}>
			<PluginCard card={p} href={p.href} {go} fold={folded && isOpen && ontoggle ? { open: isOpen(p.id), toggle: () => ontoggle(p.id) } : undefined} />
		</div>
	</div>
{/snippet}

{#snippet subs(p: PluginListItem)}
	{#if folded && isOpen?.(p.id)}<NestGroup>{@render folded(p)}</NestGroup>{/if}
{/snippet}

<NestGroup>
	{#each orgs as o (o.key)}
		{@const theirs = ofOrg(o.key)}
		{@const when = newest(theirs)}
		<div data-org={o.key}>
			<NestPill stack="middle" open={!shut[o.key]} ontoggle={() => (shut[o.key] = !shut[o.key])}>
				{#snippet glyph()}
					<span class="org-tile" style:--tint={tint(o)}>
						{#if o.logo}<img src={o.logo} alt="" crossorigin="anonymous" />{:else}{initials(o.name)}{/if}
						<span class="rt-count-badge">{theirs.length}</span>
					</span>
				{/snippet}
				<span class="nest-line">{o.name}</span>
				<span class="nest-line nest-time">{theirs.length} {theirs.length === 1 ? "form" : "forms"}</span>
				{#snippet values()}{#if when}<span class="nest-time">{ago(when)}</span>{/if}{/snippet}
			</NestPill>
		</div>
		{#if !shut[o.key]}
			<NestGroup>
				{#each theirs as p (p.id)}
					<div data-row-id={p.id} data-retired={p.retired ? "" : undefined}>{@render form(p)}</div>
					{@render subs(p)}
				{/each}
			</NestGroup>
		{/if}
	{/each}
	{#each loose as p, i (p.id)}
		{@const moving = drag?.rowId === p.id}
		{@const shift = rowShift(drag, p.id, i)}
		<div
			class="rt-row-track rt-row-track--grip"
			class:rt-row-track--dragging={moving}
			data-row-id={p.id}
			data-retired={p.retired ? "" : undefined}
			style:transform={moving ? `translateY(${drag!.deltaY}px)` : shift ? `translateY(${shift}px)` : undefined}
			style:transition={shift && !moving ? "transform 200ms ease" : undefined}
		>
			{@render form(p)}
			<RowGrip
				label="Drag to reorder"
				dragging={moving}
				attach={(el) => rowDragHandle(el, { rowId: p.id, index: i, count: loose.length, drag: () => drag, move: (d) => (drag = d), drop }).destroy}
			/>
		</div>
		{@render subs(p)}
	{/each}
</NestGroup>

<style>
	.org-tile {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		flex: none;
		width: 2.4rem;
		height: 2.4rem;
		margin-right: 8px;
		border-radius: 0.7rem;
		background: var(--tint);
		color: #0f1514;
		font: 900 1rem var(--rt-font-body);
	}
	.org-tile img {
		width: 100%;
		height: 100%;
		border-radius: inherit;
		object-fit: cover;
	}
	/* Grey, not red: archiving is undoable, never a delete. A retired row greys with no bed. */
	.swipe {
		position: relative;
		border-radius: 14px;
		background: var(--rt-btn-neutral-bg);
	}
	.swipe.past {
		background: none;
		opacity: 0.55;
	}
	.track {
		position: relative;
		border-radius: 14px;
		background: var(--rt-bg);
		touch-action: pan-y;
		transition: transform 160ms ease;
	}
	.retire {
		position: absolute;
		inset: 0 0 0 auto;
		width: 84px;
		display: grid;
		place-items: center;
		border: 0;
		background: none;
		color: #fff;
	}
</style>
