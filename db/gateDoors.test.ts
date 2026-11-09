/** rapper/DB_LAW.md 1, 2 and 7 through the gate's side doors: a file attached for good, a carry today's shape
 *  refuses, a browser without the opfs VFS, a lock manager that refuses, and a kept file dropped. */

import { fileURLToPath } from "node:url";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { attach, carry, type Db, dropUnsent, exportBytes, type GateOptions, loadApi, openGate, reconcile, scratch } from "./gate.js";

type Api = {
	oo1: { DB: new (f?: string) => unknown; OpfsDb?: unknown };
	capi: { sqlite3_js_posix_create_file: (name: string, bytes: Uint8Array) => void };
	installOpfsSAHPoolVfs?: unknown;
};

const OLD = "CREATE TABLE `answer` (\n\t`id` text PRIMARY KEY NOT NULL,\n\t`data` text NOT NULL\n)";
const TODAY = [
	"CREATE TABLE `answer` (\n\t`id` text PRIMARY KEY NOT NULL,\n\t`data` text NOT NULL,\n\t`sentAt` text\n)",
	"CREATE INDEX `answer_unsent` ON `answer` (`sentAt`)",
].join("\n--> statement-breakpoint\n");
const PLUGINS = "/getcache-plugins.sqlite3";

class FakeRoot {
	files = new Map<string, Uint8Array>();
	refuse = new Set<string>();
	async getFileHandle(name: string) {
		const bytes = this.files.get(name);
		if (!bytes) throw new DOMException(name, "NotFoundError");
		return {
			move: async (to: string) => {
				this.files.delete(name);
				this.files.set(to, bytes);
			},
		};
	}
	async removeEntry(name: string) {
		if (this.refuse.has(name)) throw new DOMException(name, "NoModificationAllowedError");
		if (!this.files.delete(name)) throw new DOMException(name, "NotFoundError");
	}
}

let api: Api;
let root: FakeRoot;
const slots = new Map<string, Uint8Array>();
const reserved: number[] = [];
const pool = {
	reserveMinimumCapacity: async (n: number) => void reserved.push(n),
	getFileCount: () => slots.size,
	getFileNames: () => [...slots.keys()],
	exportFile: (f: string) => slots.get(f),
	importDb: async (f: string, b: Uint8Array) => void slots.set(f, b),
	unlink: (f: string) => slots.delete(f),
};
const mem = () => new api.oo1.DB(":memory:") as unknown as Db;
const all = (db: Db, sql: string) => db.exec({ sql, rowMode: "object", returnValue: "resultRows" }) as Record<string, unknown>[];
const bytesOf = (ddl: string, insert = "") => {
	const db = mem();
	reconcile(db, ddl);
	if (insert) db.exec({ sql: insert });
	return exportBytes(db);
};

/** The worker's connection. Its ATTACH of an OPFS file runs for real on SQLite's in-memory unix VFS,
 *  over a file holding whatever bytes the fake storage holds under that name now. */
const vfsSeen: string[] = [];
let attaches = 0;
const live = (): Db => {
	const h = mem();
	const exec = h.exec.bind(h);
	h.exec = (o: unknown) => {
		const { sql, bind } = o as { sql: string; bind?: string[] };
		if (!/^ATTACH \? AS /.test(sql) || !bind) return exec(o);
		const [, path, vfs] = bind[0].match(/^file:(.+)\?vfs=(.+)$/) ?? [];
		vfsSeen.push(vfs);
		const real = `/attach-${attaches++}.sqlite3`;
		const bytes = slots.get(path) ?? root.files.get(path.slice(1));
		if (bytes) api.capi.sqlite3_js_posix_create_file(real, bytes);
		return exec({ sql, bind: [`file:${real}?vfs=unix`] });
	};
	return h;
};
const web = { file: PLUGINS, native: false, wasmUrl: "" };

