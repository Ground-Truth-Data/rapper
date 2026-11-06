<!-- A page header's door to another list (Contacts, Orgs): a gold-outlined rectangle, so it never reads as a filter pill.
     --header-link-size scales it to stand as tall as the page's title. -->
<script lang="ts">
	let { href, icon, label }: { href: string; icon: string; label: string } = $props();
</script>

<a class="header-link" {href} aria-label={label}>
	<img src={icon} alt="" />
	<span class="label">{label}</span>
</a>

<style>
	.header-link {
		display: inline-flex;
		align-items: center;
		gap: 0.5em;
		padding: 0.55em 0.95em;
		border: 1.5px solid var(--rt-yellow);
		border-radius: 0.75rem;
		color: var(--rt-yellow);
		background: transparent;
		box-shadow: 0 2px 0 rgba(0, 0, 0, 0.25);
		text-decoration: none;
		font-family: var(--rt-font-display);
		font-size: var(--header-link-size, 1.05rem);
		line-height: 1;
		-webkit-tap-highlight-color: transparent;
	}
	.header-link:active {
		background: color-mix(in srgb, var(--rt-yellow) 12%, transparent);
	}
	.header-link img {
		height: 1.3em;
		width: auto;
	}
	.label {
		transform: translateY(1px);
	}
</style>
