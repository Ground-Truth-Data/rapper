<script lang="ts">
	import { untrack } from 'svelte';
	import type { Model, PanelModel, Question } from 'survey-core';
	import { type Definition, type El, FIX, type Fix, type Trigger } from './form';
	import IdentityPill from './IdentityPill.svelte';
	import { loadSurvey } from './formSurvey';
	import arrow from '$rig/assets/arrowIconGold.webp';

	type Draft = { data: Record<string, unknown>; path: number[] };
	/** One of the filler's contacts, as a Person question offers them: the answer is the key. */
	type Person = { key: string; name: string; color: string; picked: boolean };
	let { definition, onsubmit, keep = async (f: File) => f.name, draft, onchange, people = [] }: {
		definition: Definition;
		onsubmit: (data: Record<string, unknown>) => void;
		/** Where the planter left off: the form opens on it. */
		draft?: Draft;
		/** Every answer or page turn, so the host can keep the form across a closed app. */
		onchange?: (d: Draft) => void;
		/** Saves a photo and returns its blob key: answers never hold the picture itself. */
		keep?: (file: File) => Promise<string>;
		/** The host's contacts: rapper reaches no store. */
		people?: Person[];
	} = $props();
	// survey-core drops a property it doesn't know, so a Person question is found in the definition itself.
	const persons = $derived.by(() => {
		const walk = (els: El[]): string[] => els.flatMap((e) => [...(e.contacts ? [e.name] : []), ...walk((e.templateElements ?? e.elements ?? []) as El[])]);
		return new Set(walk(definition.elements));
	});
	let find = $state<Record<string, string>>({});
	const nameOf = (key: unknown) => people.find((p) => p.key === key)?.name ?? 'someone not in your contacts';

	let model = $state.raw<Model>();
	let tick = $state(0);
	let failed = $state('');
	// The sections actually visited, so Back retraces a branch instead of stepping to the page before.
	let path = $state([0]);
	const at = $derived(path.at(-1)!);
	type Rule = Trigger & { holds: (data: Record<string, unknown>) => boolean; on: string[] };
	let rules = $state.raw<Rule[]>([]);
	$effect(() => {
		// Our pages follow the triggers; survey-core's own would act on its single page instead.
		const { triggers = [], ...def } = $state.snapshot(definition);
		// A dropdown without choices would drop its personKey; survey-core keeps a Person answer as text.
		const plain = (els: El[]): El[] =>
			els.map((e) => ({ ...e, ...(e.contacts ? { type: 'text' } : {}), ...(e.elements ? { elements: plain(e.elements as El[]) } : {}), ...(e.templateElements ? { templateElements: plain(e.templateElements as El[]) } : {}) }));
		loadSurvey().then(({ Model, ExpressionRunner }) => {
			const m = new Model({ ...def, elements: plain(def.elements) });
			m.onValueChanged.add(() => tick++);
			m.onDynamicPanelAdded.add((_, { panel }) => {
				void fixEntry(panel);
				tick++;
			});
			m.onDynamicPanelRemoved.add(() => tick++);
			rules = triggers.map((t) => {
				const run = new ExpressionRunner(t.expression);
				return { ...t, holds: (data) => run.runValues(data) === true, on: run.getVariables() };
			});
			const from = untrack(() => draft);
			if (from) m.data = from.data;
			// An entry the form opens with is never "added", so it is located here; a draft's keep their fix.
			for (const q of m.getAllQuestions()) for (const p of (q.panels ?? []) as PanelModel[]) if (!fixOf(p)) void fixEntry(p);
			model = m;
			path = from?.path.length ? from.path : [0];
			opened = JSON.stringify({ data: m.data, path });
			tick++;
		}, (e) => (failed = e.message));
	});
	// A form as it opened is not a change: an untouched one never becomes a draft.
	let opened = '';
	$effect(() => {
		if (!tick || !model) return;
		const d = { data: model.data, path: [...path] };
		if (JSON.stringify(d) !== opened) untrack(() => onchange?.(d));
	});

	type View = { q: Question; type: string; input: string; title: string; description: string; required: boolean; visible: boolean; value: unknown; errors: string[];
		choices: { value: unknown; text: string }[]; panels: { p: PanelModel; items: View[]; stamped: boolean }[] };
	const view = (q: Question): View => ({
		q, type: q.getType(), input: q.inputType, title: q.title, description: q.description,
		required: q.isRequired, visible: q.isVisible, value: q.value,
		errors: q.errors.map((e) => e.getText()),
		choices: (q.visibleChoices ?? []).map((c: { value: unknown; text: string }) => ({ value: c.value, text: c.text })),
		panels: (q.panels ?? []).map((p: PanelModel) => ({ p, items: p.questions.map(view), stamped: !!fixOf(p) })),
	});
	// One page per section: the form's head and its loose fields first, then each panel; a loose field after a
	// panel stays on that panel's page, so the builder's order holds. A fresh view each change: survey-core's
	// objects are not reactive.
	type Page = { name?: string; title?: string; description?: string; items: View[] };
	// A refused or missing fix leaves the answer unstamped; it never stops the form.
	const locate = () =>
		new Promise<{ lat: number; lng: number; accuracy: number } | undefined>((done) => {
			const no = (why: string) => (console.warn('[forms] gps', why), done(undefined));
			if (!navigator.geolocation) return no('no geolocation here');
			navigator.geolocation.getCurrentPosition(
				({ coords }) => done({ lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy }),
				(e) => no(e.message),
				{ enableHighAccuracy: true, timeout: 20_000 },
			);
		});
	const fixOf = (p: PanelModel) => (p.data as unknown as { getValue: (k: string) => unknown }).getValue(FIX);
	const toFix = (s: { lat: number; lng: number; accuracy: number }): Fix => ({ lat: s.lat, lng: s.lng, accuracyM: s.accuracy });
	// An entry is located once, as it is added.
	async function fixEntry(panel: PanelModel) {
		const s = await locate();
		if (!s) return;
		(panel.data as unknown as { setValue: (k: string, v: unknown) => void }).setValue(FIX, toFix(s));
		tick++;
	}
	// The answer is located as it is saved.
	async function stamp() {
		const s = await locate();
		if (!s) return;
		model!.setValue(FIX, toFix(s));
	}
	const pages = $derived.by<Page[]>(() => {
		if (!tick || !model) return [];
		const out: Page[] = [{ title: definition.title, description: definition.description, items: [] }];
		for (const e of model.pages[0].elements) {
			if (e.isPanel) out.push({ name: e.name, title: (e as PanelModel).title, description: (e as PanelModel).description, items: (e as PanelModel).questions.map(view) });
			else out.at(-1)!.items.push(view(e as Question));
		}
		return out.length > 1 && !out[0].items.length ? out.slice(1) : out;
	});
	const page = $derived(pages[Math.min(at, pages.length - 1)]);
	// Only a trigger asked on this page acts as it is left, so a skip taken earlier never fires again.
	const fired = $derived(tick && page && model ? rules.filter((r) => r.on.some((k) => page.items.some((v) => v.q.name === k)) && r.holds(model!.data)) : []);
	const ends = $derived(fired.some((r) => r.type === 'complete'));
	const next = $derived.by(() => {
		const to = pages.findIndex((p) => p.name && p.name === fired.find((r) => r.type === 'skip')?.gotoName);
		return to > at ? to : at + 1;
	});
	let top = $state<HTMLElement>();
	// A new page starts at its top, not where the last one was left.
	$effect(() => {
		void at;
		top?.scrollIntoView({ block: 'nearest' });
	});
	const last = $derived(ends || at >= pages.length - 1);
	// Steps taken, plus the sections left if none is skipped.
	const steps = $derived(path.length + (last ? 0 : pages.length - 1 - at));

	const set = (q: Question, v: unknown) => (q.value = v === '' ? undefined : v);
	const toggle = (v: View, c: unknown, on: boolean) => set(v.q, on ? [...((v.value as unknown[]) ?? []), c] : ((v.value as unknown[]) ?? []).filter((x) => x !== c));
	// The picture itself stays on the device; the thumbnail is this page's own copy of it.
	let thumbs = $state<Record<string, string>>({});
	// The photo's ⓘ: said only when asked.
	let told = $state<Record<string, boolean>>({});
	async function photo(q: Question, file?: File) {
		if (!file) return;
		set(q, [{ name: file.name, type: file.type, content: await keep(file) }]);
		if (thumbs[q.id]) URL.revokeObjectURL(thumbs[q.id]);
		thumbs[q.id] = URL.createObjectURL(file);
	}
	// survey-core files a definition's panelAddText under its current name, addPanelText.
	const addText = (q: Question) => (q.toJSON() as { addPanelText?: string }).addPanelText ?? '+ Add another';

	// Folded by default except the newest entry; an entry holding an error always opens.
	let open = $state<Record<string, boolean>>({});
	const isOpen = (e: { p: PanelModel; items: View[] }, i: number, n: number) => e.items.some((v) => v.errors.length) || (open[e.p.id] ?? i === n - 1);
	function add(q: Question) {
		open = {};
		q.addPanel();
	}
	const summary = (items: View[]) =>
		items
			.filter((v) => v.value != null && typeof v.value !== 'object')
			.map((v) => (persons.has(v.q.name) ? nameOf(v.value) : typeof v.value === 'number' ? `${v.title} ${v.value}` : String(v.value)))
			.join(' · ') || 'empty';

	const valid = (p: Page) => p.items.filter((v) => v.visible).map((v) => v.q.validate(true)).every(Boolean);
	async function go(e: SubmitEvent) {
		e.preventDefault();
		if (!last) {
			if (valid(page)) path = [...path, next];
		} else {
			await stamp();
			// Only the sections on the path count: a skipped one is neither checked nor sent.
			const bad = path.find((i) => !valid(pages[i]));
			if (bad == null) {
				const off = new Set(pages.filter((_, i) => !path.includes(i)).flatMap((p) => p.items.map((v) => v.q.name)));
				onsubmit(Object.fromEntries(Object.entries(model!.data).filter(([k]) => !off.has(k))));
			} else path = path.slice(0, path.indexOf(bad) + 1);
		}
		tick++;
	}
