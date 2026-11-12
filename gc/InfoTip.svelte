<!-- ⓘ beside a heading: a tap opens a short note under it, a tap anywhere else shuts it.
  `text` is paragraphs; *word* is gold, [label](href) a link. The note spans the
  nearest positioned ancestor, so this wrapper stays unpositioned. -->
<script lang="ts">
let { label, text }: { label: string; text: string[] } = $props();

let open = $state(false);
let btn = $state<HTMLButtonElement>();
let at = $state({ top: 0, arrow: 0 });
const parts = (p: string) => p.split(/(\*[^*]+\*|\[[^\]]+\]\([^)]+\))/).filter(Boolean);

function toggle() {
	if (btn) at = { top: btn.offsetTop + btn.offsetHeight + 4, arrow: btn.offsetLeft + btn.offsetWidth / 2 - 7 };
	open = !open;
}
</script>

<svelte:window onpointerdown={(e) => { if (open && !(e.target as Element).closest?.(".info-tip, .info-btn")) open = false; }} />

<button bind:this={btn} type="button" class="info-btn" aria-label={label} aria-expanded={open} onclick={toggle}>
	<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9.5" /><path d="M12 11v6" /><circle cx="12" cy="7.5" r="0.6" fill="currentColor" /></svg>
</button>
{#if open}
	<div class="info-tip" role="dialog" aria-label={label} style:top="{at.top}px" style:--arrow="{at.arrow}px">
		{#each text as p, i (i)}
			<span>{#each parts(p) as s, j (j)}{#if s.startsWith("*")}<em>{s.slice(1, -1)}</em>{:else if s.startsWith("[")}{@const [, t, href] = s.match(/\[([^\]]+)\]\(([^)]+)\)/) ?? []}<a {href}>{t}</a>{:else}{s}{/if}{/each}</span>
		{/each}
	</div>
{/if}

<style>
	.info-btn {
		all: unset;
		flex: none;
		cursor: pointer;
		width: 34px;
		height: 44px;
		/* Hugs the heading it explains; whatever follows in the row goes to the far end. */
		margin: -10px auto -10px -4px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		color: var(--rust);
	}
	.info-tip {
		position: absolute;
		left: 16px;
		right: 16px;
		z-index: 30;
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 14px 16px;
		background: rgba(0, 0, 0, 0.88);
		border: 1.5px solid rgba(255, 215, 0, 0.55);
		border-radius: 14px;
		box-shadow: 0 22px 50px rgba(0, 0, 0, 0.7);
		font-family: var(--rt-font-display);
		font-size: 17px;
		line-height: 1.3;
		text-align: left;
		color: var(--rt-fg);
		white-space: normal;
	}
	.info-tip::before {
		content: "";
		position: absolute;
		top: -8px;
		left: calc(var(--arrow) - 16px);
		width: 14px;
		height: 14px;
		background: #000;
		border-left: 1.5px solid rgba(255, 215, 0, 0.55);
		border-top: 1.5px solid rgba(255, 215, 0, 0.55);
		transform: rotate(45deg);
	}
	em {
		font-style: normal;
		color: var(--rt-yellow);
	}
	a {
		color: var(--rt-yellow);
		text-decoration: underline;
		text-underline-offset: 3px;
	}
</style>
