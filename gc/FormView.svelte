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
	$effect(() => {
		const def = $state.snapshot(definition);
		loadSurvey().then(({ Model }) => {
			const m = new Model(def);
			m.onValueChanged.add(() => tick++);
			m.onDynamicPanelAdded.add(() => tick++);
			m.onDynamicPanelRemoved.add(() => tick++);
			model = m;
			tick++;
		}, (e) => (failed = e.message));
	});

	type View = { q: Question; type: string; input: string; title: string; description: string; section?: PanelModel; required: boolean; visible: boolean; value: unknown; errors: string[];
		choices: { value: unknown; text: string }[]; panels: { p: PanelModel; items: View[] }[] };
	const view = (q: Question): View => ({
		q, type: q.getType(), input: q.inputType, title: q.title, description: q.description,
		section: (q.parent as PanelModel | undefined)?.isPanel ? (q.parent as PanelModel) : undefined, required: q.isRequired, visible: q.isVisible, value: q.value,
		errors: q.errors.map((e) => e.getText()),
		choices: (q.visibleChoices ?? []).map((c: { value: unknown; text: string }) => ({ value: c.value, text: c.text })),
		panels: (q.panels ?? []).map((p: PanelModel) => ({ p, items: p.questions.map(view) })),
	});
	// A fresh view each change: survey-core's objects are not reactive.
	const top = $derived(tick && model ? model.getAllQuestions(false).filter((q) => !q.parentQuestion).map(view) : []);

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
	const addText = (q: Question) => (q.toJSON() as { addPanelText?: string }).addPanelText ?? '+ Add';
	function locate(q: Question) {
		navigator.geolocation.getCurrentPosition(
			({ coords }) => set(q, { lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy }),
			(e) => console.warn('[forms] gps', e.message),
			{ enableHighAccuracy: true, timeout: 20_000 },
		);
	}
	function submit(e: SubmitEvent) {
		e.preventDefault();
		if (model?.validate(true)) onsubmit(model.data);
		tick++;
	}
</script>

{#snippet field(v: View)}
	{#if v.visible}
		<div class="field" data-field={v.q.name}>
			<span class="font-display">{v.title}{#if v.required}<span class="req">*</span>{/if}</span>
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
				{#each v.panels as panel, i (panel.p.id)}
					<fieldset class="entry" data-entry={i + 1}>
						{#each panel.items as item (item.q.id)}{@render field(item)}{/each}
						<button type="button" class="trash" aria-label="Remove" onclick={() => v.q.removePanel(panel.p)} data-remove
							><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
								><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12M9 7V4h6v3" /></svg
							></button
						>
					</fieldset>
				{/each}
				<button type="button" class="big add font-display" onclick={() => v.q.addPanel()} data-add>{addText(v.q)}</button>
			{/if}
			{#each v.errors as e (e)}<span class="error" data-error>{e}</span>{/each}
		</div>
	{/if}
{/snippet}

{#if failed}
	<p class="muted">{failed}</p>
{:else if !model}
	<p class="muted">Opening the form…</p>
{:else}
	<form class="form" onsubmit={submit} novalidate data-form>
		{#if definition.title}<h2 class="font-display">{definition.title}</h2>{/if}
		{#each top as v, i (v.q.id)}
			{#if v.section && v.section !== top[i - 1]?.section}
				<div class="section" data-section={v.section.name}>
					<h3 class="font-display">{v.section.title}</h3>
					{#if v.section.description}<span class="muted">{v.section.description}</span>{/if}
				</div>
			{/if}
			{@render field(v)}
		{/each}
		<button class="rt-fancy-btn save font-display">Save</button>
	</form>
{/if}

<style>
	/* gc/mobile.css's tokens: both Get Cache and Ops load it. */
	.form { display: flex; flex-direction: column; gap: 1rem; max-width: 36rem; }
	.form h2 { font-size: 1.5rem; }
	.field, .entry { display: flex; flex-direction: column; gap: 0.25rem; }
	.entry { gap: 0.75rem; border: 0; border-left: 2px solid var(--rt-yellow); padding-left: 0.75rem; }
	.choices { display: flex; flex-wrap: wrap; align-items: center; gap: 0.25rem 1rem; }
	.choices label { display: flex; align-items: center; gap: 0.25rem; }
	.field :is(input:not([type="radio"], [type="checkbox"], [type="file"]), select) {
		border: var(--rule-row); border-radius: 0.25rem; background: var(--rt-panel); color: inherit; padding: 0.25rem 0.5rem;
	}
	.link { align-self: flex-start; text-decoration: underline; }
	.big {
		display: flex; align-items: center; justify-content: center; min-height: 4.5rem; border: 2px solid var(--rt-yellow);
		border-radius: 0.75rem; color: var(--rt-yellow); cursor: pointer;
	}
	.camera { width: 7rem; height: 7rem; overflow: hidden; }
	.camera input { position: absolute; opacity: 0; width: 1px; height: 1px; }
	.camera svg { width: 3.5rem; height: 3.5rem; }
	.camera img { width: 100%; height: 100%; object-fit: cover; }
	.add { font-size: 1.5rem; }
	.trash { align-self: flex-end; width: 2.5rem; height: 2.5rem; padding: 0.5rem; color: var(--rt-fg-muted); border-radius: 0.5rem; }
	.trash:hover { color: var(--rt-yellow); }
	.muted { color: var(--rt-fg-muted); font-size: 0.875rem; }
	.req { margin-left: 0.3em; color: #ff4d55; font-size: 1.2em; font-weight: 800; line-height: 0; vertical-align: -0.15em; }
	.section { margin-top: 0.75rem; padding-top: 0.75rem; border-top: 2px solid var(--rt-rust); }
	.section h3 { font-size: 1.3rem; color: var(--rt-rust); }
	.error { color: var(--rt-yellow); font-size: 0.875rem; }
	.save { align-self: flex-start; border-radius: 0.5rem; padding: 0.25rem 1rem; }
</style>