beforeAll(async () => {
	api = (await loadApi(fileURLToPath(import.meta.resolve("@sqlite.org/sqlite-wasm/sqlite3.wasm")))) as unknown as Api;
	api.installOpfsSAHPoolVfs = async () => pool;
	Object.defineProperty(navigator, "storage", { value: { getDirectory: async () => root }, configurable: true });
});

beforeEach(() => {
	root = new FakeRoot();
	slots.clear();
	reserved.length = 0;
	vfsSeen.length = 0;
	vi.spyOn(console, "error").mockImplementation(() => {});
	vi.spyOn(console, "info").mockImplementation(() => {});
});

afterEach(async () => {
	for (const l of (await navigator.locks.query()).held ?? []) if (l.name?.startsWith("gc-db:")) await navigator.locks.request(l.name, { steal: true }, async () => {});
});

describe("attach — a second file in the same connection", () => {
	it("a new file is made at today's whole shape through the shared opfs VFS, never the exclusive pool", async () => {
		const h = live();
		expect(await attach(h, web, "plugins", TODAY)).toEqual(["answer"]);
		expect(vfsSeen).toEqual(["opfs"]);
		expect(all(h, "SELECT name FROM plugins.sqlite_master WHERE name = 'answer_unsent'")).toEqual([{ name: "answer_unsent" }]);
	});

	it("an older build's file is kept aside, bytes intact, and its rows are carried into a fresh one", async () => {
		const bytes = bytesOf(OLD, "INSERT INTO answer VALUES ('a1', '{\"dbh\":12}')");
		root.files.set("getcache-plugins.sqlite3", bytes);
		const h = live();
		expect(await attach(h, web, "plugins", TODAY)).toEqual(["answer"]);
		expect(all(h, "SELECT id, data, sentAt FROM plugins.answer")).toEqual([{ id: "a1", data: '{"dbh":12}', sentAt: null }]);
		const [kept] = [...root.files.keys()];
		expect(kept).toMatch(/^getcache-plugins\.older-\d+\.sqlite3$/);
		expect(root.files.get(kept)).toBe(bytes);
		expect(all(h, "PRAGMA database_list").map((d) => d.name)).toEqual(["main", "plugins"]);
	});

	it("a file SQLite cannot read is set aside, bytes intact, and a fresh one is attached in its place", async () => {
		const junk = new Uint8Array(4096).fill(7);
		root.files.set("getcache-plugins.sqlite3", junk);
		const h = live();
		expect(await attach(h, web, "plugins", TODAY)).toEqual(["answer"]);
		const [aside] = [...root.files.keys()];
		expect(aside).toMatch(/^getcache-plugins\.unreadable-\d+\.sqlite3$/);
		expect(root.files.get(aside)).toBe(junk);
		expect(all(h, "SELECT count(*) AS n FROM plugins.answer")).toEqual([{ n: 0 }]);
		expect(console.error).toHaveBeenCalledWith(expect.stringContaining("could not be read and was set aside"));
	});

	it("a file at today's shape attaches as it is, rows kept, nothing set aside", async () => {
		root.files.set("getcache-plugins.sqlite3", bytesOf(TODAY, "INSERT INTO answer VALUES ('a1', '{}', NULL)"));
		const h = live();
		expect(await attach(h, web, "plugins", TODAY)).toEqual([]);
		expect(all(h, "SELECT id FROM plugins.answer")).toEqual([{ id: "a1" }]);
		expect([...root.files.keys()]).toEqual(["getcache-plugins.sqlite3"]);
	});

	it("the native shells reserve a pool slot for the file and its journal before attaching it", async () => {
		slots.set("/other.sqlite3", new Uint8Array([1]));
		const h = live();
		await attach(h, { ...web, native: true }, "plugins", TODAY);
		expect(reserved).toEqual([3]);
		expect(vfsSeen).toEqual(["opfs-sahpool"]);
	});
});

