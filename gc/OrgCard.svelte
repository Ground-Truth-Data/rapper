<!-- One organization, the same on the phone's Orgs tab and Ops' Organizations page: its logo, or its colour with
     two letters; its name; a line under it; a gold figure on the right. -->
<script lang="ts">
	import type { HTMLAttributes } from "svelte/elements";

	let {
		name,
		color = "",
		logo = "",
		sub = "",
		end = "",
		href,
		onclick,
		...rest
	}: { name: string; color?: string; logo?: string; sub?: string; end?: string; href?: string; onclick?: () => void } & HTMLAttributes<HTMLElement> = $props();
</script>

<svelte:element this={href ? "a" : "button"} {href} type={href ? undefined : "button"} class="org-card" {onclick} {...rest}>
	{#if logo}<img class="mark" src={logo} alt="" />{:else}<span class="mark" style:--sw={color || null}>{name.slice(0, 2).toUpperCase()}</span>{/if}
	<span class="who">
		<span class="name">{name}</span>
		{#if sub}<span class="sub">{sub}</span>{/if}
	</span>
	<span class="end">{end}</span>
</svelte:element>

<style>
	.org-card {
		display: flex;
		align-items: center;
		gap: 12px;
		width: 100%;
		min-height: 56px;
		padding: 10px 14px;
		border: none;
		border-top: 1px solid #2a2722;
		background: none;
		color: #ede6d6;
		text-align: left;
		text-decoration: none;
		font: inherit;
		cursor: pointer;
	}
	.org-card:first-child {
		border-top: none;
	}
	.mark {
		flex: none;
		width: 34px;
		height: 34px;
		border-radius: 8px;
		background: var(--sw, #3a352c);
		color: #121212;
		font-weight: 800;
		font-size: 13px;
		display: grid;
		place-items: center;
		object-fit: contain;
	}
	img.mark {
		background: #121212;
	}
	.who {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}
	.name {
		font-weight: 700;
		font-size: 16px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.sub {
		font-size: 12px;
		color: #a39a86;
	}
	.end {
		color: var(--rt-yellow);
		font-weight: 700;
	}
</style>
