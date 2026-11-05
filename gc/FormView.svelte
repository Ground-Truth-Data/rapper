<script lang="ts">
	import type { Model, PanelModel, Question } from 'survey-core';
	import type { Definition } from './form';
	import { loadSurvey } from './formSurvey';

	let { definition, onsubmit, keep = async (f: File) => f.name }: {
		definition: Definition;
		onsubmit: (data: Record<string, unknown>) => void;
		/** Saves a photo and returns its blob key: answers never hold the picture itself. */
		keep?: (file: File) => Promise<string>;
	} = $props();

	let model = $state.raw<Model>();
	let tick = $state(0);
	let failed = $state('');
	let at = $state(0);
	$effect(() => {
		const def = $state.snapshot(definition);
		loadSurvey().then(({ Model }) => {
			const m = new Model(def);
			m.onValueChanged.add(() => tick++);
			m.onDynamicPanelAdded.add(() => tick++);
			m.onDynamicPanelRemoved.add(() => tick++);
			model = m;
			at = 0;
			tick++;
		}, (e) => (failed = e.message));
	});

	type View = { q: Question; type: string; input: string; title: string; description: string; required: boolean; visible: boolean; value: unknown; errors: string[];
		choices: { value: unknown; text: string }[]; panels: { p: PanelModel; items: View[] }[] };
	const view = (q: Question): View => ({
		q, type: q.getType(), input: q.inputType, title: q.title, description: q.description,
		required: q.isRequired, visible: q.isVisible, value: q.value,
		errors: q.errors.map((e) => e.getText()),
		choices: (q.visibleChoices ?? []).map((c: { value: unknown; text: string }) => ({ value: c.value, text: c.text })),
		panels: (q.panels ?? []).map((p: PanelModel) => ({ p, items: p.questions.map(view) })),
	});
	// One page per section: the form's head and its loose fields first, then each panel; a loose field after a
	// panel stays on that panel's page, so the builder's order holds. A fresh view each change: survey-core's
	// objects are not reactive.
	type Page = { title?: string; description?: string; items: View[] };
	const pages = $derived.by<Page[]>(() => {
		if (!tick || !model) return [];
		const out: Page[] = [{ title: definition.title, description: definition.description, items: [] }];
		for (const e of model.pages[0].elements) {
			if (e.isPanel) out.push({ title: (e as PanelModel).title, description: (e as PanelModel).description, items: (e as PanelModel).questions.map(view) });
			else out.at(-1)!.items.push(view(e as Question));
		}
		return out.length > 1 && !out[0].items.length ? out.slice(1) : out;
	});
	const page = $derived(pages[Math.min(at, pages.length - 1)]);
	let top = $state<HTMLElement>();
	// A new page starts at its top, not where the last one was left.
	$effect(() => void (at, top?.scrollIntoView({ block: 'nearest' })));
	const last = $derived(at >= pages.length - 1);

	const set = (q: Question, v: unknown) => (q.value = v === '' ? undefined : v);
	const toggle = (v: View, c: unknown, on: boolean) => set(v.q, on ? [...((v.value as unknown[]) ?? []), c] : ((v.value as unknown[]) ?? []).filter((x) => x !== c));
	// The picture itself stays on the device; the thumbnail is this page's own copy of it.
	let thumbs = $state<Record<string, string>>({});
	async function photo(q: Question, file?: File) {
		if (!file) return;
		set(q, [{ name: file.name, type: file.type, content: await keep(file) }]);
		if (thumbs[q.id]) URL.revokeObjectURL(thumbs[q.id]);
		thumbs[q.id] = URL.createObjectURL(file);
	}
	// survey-core files a definition's panelAddText under its current name, addPanelText.
	const addText = (q: Question) => (q.toJSON() as { addPanelText?: string }).addPanelText ?? '+ Add another';
	function locate(q: Question) {
		navigator.geolocation.getCurrentPosition(
			({ coords }) => set(q, { lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy }),
			(e) => console.warn('[forms] gps', e.message),
			{ enableHighAccuracy: true, timeout: 20_000 },
		);
	}

	// Folded by default except the newest entry; an entry holding an error always opens.
	let open = $state<Record<string, boolean>>({});
	const isOpen = (e: { p: PanelModel; items: View[] }, i: number, n: number) => e.items.some((v) => v.errors.length) || (open[e.p.id] ?? i === n - 1);
	function add(q: Question) {
		open = {};
		q.addPanel();
	}
	const summary = (items: View[]) =>
		items.filter((v) => v.value != null && typeof v.value !== 'object').map((v) => (typeof v.value === 'number' ? `${v.title} ${v.value}` : String(v.value))).join(' · ') || 'empty';

	const valid = (p: Page) => p.items.filter((v) => v.visible).map((v) => v.q.validate(true)).every(Boolean);
	function go(e: SubmitEvent) {
		e.preventDefault();
		if (!last) {
			if (valid(page)) at++;
		} else if (model?.validate(true)) onsubmit(model.data);
		else at = Math.max(0, pages.findIndex((p) => p.items.some((v) => v.q.errors.length)));
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
			{#if v.type === 'text'}
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
			{:else if v.type === 'gps'}
				<div class="choices">
					<button type="button" class="link" onclick={() => locate(v.q)}>Use where I am</button>
					{#if v.value}{@const g = v.value as { lat: number; lng: number }}<span class="muted" data-gps>{g.lat.toFixed(5)}, {g.lng.toFixed(5)}</span>{/if}
				</div>
			{:else if v.type === 'paneldynamic'}
				{#each v.panels as entry, i (entry.p.id)}
					{@const shown = isOpen(entry, i, v.panels.length)}
					{@const name = `${v.title} ${i + 1}`}
					<div class="entry" data-entry={i + 1}>
						<button type="button" class="fold" aria-expanded={shown} onclick={() => (open[entry.p.id] = !shown)} data-fold>
							<svg class="chev" viewBox="0 0 20 20" aria-hidden="true"><path d="M7 4l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" /></svg>
							<span class="name font-display">{name}</span>
							{#if !shown}<span class="summary" data-summary>{summary(entry.items)}</span>{/if}
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
					<span class="muted" data-step>{at + 1} / {pages.length}</span>
				</div>
				<div class="steps" style:--n={pages.length}>{#each pages as _, i (i)}<span class:done={i <= at}></span>{/each}</div>
			</div>
		{/if}
		<div class="head" data-section={at + 1}>
			{#if pages.length > 1}<span class="badge">Section {at + 1} of {pages.length}</span>{/if}
			{#if page.title}<h2 class="font-display">{page.title}</h2>{/if}
			{#if page.description}<span class="desc">{page.description}</span>{/if}
		</div>
		{#each page.items as v (v.q.id)}{@render field(v)}{/each}
		<div class="nav">
			{#if at > 0}<button type="button" class="back font-display" onclick={() => at--} data-back>Back</button>{/if}
			<button class="next font-display" data-next>{last ? 'Save' : 'Next'}</button>
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
	.link { align-self: flex-start; text-decoration: underline; }
	.big {
		display: flex; align-items: center; justify-content: center; border: 2px solid var(--rt-yellow);
		border-radius: 0.75rem; color: var(--rt-yellow); cursor: pointer;
	}
	.camera { width: 7rem; height: 7rem; overflow: hidden; }
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
	.inside { display: flex; flex-direction: column; gap: 0.75rem; padding: 0 0.875rem 0.875rem; }
	.remove { align-self: flex-end; min-height: 2.75rem; padding: 0 0.75rem; color: var(--rt-fg-muted); }
	.add {
		display: flex; align-items: center; justify-content: center; gap: 0.6rem; min-height: 3.4rem; border: 2px solid var(--rt-sage); border-radius: 0.875rem;
		background: color-mix(in srgb, var(--rt-sage) 18%, transparent); color: var(--rt-fg); font-size: 1.05rem;
	}
	.plus { width: 1.5rem; height: 1.5rem; border-radius: 999px; background: var(--rt-sage); color: #161a10; line-height: 1.5rem; text-align: center; }
	.muted { color: var(--rt-fg-muted); font-size: 0.875rem; }
	.req { margin-left: 0.3em; color: #ff4d55; font-size: 1.2em; font-weight: 800; line-height: 0; vertical-align: -0.15em; }
	.error { color: var(--rt-yellow); font-size: 0.875rem; }
	.nav { display: flex; gap: 0.6rem; padding-top: 0.5rem; }
	.nav button { min-height: 3.4rem; border-radius: 1rem; font-size: 1.1rem; }
	.back { padding: 0 1.4rem; border: 2px solid var(--rt-fg-muted); }
	.next { flex: 1; background: var(--rt-yellow); color: #1c1a12; }
</style>
