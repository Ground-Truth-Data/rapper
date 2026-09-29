<!--
    The tab icon, asked once from the root layout, off the SITES table's
    `icon` — a single answer to "which site is this?" instead of app.html's
    hardcoded dog plus five per-route overrides. app.html's own
    <link rel="icon"> is DELETED rather than left as a default, or a static
    default wins the race on first paint and every tab shows a ReTreever
    flash. This renders no chrome and hardcodes no brand, so it belongs in
    the brand-neutral root layout rather than in three group layouts.

    Admin takes an `override`: one host serves ReTreever's, Get Cache's and
    Foundr's dashboards, so the hostname alone can't name the product.
    AdminHeader passes in the active parent's logo so the tab icon and the
    lit nav pill can never disagree; with no parent lit (login), admin's own
    SITES entry answers.
-->
<script lang="ts">
import { page } from "$app/state";
import { SITES, siteOf } from "./sites";

let { override }: { override?: string } = $props();

// `siteOf` returns null for a tunnel or LAN device — no site identity to read an icon off.
const icon = $derived(
    override || siteOf(page.url.hostname)?.icon || SITES[0].icon,
);

// `type` must match the file or Chrome silently falls back to /favicon.ico, which doesn't exist here.
const type = $derived(icon.endsWith(".webp") ? "image/webp" : "image/png");
</script>

<svelte:head>
    <link rel="icon" {type} href={icon} />
</svelte:head>
