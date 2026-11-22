// What a failure puts on screen: plain words; the error itself goes to the console, which Sentry records.
import { afterEach, describe, expect, it, vi } from "vitest";
import { PlainError, plainly } from "./plainly";

afterEach(() => vi.restoreAllMocks());

describe("plainly", () => {
	it("never hands a raw message to the screen, and logs the error whole", () => {
		const log = vi.spyOn(console, "error").mockImplementation(() => {});
		const raw = new Error("SQLITE_CONSTRAINT_NOTNULL: bagTable.sortOrder (addRow)");
		expect(plainly("bags:addRow", raw, "Couldn’t save — try again")).toBe("Couldn’t save — try again");
		expect(plainly("x", "TypeError: undefined is not a function", "plain")).toBe("plain");
		expect(log).toHaveBeenCalledWith("[bags:addRow]", raw);
	});

	it("a PlainError was written for the planter: its words show, nothing is alarmed", () => {
		const log = vi.spyOn(console, "error").mockImplementation(() => {});
		expect(plainly("restore", new PlainError("That file isn’t a backup"), "fallback")).toBe("That file isn’t a backup");
		expect(log).not.toHaveBeenCalled();
	});
});
