<!-- One plugin as every Get Cache list draws it, phone and Ops alike. Half and half: the left folds its submissions
     open, the right fills the form out. With nothing to fold, the whole card fills it out. -->
<script lang="ts" module>
	import type { Identity } from "./IdentityPill.svelte";

	export type PluginCardData = {
		id: string;
		title: string;
		icon: string;
		questions: number;
		maker: Identity;
		/** When it was made; null until it is published. */
		created: string | null;
		answers: number;
		lastAt: string | null;
		/** Retired, dropped or replaced: greyed, and sorted below the rest. */
		past: boolean;
		replacedBy?: { title: string; href: string } | null;
	};
</script>

<script lang="ts">
	import GoChevron from "./GoChevron.svelte";
	import IdentityPill from "./IdentityPill.svelte";
	import RowShell from "./RowShell.svelte";
	import { ago } from "./ago";

	let { card, href, go, fold }: { card: PluginCardData; href: string; go: (href: string) => void; fold?: { open: boolean; toggle: () => void } } = $props();

	// A tapped half presses in and flashes gold for a second before it acts, so a slip of the finger reads as what it did.
	let pressing = $state<string | null>(null);
	function press(key: string, act: () => void) {
		if (pressing) return;
		pressing = key;
		setTimeout(() => ((pressing = null), act()), 1000);
	}
	const created = (iso: string) => new Date(iso).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
	const saved = (iso: string) => new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
	const plural = (n: number, one: string) => `${n.toLocaleString("en-US")} ${n === 1 ? one : `${one}s`}`;
</script>

<div class="split" class:whole={!fold}>
	<RowShell title={card.title || "Untitled"} tier="top">
		{#snippet lead()}
			{#if fold}
				<span class="rt-row__fold" class:rt-row__fold--shut={!fold.open} class:none={!card.answers}
					><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6" /></svg></span
				>
			{/if}
		{/snippet}
		{#snippet overlay()}
			{#if fold}
				<span
					class="rt-row__half rt-row__half--toggle zone"
					class:pressed={pressing === "fold"}
					role="button"
					tabindex="0"
					aria-label={fold.open ? "Hide submissions" : "Show submissions"}
					aria-expanded={fold.open}
					aria-disabled={!card.answers}
					onclick={(e) => (e.stopPropagation(), card.answers && press("fold", fold.toggle))}
					onkeydown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), card.answers && press("fold", fold.toggle))}
					data-fold
				></span>
			{/if}
			<a
				class="rt-row__half rt-row__half--open zone"
				class:pressed={pressing === "open"}
				{href}
				draggable="false"
				aria-label="Fill out {card.title || 'Untitled'}"
				onclick={(e) => (e.preventDefault(), e.stopPropagation(), press("open", () => go(href)))}
				data-open
			></a>
		{/snippet}
		{#snippet glyph()}
			<img src={card.icon} alt="" crossorigin="anonymous" class="rt-row__glyph-img" class:grey={card.past} />
			{#if card.answers}<span class="rt-count-badge" aria-label={plural(card.answers, "submission")} data-answers>{card.answers.toLocaleString("en-US")}</span>{/if}
		{/snippet}
		{#snippet subtitle()}
			{#if !card.created}<span class="rt-row__badge unpublished" data-unpublished>not published</span>{/if}
			<span class="questions" data-questions>{plural(card.questions, "question")}</span>
			{#if card.replacedBy}
				{@const to = card.replacedBy.href}
				<!-- A span, not a link: the row is a button, and this sits above its tap zones. -->
				<span class="replaced" role="link" tabindex="0" onclick={(e) => (e.stopPropagation(), go(to))} onkeydown={(e) => e.key === "Enter" && go(to)} data-replaced-by
					>Replaced by {card.replacedBy.title || "Untitled"}</span
				>
			{/if}
		{/snippet}
		<span class="foot" data-foot>
			<span class="facts"
				><IdentityPill who={card.maker} />{#if card.created}<span class="fact" data-created>· Created {created(card.created)}</span><span class="fact" data-submissions
						>· {plural(card.answers, "submission")}</span
					>{/if}{#if card.lastAt}<span class="fact last" title="Last submitted {saved(card.lastAt)}" data-last>· {ago(card.lastAt)}</span>{/if}</span
			>
		</span>
		{#snippet end()}
			<span class="end" aria-hidden="true"><span class="fill-label">Fill out</span><span class="rt-row__cell rt-row__cell--chevron"><GoChevron /></span></span>
		{/snippet}
	</RowShell>
</div>

<style>
	/* On the icon's left corner, so a longer count grows right across the icon: a 1,000+ still clears the title. */
	.rt-count-badge {
		left: -8px;
		right: auto;
	}
	/* Only the zones are live: the row itself neither lights nor points. Gold: a plugin sits one level under the
	   white company card. */
	.split :global(.rt-row) {
		cursor: default;
		border-color: var(--rt-yellow);
	}
	.whole .zone {
		width: 100%;
	}
	.none {
		opacity: 0.3;
	}
	.grey {
		filter: grayscale(1);
		opacity: 0.6;
	}
	.unpublished {
		border-color: #8a857b;
		color: #8a857b;
	}
	.foot {
		display: flex;
		align-items: center;
		margin-top: 0.4rem;
		padding-bottom: 0.5rem;
		color: #c9c3b7;
		font-size: 0.95rem;
	}
	.facts {
		display: flex;
		min-width: 0;
		flex-wrap: wrap;
		align-items: center;
		column-gap: 0.5rem;
	}
	.fact {
		white-space: nowrap;
	}
	.last {
		color: var(--rt-sage);
	}
	.replaced {
		position: relative;
		z-index: 3;
		color: var(--rt-yellow);
		text-decoration: underline;
		cursor: pointer;
	}
	.questions {
		color: var(--rust);
		font-weight: 600;
		white-space: nowrap;
	}
	.end {
		display: flex;
		align-items: center;
	}
	/* The right half names what it does only while the pointer is on it. */
	.fill-label {
		margin-right: 1rem;
		color: var(--rt-yellow);
		font-family: var(--rt-font-display);
		font-size: 1.15rem;
		opacity: 0;
		transition: opacity 120ms;
	}
	.split:has(.rt-row__half--open:hover) .fill-label {
		opacity: 1;
	}
	.pressed {
		animation: press 1s ease-out;
	}
	@keyframes press {
		0% {
			transform: scale(0.98);
			box-shadow: inset 0 3px 10px rgb(0 0 0 / 0.6);
			background: color-mix(in srgb, var(--rt-yellow) 45%, transparent);
		}
		100% {
			transform: none;
			box-shadow: inset 0 0 0 rgb(0 0 0 / 0);
			background: color-mix(in srgb, var(--rt-yellow) 10%, transparent);
		}
	}
</style>
