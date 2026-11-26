<!-- One plugin as every Get Cache list draws it, phone and Ops alike: the left half folds its submissions open, the
     right fills the form out. With nothing to fold, the whole pill fills it out. -->
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
	import IdentityPill from "./IdentityPill.svelte";
	import NestPill from "./NestPill.svelte";
	import { ago } from "./ago";
	import { m as t } from "$parent/src/lib/paraglide/messages";
	import { getLocale } from "$parent/src/lib/paraglide/runtime";

	let { card, href, go, fold }: { card: PluginCardData; href: string; go: (href: string) => void; fold?: { open: boolean; toggle: () => void } } = $props();

	const created = (iso: string) => new Date(iso).toLocaleDateString(getLocale(), { day: "numeric", month: "short", year: "numeric" });
	const saved = (iso: string) => new Date(iso).toLocaleString(getLocale(), { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
	const num = (n: number) => n.toLocaleString(getLocale());
	const submissions = (n: number) => t.gc_plugin_submissions({ count: n, shown: num(n) });
	const title = $derived(card.title || t.gc_plugin_untitled());
</script>

<NestPill
	stack="middle"
	open={fold ? (card.answers ? fold.open : null) : undefined}
	ontoggle={fold && card.answers ? fold.toggle : undefined}
	ongo={() => go(href)}
	goLabel={t.gc_plugin_fill_out_named({ title })}
>
	{#snippet glyph()}
		<span class="glyph">
			<img src={card.icon} alt="" crossorigin="anonymous" class:grey={card.past} />
			{#if card.answers}<span class="rt-count-badge" aria-label={submissions(card.answers)} data-answers>{num(card.answers)}</span>{/if}
		</span>
	{/snippet}
	<span class="nest-line">{title}</span>
	<span class="nest-line nest-meta">
		{#if !card.created}<span class="nest-muted" data-unpublished>{t.gc_plugin_not_published()}</span>{/if}
		<span class="nest-time" data-questions>{t.gc_plugin_questions({ count: card.questions, shown: num(card.questions) })}</span>
		{#if card.replacedBy}
			{@const to = card.replacedBy.href}
			<!-- A span, not a link: it sits inside the pill's button. -->
			<span class="replaced" role="link" tabindex="0" onclick={(e) => (e.stopPropagation(), go(to))} onkeydown={(e) => e.key === "Enter" && (e.stopPropagation(), go(to))} data-replaced-by
				>{t.gc_plugin_replaced_by({ title: card.replacedBy.title || t.gc_plugin_untitled() })}</span
			>
		{/if}
	</span>
	<span class="nest-line nest-meta facts" data-foot
		><IdentityPill who={card.maker} />{#if card.created}<span data-created>· {t.gc_plugin_created({ date: created(card.created) })}</span><span data-submissions>· {submissions(card.answers)}</span
			>{/if}{#if card.lastAt}<span class="nest-sage" title={t.gc_plugin_last_submitted({ when: saved(card.lastAt) })} data-last>· {ago(card.lastAt)}</span>{/if}</span
	>
</NestPill>

<style>
	.glyph {
		position: relative;
		flex: none;
		display: flex;
		margin-left: 6px;
	}
	.glyph img {
		width: 34px;
		height: 34px;
		object-fit: contain;
	}
	/* On the icon's left corner, so a longer count grows right across the icon: a 1,000+ still clears the title. */
	.rt-count-badge {
		left: -8px;
		right: auto;
	}
	.grey {
		filter: grayscale(1);
		opacity: 0.6;
	}
	.facts > * {
		margin-right: 0.4em;
	}
	.replaced {
		color: var(--rt-yellow);
		text-decoration: underline;
		cursor: pointer;
	}
</style>
