/** rapper/DB_LAW.md 1–5 through the gate's own doors: open, set aside, attach a copy, erase. */

import { fileURLToPath } from "node:url";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
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
	exportFile: (f: string) => {
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
	wasmUrl: "",
	proxyUrl: "",
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
	it("an older file opens in place: its rows stay, the missing table and column are added, the version is stamped", async () => {
		opener = () => older();
		const steps: string[] = [];
		const o = await openGate(options("/older.sqlite3", { step: (s) => steps.push(s) }));
		expect(o).toMatchObject({ memory: "", aside: "", added: ["owner", "pin.note"] });
		expect(all(o.db, "SELECT pinKey, note FROM pinView ORDER BY pinKey")).toEqual([
			{ pinKey: "p1", note: "" },
			{ pinKey: "p2", note: "" },
		]);
		expect(all(o.db, "PRAGMA user_version")).toEqual([{ user_version: 57 }]);
		expect(steps).toContain("adding missing tables and columns");
	});

	it("storage the browser refuses runs this tab in memory, at today's shape, saying why", async () => {
		storage = () => Promise.reject(new Error("SecurityError: storage denied"));
		const o = await openGate(options("/refused.sqlite3"));
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

	it("a tab on memory holds no lock: the next open, its own retake included, leaves it running", async () => {
		const lost = vi.fn();
		opener = () => {
			throw new Error("SQLITE_BUSY: database is locked");
		};
		const busy = await openGate(options("/busy.sqlite3", { lost }));
		expect(busy.memory).toMatch("SQLITE_BUSY");
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
