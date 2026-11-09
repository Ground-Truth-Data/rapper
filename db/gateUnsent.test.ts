/** rapper/DB_LAW.md law 1 and 10: the kept `*.unsent-*` file is offered back to its own world only,
 *  goes only by name, and after a sign-out the next account opens on a file holding none of the last one's rows. */

import { fileURLToPath } from "node:url";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { type Db, dropUnsent, erase, type GateOptions, loadApi, openGate, reconcile, unsentFiles } from "./gate.js";

type Api = { oo1: { DB: new (f?: string) => unknown; OpfsDb?: unknown }; installOpfsSAHPoolVfs?: unknown };

const OLD = "CREATE TABLE `pin` (\n\t`pinKey` text PRIMARY KEY NOT NULL\n);";
const TODAY = `${OLD}\n--> statement-breakpoint\nCREATE TABLE \`owner\` (\n\t\`ownerKey\` text PRIMARY KEY NOT NULL\n);`;

class FakeRoot {
	files = new Map<string, Uint8Array>();
	async getFileHandle(name: string) {
		const bytes = this.files.get(name);
		if (!bytes) throw new DOMException(name, "NotFoundError");
		return {
			getFile: async () => new Blob([bytes as BlobPart]),
			move: async (to: string) => {
				this.files.delete(name);
				this.files.set(to, bytes);
			},
		};
	}
	async *keys() {
		yield* [...this.files.keys()];
	}
	async removeEntry(name: string) {
		if (!this.files.delete(name)) throw new DOMException(name, "NotFoundError");
	}
}

let api: Api;
let root: FakeRoot;
let opener: (file: string) => Db;
const slots = new Map<string, Uint8Array>();
const pool = {
	reserveMinimumCapacity: async () => {},
	getFileCount: () => slots.size,
	getFileNames: () => [...slots.keys()],
	OpfsSAHPoolDb: function (f: string) {
		return opener(f);
	},
	exportFile: (f: string) => slots.get(f),
	importDb: async (f: string, b: Uint8Array) => void slots.set(f, b),
	unlink: (f: string) => slots.delete(f),
};
const mem = () => new api.oo1.DB(":memory:") as unknown as Db;
const all = (db: Db, sql: string) => db.exec({ sql, rowMode: "object", returnValue: "resultRows" }) as Record<string, unknown>[];
const web = { file: "/getcache-v57.sqlite3", native: false, wasmUrl: "" };
const options = (over: Partial<GateOptions> = {}): GateOptions => ({
	...web,
	ddl: TODAY,
	version: 57,
	signedIn: true,
	step: () => {},
	lost: () => {},
	...over,
});
const put = (...names: string[]) => {
	for (const n of names) root.files.set(n, new TextEncoder().encode(n));
};

beforeAll(async () => {
	api = (await loadApi(fileURLToPath(import.meta.resolve("@sqlite.org/sqlite-wasm/sqlite3.wasm")))) as unknown as Api;
	api.oo1.OpfsDb = function (f: string) {
		return opener(f);
	};
	api.installOpfsSAHPoolVfs = async () => pool;
	Object.defineProperty(navigator, "storage", { value: { getDirectory: async () => root }, configurable: true });
});

// Each test starts with no other tab: every file a test left open is taken back, which closes its connection.
afterEach(async () => {
	for (const l of (await navigator.locks.query()).held ?? []) if (l.name?.startsWith("gc-db:")) await navigator.locks.request(l.name, { steal: true }, async () => {});
	await new Promise((r) => setTimeout(r, 0));
});

beforeEach(() => {
	root = new FakeRoot();
	slots.clear();
	opener = () => mem();
	vi.spyOn(console, "info").mockImplementation(() => {});
});