</script>

{#snippet field(v: View)}
	{#if v.visible}
		<div class="field" data-field={v.q.name}>
			<span class="label font-display"
				>{v.title}{#if v.required}<span class="req">*</span>{/if}{#if v.type === 'paneldynamic'}<span class="count" data-count>{v.panels.length}</span>{/if}</span
			>
			{#if v.description}<span class="muted">{v.description}</span>{/if}
			{#if persons.has(v.q.name)}
				{@const q = (find[v.q.id] ?? '').trim().toLowerCase()}
				<input type="search" aria-label={v.title} placeholder="Search your contacts" bind:value={find[v.q.id]} />
				<div class="people" data-people>
					{#each people.filter((p) => !q || p.name.toLowerCase().includes(q)) as p (p.key)}
						<button type="button" class="person" class:on={p.key === v.value} aria-pressed={p.key === v.value} onclick={() => set(v.q, p.key === v.value ? '' : p.key)} data-person={p.key}
							><IdentityPill who={{ label: p.name, color: p.color, self: false, picked: p.picked }} /></button
						>
					{/each}
				</div>
				{#if v.value != null && !people.some((p) => p.key === v.value)}<span class="muted">{nameOf(v.value)}</span>{/if}
			{:else if v.type === 'text'}
				<input aria-label={v.title} type={v.input === 'number' || v.input === 'date' ? v.input : 'text'} value={v.value ?? ''}
					onchange={(e) => set(v.q, v.input === 'number' && e.currentTarget.value !== '' ? Number(e.currentTarget.value) : e.currentTarget.value)} />
			{:else if v.type === 'dropdown'}
				<select aria-label={v.title} value={v.value ?? ''} onchange={(e) => set(v.q, e.currentTarget.value)}>
					<option value=""></option>
					{#each v.choices as c (c.value)}<option value={c.value}>{c.text}</option>{/each}
				</select>
			{:else if v.type === 'radiogroup' || v.type === 'checkbox'}
				<div class="choices">
					{#each v.choices as c (c.value)}
						<label>
							{#if v.type === 'radiogroup'}
								<input type="radio" name={v.q.id} checked={v.value === c.value} onchange={() => set(v.q, c.value)} />
							{:else}
								<input type="checkbox" checked={((v.value as unknown[]) ?? []).includes(c.value)} onchange={(e) => toggle(v, c.value, e.currentTarget.checked)} />
							{/if}
							{c.text}
						</label>
					{/each}
				</div>
			{:else if v.type === 'file'}
				<div class="shot">
				<label class="big camera" data-camera>
					<input type="file" accept="image/*" capture="environment" aria-label={v.title} onchange={(e) => photo(v.q, e.currentTarget.files?.[0])} />
					{#if thumbs[v.q.id] && v.value}
						<img src={thumbs[v.q.id]} alt="" data-thumb />
					{:else}
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
							><path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" /><circle cx="12" cy="13" r="3.5" /></svg
						>
					{/if}
				</label>
				<button type="button" class="info" aria-label="Where this photo is kept" aria-expanded={!!told[v.q.id]} onclick={() => (told[v.q.id] = !told[v.q.id])} data-photo-info>i</button>
				</div>
				{#if told[v.q.id]}<span class="muted" data-photo-note>Only on this phone until you send it.</span>{/if}
			{:else if v.type === 'paneldynamic'}
				{#each v.panels as entry, i (entry.p.id)}
					{@const shown = isOpen(entry, i, v.panels.length)}
					{@const name = `${v.title} ${i + 1}`}
					<div class="entry" data-entry={i + 1}>
						<button type="button" class="fold" aria-expanded={shown} onclick={() => (open[entry.p.id] = !shown)} data-fold>
							<svg class="chev" viewBox="0 0 20 20" aria-hidden="true"><path d="M7 4l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" /></svg>
							<span class="name font-display">{name}</span>
							{#if !shown}<span class="summary" data-summary>{summary(entry.items)}</span>{/if}
							{#if entry.stamped}
								<svg class="gem" viewBox="0 0 24 24" role="img" aria-label="GPS stamped" data-gps-mark
									><path d="M6 4h12l4 5-10 11L2 9z M2 9h20 M9 4l-2 5 5 11 5-11-2-5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" /></svg
								>
							{/if}
						</button>
						{#if shown}
							<div class="inside">
								{#each entry.items as item (item.q.id)}{@render field(item)}{/each}
								<button type="button" class="remove" onclick={() => v.q.removePanel(entry.p)} data-remove>Remove {name}</button>
							</div>
						{/if}
					</div>
				{/each}
				<button type="button" class="add font-display" onclick={() => add(v.q)} data-add><span class="plus">+</span>{addText(v.q).replace(/^\+\s*/, '')}</button>
			{/if}
			{#each v.errors as e (e)}<span class="error" data-error>{e}</span>{/each}
		</div>
	{/if}
{/snippet}

{#if failed}
	<p class="muted">{failed}</p>
{:else if !model || !page}
	<p class="muted">Opening the form…</p>
{:else}
	<form class="form" onsubmit={go} novalidate data-form>
		{#if pages.length > 1}
			<div class="top" bind:this={top}>
				<div class="topline">
					<span class="font-display">{definition.title ?? ''}</span>
					<span class="muted" data-step>{path.length} / {steps}</span>
				</div>
				<div class="steps" style:--n={steps}>{#each { length: steps }, i (i)}<span class:done={i < path.length}></span>{/each}</div>
			</div>
		{/if}
		<div class="head" data-section={at + 1}>
			{#if pages.length > 1}<span class="badge">Section {at + 1} of {pages.length}</span>{/if}
			{#if page.title}<h2 class="font-display">{page.title}</h2>{/if}
			{#if page.description}<span class="desc">{page.description}</span>{/if}
		</div>
		{#each page.items as v (v.q.id)}{@render field(v)}{/each}
		{#if tick && !model.getValue(FIX)}<span class="muted stamped" data-gps-stamp>Your location is stamped when you save</span>{/if}
		<div class="nav">
			{#if at > 0}<button type="button" class="back font-display" onclick={() => (path = path.slice(0, -1))} data-back>Back</button>{/if}
			<button class="rt-fancy-btn next" data-next>{last ? 'Save' : 'Next'}{#if !last}<span class="go" style="--src: url({arrow})"></span>{/if}</button>
		</div>
	</form>
{/if}

<style>
	/* gc/mobile.css's tokens: both Get Cache and Ops load it. Gold heads the form and its sections, every field is
	   rust, a nested entry's are sage — as in the inbox. */
	.form { display: flex; flex-direction: column; gap: 0.875rem; max-width: 36rem; }
	.top { display: flex; flex-direction: column; gap: 0.6rem; padding-bottom: 0.75rem; border-bottom: var(--rule-row); }
	.topline { display: flex; justify-content: space-between; align-items: center; color: var(--rt-yellow); }
	.steps { display: grid; grid-template-columns: repeat(var(--n), minmax(0, 1fr)); gap: 0.4rem; }
	.steps span { height: 5px; border-radius: 999px; background: color-mix(in srgb, var(--rt-fg-muted) 30%, transparent); }
	.steps .done { background: var(--rt-yellow); }
	.head {
		display: flex; flex-direction: column; gap: 0.6rem; padding: 1.1rem 1.25rem; border: 2px solid var(--rt-yellow); border-radius: 1.25rem;
		background: color-mix(in srgb, var(--rt-yellow) 6%, transparent);
	}
	.badge {
		align-self: flex-start; padding: 0.25rem 0.75rem; border-radius: 999px; background: color-mix(in srgb, var(--rt-yellow) 20%, transparent);
		color: var(--rt-yellow); font-size: 0.875rem; font-weight: 700;
	}
	.head h2 { font-size: 1.75rem; line-height: 1.15; }
	.desc { color: var(--rt-fg-muted); }
	.field { display: flex; flex-direction: column; gap: 0.5rem; }
	.form > .field { padding: 1rem; border: 2px solid var(--rt-rust); border-radius: 1.1rem; }
	.label { font-size: 1.1rem; }
	.form > .field > .label { color: var(--rt-rust); }
	.entry .label { color: var(--rt-sage); font-size: 1rem; }
	.choices { display: flex; flex-wrap: wrap; align-items: center; gap: 0.25rem 1rem; }
	.choices label { display: flex; align-items: center; gap: 0.25rem; }
	.field :is(input:not([type="radio"], [type="checkbox"], [type="file"]), select) {
		min-height: 3rem; border: var(--rule-row); border-radius: 0.75rem; background: var(--rt-panel); color: inherit; padding: 0 0.875rem; font-size: 1.05rem;
	}
	.big {
		display: flex; align-items: center; justify-content: center; border: 2px solid var(--rt-yellow);
		border-radius: 0.75rem; color: var(--rt-yellow); cursor: pointer;
	}
	.camera { width: 7rem; height: 7rem; overflow: hidden; }
	.shot { display: flex; align-items: flex-end; gap: 0.6rem; }
	.info { width: 1.25rem; height: 1.25rem; border: 1.5px solid var(--rt-yellow); border-radius: 999px; color: var(--rt-yellow); font: 700 0.75rem/1 serif; font-style: italic; }
	.camera input { position: absolute; opacity: 0; width: 1px; height: 1px; }
	.camera svg { width: 3.5rem; height: 3.5rem; }
	.camera img { width: 100%; height: 100%; object-fit: cover; }
	.label:has(.count) { display: flex; align-items: center; }
	.count {
		margin-left: auto; min-width: 1.75rem; height: 1.75rem; padding: 0 0.5rem; border-radius: 999px; display: flex; align-items: center;
		justify-content: center; background: var(--rt-sage); color: #161a10; font-weight: 800; font-size: 0.875rem;
	}
	.entry { display: flex; flex-direction: column; border: 2px solid var(--rt-sage); border-radius: 1rem; }
	.fold { display: flex; align-items: center; gap: 0.6rem; min-height: 3.25rem; padding: 0 0.875rem; text-align: left; }
	.chev { flex: none; width: 1rem; height: 1rem; color: var(--rt-sage); transition: transform 0.15s; }
	[aria-expanded="true"] > .chev { transform: rotate(90deg); }
	.name { color: var(--rt-sage); font-size: 1.05rem; }
	.summary { flex: 1; min-width: 0; text-align: right; color: var(--rt-fg-muted); font-size: 0.875rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.gem { flex: none; width: 1.125rem; height: 1.125rem; margin-left: auto; color: #ede7da; }
	.summary + .gem { margin-left: 0; }
	.inside { display: flex; flex-direction: column; gap: 0.75rem; padding: 0 0.875rem 0.875rem; }
	.remove { align-self: flex-end; min-height: 2.75rem; padding: 0 0.75rem; color: var(--rt-fg-muted); }
	.add {
		display: flex; align-items: center; justify-content: center; gap: 0.6rem; min-height: 3.4rem; border: 2px solid var(--rt-sage); border-radius: 0.875rem;
		background: color-mix(in srgb, var(--rt-sage) 18%, transparent); color: var(--rt-fg); font-size: 1.05rem;
	}
	.plus { width: 1.5rem; height: 1.5rem; border-radius: 999px; background: var(--rt-sage); color: #161a10; line-height: 1.5rem; text-align: center; }
	.muted { color: var(--rt-fg-muted); font-size: 0.875rem; }
	.people { display: flex; flex-wrap: wrap; gap: 0.5rem; }
	.person { padding: 0.3rem; border: 2px solid transparent; border-radius: 999px; }
	.person.on { border-color: var(--rt-yellow); }
	.req { margin-left: 0.3em; color: #ff4d55; font-size: 1.2em; font-weight: 800; line-height: 0; vertical-align: -0.15em; }
	.error { color: #ff4d55; font-size: 0.875rem; }
	.nav { display: flex; gap: 0.6rem; padding-top: 0.5rem; }
	.nav button { min-height: 3.4rem; border-radius: 1rem; font-size: 1.1rem; }
	.back { padding: 0 1.4rem; border: 2px solid var(--rt-fg-muted); }
	.nav .next { flex: 1; display: flex; align-items: center; justify-content: center; gap: 0.6rem; font-size: 1.45rem; }
	/* The back button's drawn arrow, mirrored: a mask so it takes the label's colour. */
	.go { width: 2rem; height: 1.5rem; background: currentColor; mask: var(--src) center / contain no-repeat; transform: scaleX(-1); }
	.stamped { align-self: center; padding-top: 0.5rem; }
</style>
