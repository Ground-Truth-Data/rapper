// rapper/DB_LAW.md, enforced. Only gate.ts opens SQLite, takes the database lock or names
// how a database file is made; and the gate keeps every row it finds.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import sqlite3InitModule from "@sqlite.org/sqlite-wasm";
import { beforeAll, describe, expect, it } from "vitest";
import { type Db, reconcile, UNREADABLE } from "./gate.js";
import { breaches } from "./law.js";

const fetch = fileURLToPath(new URL("../..", import.meta.url));
const REPOS = ["getCache", "rapper", "getCache_OnlineMap", "getCache_OfflineMap", "ReTreever"];
const SKIP_DIR = /^(node_modules|\.svelte-kit|\.svelte-kit-roundtrip|build.*|dist|\.vercel|\.wrangler|tests|scripts|supabase|static|paraglide|_rapper|ios|android)$/;
const SOURCE = /\.(ts|js|mjs|svelte)$/;
const TEST = /\.(test|spec)\.(ts|js)$|\.component\.test\.ts$/;


function* sources(dir: string): Generator<string> {
	for (const name of readdirSync(dir)) {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) {
			if (!SKIP_DIR.test(name) && !name.startsWith(".")) yield* sources(path);
		} else if (SOURCE.test(name) && !TEST.test(name)) yield path;
	}
}

describe("only gate.ts opens SQLite", () => {
	it("nothing else in any repo opens SQLite, takes the db lock or makes a db file", () => {
		const offenders: string[] = [];
		for (const repo of REPOS)
			for (const file of sources(join(fetch, repo))) {
				const rel = relative(fetch, file);
				for (const what of breaches(rel, readFileSync(file, "utf8"))) offenders.push(`${rel}: ${what}`);
			}
		expect(offenders, "ask the gate (rapper/db/gate.ts) instead — rapper/DB_LAW.md").toEqual([]);
	});
});

let sqlite3: { oo1: { DB: new (f?: string) => unknown } };
beforeAll(async () => {
	sqlite3 = (await sqlite3InitModule()) as unknown as typeof sqlite3;
});
const fresh = () => new sqlite3.oo1.DB(":memory:") as unknown as Db;
const all = (db: Db, sql: string) => db.exec({ sql, rowMode: "object", returnValue: "resultRows" }) as Record<string, unknown>[];

const V1 = "CREATE TABLE `pin` (\n\t`pinKey` text PRIMARY KEY NOT NULL,\n\t`name` text NOT NULL\n);";
const V2 = [
	"CREATE TABLE `owner` (\n\t`ownerKey` text PRIMARY KEY NOT NULL\n);",
	"CREATE TABLE `pin` (\n\t`pinKey` text PRIMARY KEY NOT NULL,\n\t`name` text NOT NULL,\n\t`note` text DEFAULT '' NOT NULL,\n\t`ownerKey` text NOT NULL,\n\t`at` text UNIQUE,\n\tFOREIGN KEY (`ownerKey`) REFERENCES `owner`(`ownerKey`) ON UPDATE no action ON DELETE cascade\n);",
	"CREATE INDEX `pin_name_idx` ON `pin` (`name`);",
	"CREATE VIEW `pinView` AS SELECT pinKey, name, note FROM pin;",
].join("\n--> statement-breakpoint\n");

describe("the gate keeps every row", () => {
	it("an older file gets the missing table, columns, index and view in place; its rows stay", () => {
		const db = fresh();
		reconcile(db, V1);
		db.exec({ sql: "INSERT INTO pin VALUES ('p1', 'North 40'), ('p2', 'Creek')" });
		const added = reconcile(db, V2);
		expect(added).toEqual(["owner", "pin.note", "pin.ownerKey", "pin.at"]);
		expect(all(db, "SELECT pinKey, name, note, ownerKey FROM pinView JOIN pin USING (pinKey, name, note) ORDER BY pinKey")).toEqual([
			{ pinKey: "p1", name: "North 40", note: "", ownerKey: null },
			{ pinKey: "p2", name: "Creek", note: "", ownerKey: null },
		]);
		expect(all(db, "SELECT name FROM sqlite_master WHERE name = 'pin_name_idx'")).toHaveLength(1);
	});

	it("an up-to-date file is left as it is, and reconciling twice adds nothing", () => {
		const db = fresh();
		reconcile(db, V2);
		db.exec({ sql: "INSERT INTO owner VALUES ('o'); INSERT INTO pin (pinKey, name, ownerKey) VALUES ('p1', 'a', 'o')" });
		expect(reconcile(db, V2)).toEqual([]);
		expect(all(db, "SELECT count(*) AS n FROM pin")).toEqual([{ n: 1 }]);
	});

	it("a column the code no longer names stays in the file with its data", () => {
		const db = fresh();
		reconcile(db, "CREATE TABLE `pin` (\n\t`pinKey` text PRIMARY KEY NOT NULL,\n\t`old` text\n);");
		db.exec({ sql: "INSERT INTO pin VALUES ('p1', 'kept')" });
		reconcile(db, V1);
		expect(all(db, "SELECT old FROM pin")).toEqual([{ old: "kept" }]);
	});

	it("a trigger the code no longer names is gone after the next open; the rows stay", () => {
		const db = fresh();
		reconcile(db, `${V1}\n--> statement-breakpoint\nCREATE TRIGGER \`pin_locked\` BEFORE UPDATE ON \`pin\` BEGIN SELECT RAISE(ABORT, 'locked'); END;`);
		db.exec({ sql: "INSERT INTO pin VALUES ('p1', 'North 40')" });
		expect(() => db.exec({ sql: "UPDATE pin SET name = 'x'" })).toThrow(/locked/);
		reconcile(db, V1);
		db.exec({ sql: "UPDATE pin SET name = 'Creek'" });
		expect(all(db, "SELECT name FROM pin")).toEqual([{ name: "Creek" }]);
		expect(all(db, "SELECT name FROM sqlite_master WHERE type = 'trigger'")).toEqual([]);
	});

	it("a file SQLite cannot read is recognised as unreadable — the one case it is set aside", () => {
		expect(UNREADABLE.test("SQLITE_NOTADB: sqlite3 result code 26: file is not a database")).toBe(true);
		expect(UNREADABLE.test("SQLITE_BUSY: database is locked")).toBe(false);
	});
});
