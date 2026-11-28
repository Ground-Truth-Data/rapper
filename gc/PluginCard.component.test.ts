// @vitest-environment happy-dom
import { cleanup, render } from "@testing-library/svelte";
import { afterEach, expect, it, vi } from "vitest";
import PluginCard from "./PluginCard.svelte";

afterEach(cleanup);

const card = { id: "p", title: "", icon: "", questions: 1, maker: { key: "k", name: "Ana" }, created: "2026-11-10T12:00:00Z", answers: 1200, lastAt: null, past: false };

it("a French phone reads the card in French, its date and numbers too", () => {
	const langs = vi.spyOn(navigator, "languages", "get").mockReturnValue(["fr-CA"]);
	try {
		const { container } = render(PluginCard, { card, href: "#", go: vi.fn() });
		const text = container.textContent ?? "";
		expect(text, "an untitled form shows no title, never a made-up one").not.toContain("Sans titre");
		expect(text).toContain("1 question");
		expect(container.querySelector("[data-created]")?.textContent).toMatch(/Créé le 10 nov\.? 2026/);
		expect(container.querySelector("[data-submissions]")?.textContent).toMatch(/1\s200 réponses/);
		expect(text).not.toMatch(/Untitled|Created|submission|Fill out/);
	} finally {
		langs.mockRestore();
	}
});
