<!-- Who surveyed and who planted: icon and word | name pills. Two cells a role, so the pills line up and none
     wraps under the other's word. Both roles always show, even the same name twice: the repetition is the
     reminder that two roles exist. Everyone in a role is named once, one a line: nobody hides behind a count. -->
<script lang="ts">
import contactGold from "./assets/contact_gold.webp";
import shovelGold from "./assets/shovel_gold.webp";
import IdentityPill, { type Identity } from "./IdentityPill.svelte";

let {
    surveyors,
    planters,
    words,
    marks = {},
}: {
    surveyors: Identity[];
    planters: Identity[];
    words: { surveyor: string; planter: string };
    /** Worn by the first surveyor's pill. */
    marks?: { editors?: Identity[]; clobberBy?: Identity | null };
} = $props();

const distinct = (all: Identity[]) => [...new Map(all.map((w) => [w.key ?? w.label, w])).values()];
const roles = $derived([
    { role: "surveyor", art: contactGold, word: words.surveyor, all: distinct(surveyors) },
    { role: "planter", art: shovelGold, word: words.planter, all: distinct(planters) },
]);
</script>

<span class="people">
    {#each roles as p (p.role)}
        <span class="role"><img src={p.art} alt="" />{p.word}</span>
        <span class="who" data-role={p.role}>
            {#each p.all as w, n (w.key ?? w.label)}<IdentityPill who={w} {...p.role === "surveyor" && !n ? marks : {}} />{/each}
        </span>
    {/each}
</span>

<style>
.people {
    display: grid;
    grid-template-columns: max-content max-content;
    gap: 3px 6px;
    align-items: center;
    white-space: nowrap;
}
.role,
.who {
    display: inline-flex;
    align-items: center;
    gap: 5px;
}
.who {
    flex-direction: column;
    align-items: flex-start;
    gap: 3px;
}
.role {
    align-self: start;
    font-size: 13px;
    text-transform: lowercase;
    color: var(--rust);
}
.role img {
    width: 15px;
    height: 15px;
    object-fit: contain;
}
</style>
