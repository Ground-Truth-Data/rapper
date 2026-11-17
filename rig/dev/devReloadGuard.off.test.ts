// Outside Vite's dev server (no import.meta.hot) the guard is inert: it heals
// nothing, listens to nothing and leaves console.error alone.
import { expect, it, vi } from "vitest";
import { healLostModule, installDevReloadGuard } from "./devReloadGuard";

it("never heals and never hooks anything without HMR", () => {
	expect(import.meta.hot).toBeUndefined();
	expect(healLostModule(new Error("Failed to fetch dynamically imported module /x.js"))).toBe(false);
	const realError = console.error;
	const timer = vi.spyOn(globalThis, "setTimeout");
	installDevReloadGuard();
	expect(console.error).toBe(realError);
	expect(timer).not.toHaveBeenCalled();
	timer.mockRestore();
});
