/** rapper/DB_LAW.md 1–5 through the gate's own doors: open, set aside, attach a copy, erase. */

import { fileURLToPath } from "node:url";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { type Db, erase, exportBytes, type GateOptions, loadApi, openBytes, openGate, reconcile, withBytes } from "./gate.js";

type Api = {
	oo1: { DB: new (f?: string) => unknown; OpfsDb?: unknown };
	installOpfsSAHPoolVfs?: unknown;
};

const OLD = "CREATE TABLE `pin` (\n\t`pinKey` text PRIMARY KEY NOT NULL,\n\t`name` text NOT NULL\n);";
const TODAY = [
	"CREATE TABLE `owner` (\n\t`ownerKey` text PRIMARY KEY NOT NULL\n);",
	"CREATE TABLE `pin` (\n\t`pinKey` text PRIMARY KEY NOT NULL,\n\t`name` text NOT NULL,\n\t`note` text DEFAULT '' NOT NULL\n);",
	"CREATE INDEX `pin_name_idx` ON `pin` (`name`);",
	"CREATE VIEW `pinView` AS SELECT pinKey, name, note FROM pin;",
].join("\n--> statement-breakpoint\n");

let api: Api;
let opener: (file: string) => Db;
const mem = () => new api.oo1.DB(":memory:") as unknown as Db;
const all = (db: Db, sql: string) => db.exec({ sql, rowMode: "object", returnValue: "resultRows" }) as Record<string, unknown>[];
const tick = () => new Promise((r) => setTimeout(r, 0));
const older = () => {
	const db = mem();
	reconcile(db, OLD);
	db.exec({ sql: "INSERT INTO pin VALUES ('p1', 'North 40'), ('p2', 'Creek')" });
	return db;
};
const unreadable = () => {
	throw new Error("SQLITE_NOTADB: sqlite3 result code 26: file is not a database");
};