describe("carry — today's shape refuses an older table's rows", () => {
	it("the refused table keeps its rows in the older file and says so; every other table still lands", () => {
		const old = mem();
		old.exec({ sql: "CREATE TABLE `pin` (`pinKey` text PRIMARY KEY NOT NULL, `name` text NOT NULL); CREATE TABLE `owner` (`ownerKey` text PRIMARY KEY NOT NULL);" });
		old.exec({ sql: "INSERT INTO pin VALUES ('p1', 'Cr'); INSERT INTO owner VALUES ('o1');" });
		const today = [
			"CREATE TABLE `pin` (\n\t`pinKey` text PRIMARY KEY NOT NULL,\n\t`name` text NOT NULL CHECK (length(`name`) > 3)\n)",
			"CREATE TABLE `owner` (\n\t`ownerKey` text PRIMARY KEY NOT NULL\n)",
		].join("\n--> statement-breakpoint\n");
		const h = mem();
		reconcile(h, today);
		carry(h, exportBytes(old), today);
		expect(all(h, "SELECT count(*) AS n FROM pin")).toEqual([{ n: 0 }]);
		expect(all(h, "SELECT ownerKey FROM owner")).toEqual([{ ownerKey: "o1" }]);
		expect(console.error).toHaveBeenCalledWith(expect.stringMatching(/^\[gate\] pin's rows were refused by today's shape/));
	});
});

describe("openGate — a browser that cannot give this tab its file", () => {
	const options = (over: Partial<GateOptions> = {}): GateOptions => ({
		file: "/noopfs.sqlite3",
		ddl: TODAY,
		version: 57,
		native: false,
		signedIn: false,
		wasmUrl: "",
		step: () => {},
		lost: () => {},
		...over,
	});

	it("without the opfs VFS the tab runs in memory, saying why, and the planter's file is untouched", async () => {
		root.files.set("noopfs.sqlite3", new Uint8Array([1]));
		const o = await openGate(options());
		expect(o.memory).toMatch(/the 'opfs' VFS did not install \(crossOriginIsolated=/);
		expect(o.held).toBe(false);
		expect([...root.files.keys()]).toEqual(["noopfs.sqlite3"]);
		expect(all(o.db, "SELECT count(*) AS n FROM answer")).toEqual([{ n: 0 }]);
	});

	it("a lock manager that refuses fails the open loudly instead of leaving it waiting", async () => {
		vi.spyOn(navigator.locks, "request").mockRejectedValueOnce(new DOMException("locks denied", "SecurityError"));
		await expect(openGate(options())).rejects.toThrow("locks denied");
	});
});

describe("scratch", () => {
	it("is an empty database in memory, never a file", () => {
		const db = scratch();
		expect(all(db, "SELECT count(*) AS n FROM sqlite_master")).toEqual([{ n: 0 }]);
		expect(all(db, "PRAGMA database_list")).toEqual([expect.objectContaining({ name: "main", file: "" })]);
	});
});

describe("dropUnsent — the edges", () => {
	const gc = { file: "/getcache-v57.sqlite3", native: false, wasmUrl: "" };

	it("the native shells unlink only the named kept file from the pool", async () => {
		for (const n of ["/getcache-v57.sqlite3", "/getcache-v57.unsent-1.sqlite3", "/getcache-v57.unsent-2.sqlite3"]) slots.set(n, new Uint8Array([1]));
		await dropUnsent({ ...gc, native: true }, ["getcache-v57.unsent-1.sqlite3"]);
		expect([...slots.keys()]).toEqual(["/getcache-v57.sqlite3", "/getcache-v57.unsent-2.sqlite3"]);
	});

	it("a journal the browser refuses to remove fails the drop loudly rather than leaving it behind", async () => {
		root.files.set("getcache-v57.unsent-1.sqlite3", new Uint8Array([1]));
		root.files.set("getcache-v57.unsent-1.sqlite3-journal", new Uint8Array([2]));
		root.refuse.add("getcache-v57.unsent-1.sqlite3-journal");
		await expect(dropUnsent(gc, ["getcache-v57.unsent-1.sqlite3"])).rejects.toThrow(/getcache-v57\.unsent-1\.sqlite3-journal/);
	});
});