describe("unsentFiles — what a pull may merge back", () => {
	it("only this world's kept files, oldest first, bytes intact; never a signed-out copy, a broken file or another world's", async () => {
		put(
			"getcache-v57.sqlite3",
			"getcache-v57.unsent-1762700000002.sqlite3",
			"getcache-v57.unsent-1762700000001.sqlite3",
			"getcache-v57.unsent-1762700000001.sqlite3-journal",
			"getcache-v57.older-1762700000003.sqlite3",
			"getcache-v57.unreadable-1762700000004.sqlite3",
			"getcache-sandbox-v57.unsent-1762700000005.sqlite3",
			"getcache-plugins.unsent-1762700000006.sqlite3",
		);
		const found = await unsentFiles(web);
		expect(found.map((f) => f.name)).toEqual([
			"getcache-v57.unsent-1762700000001.sqlite3",
			"getcache-v57.unsent-1762700000002.sqlite3",
		]);
		expect(new TextDecoder().decode(found[0].bytes)).toBe("getcache-v57.unsent-1762700000001.sqlite3");
	});

	it("a sandbox world sees only its own", async () => {
		put("getcache-v57.unsent-1.sqlite3", "getcache-sandbox-v57.unsent-2.sqlite3");
		const found = await unsentFiles({ ...web, file: "/getcache-sandbox-v57.sqlite3" });
		expect(found.map((f) => f.name)).toEqual(["getcache-sandbox-v57.unsent-2.sqlite3"]);
	});

	it("the native shells read the same names out of the pool", async () => {
		for (const n of ["/getcache-v57.sqlite3", "/getcache-v57.unsent-7.sqlite3", "/getcache-v57.older-8.sqlite3"])
			slots.set(n, new Uint8Array([7]));
		const found = await unsentFiles({ ...web, native: true });
		expect(found).toEqual([{ name: "getcache-v57.unsent-7.sqlite3", bytes: new Uint8Array([7]) }]);
	});
});

describe("dropUnsent — a kept file goes only once named", () => {
	it("takes the file and its journal, nothing else", async () => {
		put("getcache-v57.sqlite3", "getcache-v57.unsent-1.sqlite3", "getcache-v57.unsent-1.sqlite3-journal", "getcache-v57.unsent-2.sqlite3");
		await dropUnsent(web, ["getcache-v57.unsent-1.sqlite3"]);
		expect([...root.files.keys()].sort()).toEqual(["getcache-v57.sqlite3", "getcache-v57.unsent-2.sqlite3"]);
	});

	it("refuses the live file, a signed-out copy, a broken file and another world's, and deletes nothing", async () => {
		put("getcache-v57.sqlite3", "getcache-v57.older-1.sqlite3", "getcache-v57.unreadable-1.sqlite3", "getcache-sandbox-v57.unsent-1.sqlite3");
		const before = [...root.files.keys()];
		for (const name of before) await expect(dropUnsent(web, [name])).rejects.toThrow(/is not an unsent file/);
		expect([...root.files.keys()]).toEqual(before);
	});
});

describe("sign-out, then the next account on the same browser", () => {
	it("opens on a file holding none of the last account's rows, and nothing of theirs waits to be merged", async () => {
		const a = mem();
		reconcile(a, TODAY);
		a.exec({ sql: "INSERT INTO pin VALUES ('a-pin')" });
		put("getcache-v57.sqlite3", "getcache-v57.sqlite3-journal", "getcache-v57.older-1.sqlite3");
		opener = () => a;
		expect((await erase(web, (n) => n === "getcache-v57.sqlite3")).sort()).toEqual(["getcache-v57.sqlite3", "getcache-v57.sqlite3-journal"]);

		const b = mem();
		opener = () => b;
		const o = await openGate(options());
		expect(o).toMatchObject({ db: b, memory: "" });
		expect(all(o.db, "SELECT count(*) AS n FROM pin")).toEqual([{ n: 0 }]);
		expect(await unsentFiles(web)).toEqual([]);
	});

	it("an older build's file the last account left kept is never offered once it is gone", async () => {
		const older = mem();
		reconcile(older, OLD);
		older.exec({ sql: "INSERT INTO pin VALUES ('a-unsent')" });
		put("getcache-v57.sqlite3");
		let opens = 0;
		opener = () => (opens++ ? mem() : older);
		expect(await openGate(options())).toMatchObject({ memory: "" });
		const [kept] = await unsentFiles(web);
		expect(kept.name).toMatch(/^getcache-v57\.unsent-\d+\.sqlite3$/);
		await dropUnsent(web, [kept.name]);
		expect(await unsentFiles(web)).toEqual([]);
	});
});