class FakeRoot {
	files = new Map<string, Uint8Array>();
	async getFileHandle(name: string) {
		const bytes = this.files.get(name);
		if (!bytes) throw new DOMException(name, "NotFoundError");
		return {
			getFile: async () => ({ arrayBuffer: async () => bytes.slice().buffer }),
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
		this.files.delete(name);
	}
}
let root: FakeRoot;
let storage: () => Promise<FakeRoot>;

const slots = new Map<string, Uint8Array>();
const poolLog: string[] = [];
const pool = {
	reserveMinimumCapacity: async () => {},
	getFileCount: () => slots.size,
	getFileNames: () => [...slots.keys()],
	OpfsSAHPoolDb: function (f: string) {
		return opener(f);
	},
	exportFile: async (f: string) => {
		poolLog.push(`export ${f}`);
		return slots.get(f);
	},
	importDb: async (f: string, b: Uint8Array) => {
		poolLog.push(`import ${f}`);
		slots.set(f, b);
	},
	unlink: (f: string) => {
		poolLog.push(`unlink ${f}`);
		return slots.delete(f);
	},
};

const options = (file: string, over: Partial<GateOptions> = {}): GateOptions => ({
	file,
	ddl: TODAY,
	version: 57,
	native: false,
	signedIn: false,
	wasmUrl: "",
	step: () => {},
	lost: () => {},
	...over,
});

beforeAll(async () => {
	api = (await loadApi(fileURLToPath(import.meta.resolve("@sqlite.org/sqlite-wasm/sqlite3.wasm")))) as unknown as Api;
	api.oo1.OpfsDb = function (f: string) {
		return opener(f);
	};
	api.installOpfsSAHPoolVfs = async () => pool;
	Object.defineProperty(navigator, "storage", { value: { getDirectory: () => storage() }, configurable: true });
});

// Each test starts with no other tab: every file a test left open is taken back, which closes its connection.
afterEach(async () => {
	for (const l of (await navigator.locks.query()).held ?? []) if (l.name?.startsWith("gc-db:")) await navigator.locks.request(l.name, { steal: true }, async () => {});
	await tick();
});

beforeEach(() => {
	root = new FakeRoot();
	storage = async () => root;
	opener = () => mem();
	slots.clear();
	poolLog.length = 0;
	vi.spyOn(console, "error").mockImplementation(() => {});
	vi.spyOn(console, "info").mockImplementation(() => {});
});

describe("reconcile", () => {
	it("a new unique index the rows break waits; the rows stay and the miss is shouted", () => {
		const db = older();
		db.exec({ sql: "INSERT INTO pin VALUES ('p3', 'Creek')" });
		reconcile(db, `${OLD}\n--> statement-breakpoint\nCREATE UNIQUE INDEX \`pin_name_uq\` ON \`pin\` (\`name\`);`);
		expect(all(db, "SELECT count(*) AS n FROM pin")).toEqual([{ n: 3 }]);
		expect(all(db, "SELECT name FROM sqlite_master WHERE name = 'pin_name_uq'")).toEqual([]);
		expect(console.error).toHaveBeenCalledWith(expect.stringContaining("index not built, rows kept"));
	});

	it("an upgrade that fails part way leaves the file exactly as it was, views included", () => {
		const db = mem();
		reconcile(db, TODAY);
		db.exec({ sql: "INSERT INTO pin (pinKey, name) VALUES ('p1', 'a')" });
		const broken = `CREATE TABLE \`late\` (\n\t\`k\` text\n);\n--> statement-breakpoint\nINSERT INTO nowhere VALUES (1);`;
		expect(() => reconcile(db, `${TODAY}\n--> statement-breakpoint\n${broken}`)).toThrow(/no such table/);
		expect(all(db, "SELECT name FROM sqlite_master WHERE name IN ('late', 'pinView') ORDER BY name")).toEqual([{ name: "pinView" }]);
		expect(all(db, "SELECT pinKey FROM pinView")).toEqual([{ pinKey: "p1" }]);
		expect(all(db, "PRAGMA foreign_keys")).toEqual([{ foreign_keys: 1 }]);
	});
});

describe("withBytes — a backup copy beside the live file", () => {
	it("an older copy gets today's tables and columns before it is read; its rows stay and main is untouched", () => {
		const live = mem();
		reconcile(live, TODAY);
		const seen = withBytes(live, exportBytes(older()), TODAY, () => ({
			pins: all(live, "SELECT pinKey, name, note FROM backup.pin ORDER BY pinKey"),
			owner: all(live, "SELECT count(*) AS n FROM backup.owner"),
			extras: all(live, "SELECT name FROM backup.sqlite_master WHERE type IN ('index', 'view') AND name NOT LIKE 'sqlite_%'"),
		}));
		expect(seen).toEqual({
			pins: [
				{ pinKey: "p1", name: "North 40", note: "" },
				{ pinKey: "p2", name: "Creek", note: "" },
			],
			owner: [{ n: 0 }],
			extras: [],
		});
		expect(all(live, "SELECT name FROM sqlite_master WHERE type = 'view'")).toEqual([{ name: "pinView" }]);
		expect(all(live, "PRAGMA database_list").map((d) => d.name)).toEqual(["main"]);
	});

	it("a copy whose rows lack a key today requires is refused at the door, naming it; no NULL key is born", () => {
		const keyless = mem();
		keyless.exec({ sql: "CREATE TABLE `pin` (`name` text NOT NULL); INSERT INTO pin VALUES ('North 40');" });
		const live = mem();
		reconcile(live, TODAY);
		const merged = vi.fn();
		expect(() => withBytes(live, exportBytes(keyless), TODAY, merged)).toThrow(/backup\.pin has rows with no pinKey/);
		expect(merged).not.toHaveBeenCalled();
		expect(all(live, "PRAGMA database_list").map((d) => d.name)).toEqual(["main"]);
		const empty = mem();
		empty.exec({ sql: "CREATE TABLE `pin` (`name` text NOT NULL);" });
		expect(withBytes(live, exportBytes(empty), TODAY, () => all(live, "SELECT count(*) AS n FROM backup.pin"))).toEqual([{ n: 0 }]);
	});

	it("a restore that throws still lets go of the copy, so the next restore can attach", () => {
		const live = mem();
		reconcile(live, TODAY);
		expect(() =>
			withBytes(live, exportBytes(older()), TODAY, () => {
				throw new Error("refused row");
			}),
		).toThrow("refused row");
		expect(withBytes(live, exportBytes(older()), TODAY, () => all(live, "SELECT count(*) AS n FROM backup.pin"))).toEqual([{ n: 2 }]);
	});

	it("a copy that is not a database is refused and lets go: the live file still reads and the next copy attaches", () => {
		const live = mem();
		reconcile(live, TODAY);
		live.exec({ sql: "INSERT INTO pin (pinKey, name) VALUES ('p9', 'Live')" });
		expect(() => withBytes(live, new Uint8Array([7, 7, 7]), TODAY, () => 0)).toThrow(/not a database/);
		expect(all(live, "PRAGMA database_list").map((d) => d.name)).toEqual(["main"]);
		expect(all(live, "SELECT pinKey FROM pin")).toEqual([{ pinKey: "p9" }]);
		expect(withBytes(live, exportBytes(older()), TODAY, () => all(live, "SELECT count(*) AS n FROM backup.pin"))).toEqual([{ n: 2 }]);
	});

	it("a copy asked for mid-transaction is refused before it attaches, so the next one still can", () => {
		const live = mem();
		reconcile(live, TODAY);
		live.exec({ sql: "BEGIN" });
		expect(() => withBytes(live, exportBytes(older()), TODAY, () => 0)).toThrow(/inside a transaction/);
		live.exec({ sql: "ROLLBACK" });
		expect(all(live, "PRAGMA database_list").map((d) => d.name)).toEqual(["main"]);
		expect(withBytes(live, exportBytes(older()), TODAY, () => all(live, "SELECT count(*) AS n FROM backup.pin"))).toEqual([{ n: 2 }]);
	});
});

describe("openBytes — the admin viewer's door", () => {
	it("a dropped file reads but can never be written", async () => {
		const db = await openBytes(exportBytes(older()));
		expect(all(db, "SELECT count(*) AS n FROM pin")).toEqual([{ n: 2 }]);
		expect(() => db.exec({ sql: "DELETE FROM pin" })).toThrow(/readonly/);
	});
});

describe("openGate — the browser", () => {
	it("a file at today's shape opens as it is: its rows stay, the version is stamped", async () => {
		const today = mem();
		reconcile(today, TODAY);
		today.exec({ sql: "INSERT INTO pin (pinKey, name) VALUES ('p1', 'North 40')" });
		root.files.set("today.sqlite3", new Uint8Array([1]));
		opener = () => today;
		const o = await openGate(options("/today.sqlite3"));
		expect(o).toMatchObject({ db: today, aside: "", added: [] });
		expect(all(o.db, "PRAGMA user_version")).toEqual([{ user_version: 57 }]);
		expect([...root.files.keys()]).toEqual(["today.sqlite3"]);
	});

	it("signed in, an older build's file is kept aside, journal and all, and a fresh one opens for the account's copy to fill", async () => {
		root.files.set("older.sqlite3", new Uint8Array([1]));
		root.files.set("older.sqlite3-journal", new Uint8Array([2]));
		let opens = 0;
		opener = () => (opens++ ? mem() : older());
		const o = await openGate(options("/older.sqlite3", { signedIn: true }));
		expect(o).toMatchObject({ memory: "", aside: "" });
		expect(all(o.db, "SELECT count(*) AS n FROM pinView")).toEqual([{ n: 0 }]);
		const kept = [...root.files.keys()];
		expect(kept).toHaveLength(2);
		expect(kept[0]).toMatch(/^older\.unsent-\d+\.sqlite3$/);
		expect(kept[1]).toBe(`${kept[0]}-journal`);
	});

	it("signed out, an older build's rows are copied into a fresh file, and the older file is kept aside", async () => {
		const bytes = exportBytes(older());
		root.files.set("older.sqlite3", bytes);
		let opens = 0;
		opener = () => (opens++ ? mem() : older());
		const o = await openGate(options("/older.sqlite3", { signedIn: false }));
		expect(o.aside, "nothing was lost, so nothing alarms").toBe("");
		const kept = [...root.files.keys()].find((n) => /^older\.older-\d+\.sqlite3$/.test(n));
		expect(root.files.get(kept ?? "")).toBe(bytes);
		expect(all(o.db, "SELECT pinKey, name, note FROM pinView ORDER BY pinKey")).toEqual([
			{ pinKey: "p1", name: "North 40", note: "" },
			{ pinKey: "p2", name: "Creek", note: "" },
		]);
		expect(all(o.db, "SELECT name FROM sqlite_master WHERE name = 'pin_name_idx'")).toEqual([{ name: "pin_name_idx" }]);
	});

	it("signed out, a file holding a column today's shape dropped is another build's: its rows are copied, the column left behind", async () => {
		const dropped = () => {
			const db = mem();
			reconcile(db, TODAY.replace("\t`note` text DEFAULT '' NOT NULL\n", "\t`note` text DEFAULT '' NOT NULL,\n\t`gone` text NOT NULL\n"));
			db.exec({ sql: "INSERT INTO pin (pinKey, name, gone) VALUES ('p1', 'North 40', 'x')" });
			return db;
		};
		root.files.set("dropped.sqlite3", exportBytes(dropped()));
		let opens = 0;
		opener = () => (opens++ ? mem() : dropped());
		const o = await openGate(options("/dropped.sqlite3", { signedIn: false }));
		expect([...root.files.keys()].some((n) => /^dropped\.older-\d+\.sqlite3$/.test(n))).toBe(true);
		expect(all(o.db, "SELECT name FROM pragma_table_info('pin')").map((r) => r.name)).toEqual(["pinKey", "name", "note"]);
		expect(all(o.db, "SELECT pinKey, name FROM pin")).toEqual([{ pinKey: "p1", name: "North 40" }]);
	});

	// The older tab closes only when its lock is stolen, so it can still write to the older file after its rows were copied.
	it("signed out, a write the older tab made after the copy reaches the live file at the next open; the older file goes once nothing in it is new", async () => {
		const live = mem();
		reconcile(live, TODAY);
		live.exec({ sql: "INSERT INTO pin (pinKey, name) VALUES ('p1', 'North 40'), ('p2', 'Creek')" });
		const late = older();
		late.exec({ sql: "INSERT INTO pin VALUES ('p3', 'Written in the gap')" });
		root.files.set("f.sqlite3", new Uint8Array([1]));
		root.files.set("f.older-1.sqlite3", exportBytes(late));
		opener = () => live;
		const o = await openGate(options("/f.sqlite3"));
		expect(all(o.db, "SELECT pinKey, name FROM pin ORDER BY pinKey")).toEqual([
			{ pinKey: "p1", name: "North 40" },
			{ pinKey: "p2", name: "Creek" },
			{ pinKey: "p3", name: "Written in the gap" },
		]);
		expect([...root.files.keys()]).toEqual(["f.sqlite3"]);
	});

	// Any await between the lock and the open lets an older tab's focus steal the file mid-open (gate stage 10).
	it("signed out, a kept older file is read before the database lock is taken, never inside it", async () => {
		const live = mem();
		reconcile(live, TODAY);
		root.files.set("f.sqlite3", new Uint8Array([1]));
		root.files.set("f.older-1.sqlite3", exportBytes(older()));
		opener = () => live;
		const heldAtRead: string[][] = [];
		const handleOf = root.getFileHandle.bind(root);
		root.getFileHandle = async (name: string) => {
			const h = await handleOf(name);
			const getFile = async () => {
				heldAtRead.push(((await navigator.locks.query()).held ?? []).map((l) => l.name ?? "").filter((n) => n.includes("f.sqlite3")));
				return h.getFile();
			};
			return { ...h, getFile };
		};
		await openGate(options("/f.sqlite3"));
		expect(heldAtRead).toEqual([[]]);
	});

	it("signed out, a kept older file whose row clashes with the live one stays aside, and the live row stays as it is", async () => {
		const live = mem();
		reconcile(live, TODAY);
		live.exec({ sql: "INSERT INTO pin (pinKey, name) VALUES ('p1', 'Renamed here')" });
		root.files.set("f.sqlite3", new Uint8Array([1]));
		root.files.set("f.older-1.sqlite3", exportBytes(older()));
		opener = () => live;
		const o = await openGate(options("/f.sqlite3"));
		expect(all(o.db, "SELECT pinKey, name FROM pin ORDER BY pinKey")).toEqual([
			{ pinKey: "p1", name: "Renamed here" },
			{ pinKey: "p2", name: "Creek" },
		]);
		expect([...root.files.keys()]).toEqual(["f.sqlite3", "f.older-1.sqlite3"]);
	});

	it("signed out, a kept older file SQLite cannot read stays aside, bytes intact, and the open lands on the live file", async () => {
		const live = mem();
		reconcile(live, TODAY);
		live.exec({ sql: "INSERT INTO pin (pinKey, name) VALUES ('p1', 'North 40')" });
		const junk = new Uint8Array([7, 7, 7]);
		root.files.set("f.sqlite3", new Uint8Array([1]));
		root.files.set("f.older-1.sqlite3", junk);
		opener = () => live;
		const said = vi.spyOn(console, "error").mockImplementation(() => {});
		const o = await openGate(options("/f.sqlite3"));
		expect(o.memory).toBe("");
		expect(all(o.db, "SELECT pinKey FROM pin")).toEqual([{ pinKey: "p1" }]);
		expect(root.files.get("f.older-1.sqlite3")).toEqual(junk);
		expect(said.mock.calls.flat().join(" ")).toMatch(/f\.older-1\.sqlite3 could not be copied again; it stays aside/);
	});

	it("signed out, a copied older file the browser will not remove stays, and the open still lands on the live file", async () => {
		const live = mem();
		reconcile(live, TODAY);
		root.files.set("f.sqlite3", new Uint8Array([1]));
		root.files.set("f.older-1.sqlite3", exportBytes(older()));
		root.removeEntry = async (name: string) => {
			throw new DOMException(name, "NoModificationAllowedError");
		};
		opener = () => live;
		const said = vi.spyOn(console, "error").mockImplementation(() => {});
		const o = await openGate(options("/f.sqlite3"));
		expect(o.memory).toBe("");
		expect(all(o.db, "SELECT pinKey FROM pin ORDER BY pinKey")).toEqual([{ pinKey: "p1" }, { pinKey: "p2" }]);
		await tick();
		expect([...root.files.keys()]).toEqual(["f.sqlite3", "f.older-1.sqlite3"]);
		expect(said.mock.calls.flat().join(" ")).toMatch(/f\.older-1\.sqlite3 is in \/f\.sqlite3 but could not be removed/);
	});

	it("storage the browser refuses runs this tab in memory, at today's shape, saying why", async () => {
		storage = () => Promise.reject(new Error("SecurityError: storage denied"));
		const steps: string[] = [];
		const o = await openGate(options("/refused.sqlite3", { step: (s) => steps.push(s) }));
		// SQLite's own OPFS install waits 4 s on a helper a refusing browser never starts: ask first.
		expect(steps[0]).toBe("asking the browser for storage");
		expect(o).toMatchObject({ memory: "SecurityError: storage denied", aside: "" });
		expect(all(o.db, "SELECT count(*) AS n FROM pinView")).toEqual([{ n: 0 }]);
		expect(all(o.db, "PRAGMA user_version")).toEqual([{ user_version: 57 }]);
	});

	it("a failure that is not an unreadable file never sets the planter's file aside", async () => {
		root.files.set("kept.sqlite3", new Uint8Array([1, 2, 3]));
		opener = () => {
			throw new Error("SQLITE_CANTOPEN: unable to open database file");
		};
		const o = await openGate(options("/kept.sqlite3"));
		expect(o).toMatchObject({ memory: "SQLITE_CANTOPEN: unable to open database file", aside: "" });
		expect([...root.files.keys()]).toEqual(["kept.sqlite3"]);
	});

	it("an unreadable file and its journal are moved aside, bytes intact, and a fresh file opens", async () => {
		const bytes = new Uint8Array([9, 9, 9]);
		root.files.set("bad.sqlite3", bytes);
		root.files.set("bad.sqlite3-journal", new Uint8Array([7]));
		let opens = 0;
		opener = () => (opens++ ? mem() : unreadable());
		const o = await openGate(options("/bad.sqlite3"));
		expect(o.aside).toMatch(/^bad\.unreadable-\d+\.sqlite3$/);
		expect(o.memory).toBe("");
		expect(o.added).toEqual(["owner", "pin"]);
		expect(root.files.get(o.aside)).toBe(bytes);
		expect([...root.files.keys()].sort()).toEqual([o.aside, `${o.aside}-journal`].sort());
	});

	it("a fresh file that is unreadable too fails loudly, and only one file is ever set aside", async () => {
		root.files.set("worse.sqlite3", new Uint8Array([1]));
		opener = unreadable;
		await expect(openGate(options("/worse.sqlite3"))).rejects.toThrow("SQLITE_NOTADB");
		expect([...root.files.keys()]).toEqual([expect.stringMatching(/^worse\.unreadable-\d+\.sqlite3$/)]);
	});
});

describe("openGate — the newest tab wins", () => {
	it("an older tab sitting idle hands over at once and its connection is closed", async () => {
		const lost = vi.fn();
		const first = await openGate(options("/tabs.sqlite3", { lost }));
		const second = await openGate(options("/tabs.sqlite3"));
		await tick();
		expect(second.memory, "an idle connection never blocks the newest").toBe("");
		expect(lost).toHaveBeenCalledWith(false);
		expect(() => first.db.exec({ sql: "SELECT 1" })).toThrow();
		expect(all(second.db, "SELECT 1 AS one")).toEqual([{ one: 1 }]);
	});

	it("an older tab caught mid-transaction is told it was cut, so its caller redoes the whole thing", async () => {
		const lost = vi.fn();
		const first = await openGate(options("/cut.sqlite3", { lost }));
		first.db.exec({ sql: "BEGIN IMMEDIATE" });
		await openGate(options("/cut.sqlite3"));
		await tick();
		expect(lost).toHaveBeenCalledWith(true);
	});

	it("a tab whose file is taken while it is still opening lets the file go and runs on memory", async () => {
		const reserve = pool.reserveMinimumCapacity;
		let entered!: () => void;
		let release!: () => void;
		const inside = new Promise<void>((r) => (entered = r));
		const held = new Promise<void>((r) => (release = r));
		pool.reserveMinimumCapacity = async () => {
			pool.reserveMinimumCapacity = reserve;
			entered();
			await held;
		};
		const lost = vi.fn();
		const opening = openGate(options("/mid.sqlite3", { native: true, lost }));
		await inside;
		const second = await openGate(options("/mid.sqlite3", { native: true }));
		release();
		const first = await opening;
		await tick();
		expect(first.memory).toBe("a newer tab took the file while this one opened it");
		expect(lost).not.toHaveBeenCalled();
		expect(all(second.db, "SELECT 1 AS one")).toEqual([{ one: 1 }]);
	});

	const busyUnder = async (file: string) => {
		// An older tab's connection, its worker busy inside a write: it hears of the steal, and closes, only when that ends.
		let closeOlder!: () => void;
		void navigator.locks.request(`gc-db-handle:${file}`, () => new Promise<void>((r) => (closeOlder = r)));
		opener = () => {
			throw new Error("SQLITE_BUSY: database is locked");
		};
		const held = await openGate(options(file));
		expect(held).toMatchObject({ held: true, memory: expect.stringMatching("SQLITE_BUSY") });
		opener = () => mem();
		let freed: boolean | undefined;
		void held.freed?.then((v) => (freed = v));
		await tick();
		expect(freed, "still open").toBeUndefined();
		return { closeOlder, freed: () => freed };
	};

	it("a tab that finds the file busy under an older tab's connection is freed the moment that connection closes", async () => {
		const { closeOlder, freed } = await busyUnder("/held.sqlite3");
		closeOlder();
		await vi.waitFor(() => expect(freed()).toBe(true));
	});

	it("a newer tab that takes the file first leaves the held tab an older one: it moves only when looked at", async () => {
		const { closeOlder, freed } = await busyUnder("/newer.sqlite3");
		void navigator.locks.request("gc-db:/newer.sqlite3", { steal: true }, () => new Promise<void>(() => {})).catch(() => {});
		closeOlder();
		await vi.waitFor(() => expect(freed()).toBe(false));
	});

	it("a tab on memory holds no lock: the next open, its own retake included, leaves it running", async () => {
		const lost = vi.fn();
		opener = () => {
			throw new Error("SQLITE_BUSY: database is locked");
		};
		const busy = await openGate(options("/busy.sqlite3", { lost }));
		expect(busy.memory).toMatch("SQLITE_BUSY");
		expect(busy.held).toBe(true);
		expect(busy.freed, "nothing of ours holds the file, so nothing will free it: the tab takes it back when looked at").toBeUndefined();
		opener = () => mem();
		const retaken = await openGate(options("/busy.sqlite3"));
		await tick();
		expect(retaken.memory).toBe("");
		expect(lost).not.toHaveBeenCalled();
		expect(all(busy.db, "SELECT 1 AS one")).toEqual([{ one: 1 }]);
	});
});

describe("openGate — the native shells", () => {
	it("an unreadable file is copied aside before its slot is freed, bytes intact", async () => {
		const bytes = new Uint8Array([4, 5, 6]);
		slots.set("/native.sqlite3", bytes);
		let opens = 0;
		opener = () => (opens++ ? mem() : unreadable());
		const o = await openGate(options("/native.sqlite3", { native: true }));
		expect(o.aside).toMatch(/^native\.unreadable-\d+\.sqlite3$/);
		expect(poolLog).toEqual(["export /native.sqlite3", `import /${o.aside}`, "unlink /native.sqlite3"]);
		expect(slots.get(`/${o.aside}`)).toBe(bytes);
	});

	it("signed out, a write the older tab made after the copy reaches the live file at the next open, and its slot is freed", async () => {
		const live = mem();
		reconcile(live, TODAY);
		const late = older();
		late.exec({ sql: "INSERT INTO pin VALUES ('p3', 'Written in the gap')" });
		slots.set("/n.sqlite3", new Uint8Array([1]));
		slots.set("/n.older-1.sqlite3", exportBytes(late));
		opener = () => live;
		const o = await openGate(options("/n.sqlite3", { native: true }));
		expect(all(o.db, "SELECT pinKey FROM pin ORDER BY pinKey")).toEqual([{ pinKey: "p1" }, { pinKey: "p2" }, { pinKey: "p3" }]);
		expect([...slots.keys()]).toEqual(["/n.sqlite3"]);
	});

	it("any other refusal fails loudly and leaves the file where it is", async () => {
		slots.set("/stuck.sqlite3", new Uint8Array([1]));
		opener = () => {
			throw new Error("SQLITE_FULL: the pool is full");
		};
		await expect(openGate(options("/stuck.sqlite3", { native: true }))).rejects.toThrow("SQLITE_FULL");
		expect([...slots.keys()]).toEqual(["/stuck.sqlite3"]);
		expect(poolLog).toEqual([]);
	});
});

describe("erase — sign-out", () => {
	const live = (n: string) => /^live(-\w+)?\.sqlite3$/.test(n);

	it("the browser: live files and their journals go; everything else stays", async () => {
		for (const n of ["live.sqlite3", "live.sqlite3-journal", "live-sandbox.sqlite3", "live.unreadable-1.sqlite3", "live.unreadable-1.sqlite3-journal"])
			root.files.set(n, new Uint8Array([1]));
		const gone = await erase({ native: false, wasmUrl: "" }, live);
		expect(gone.sort()).toEqual(["live-sandbox.sqlite3", "live.sqlite3", "live.sqlite3-journal"]);
		expect([...root.files.keys()].sort()).toEqual(["live.unreadable-1.sqlite3", "live.unreadable-1.sqlite3-journal"]);
	});

	it("the native shells: only live files are unlinked", async () => {
		for (const n of ["/live.sqlite3", "/live.unreadable-1.sqlite3"]) slots.set(n, new Uint8Array([1]));
		expect(await erase({ native: true, wasmUrl: "" }, live)).toEqual(["/live.sqlite3"]);
		expect([...slots.keys()]).toEqual(["/live.unreadable-1.sqlite3"]);
	});
});
