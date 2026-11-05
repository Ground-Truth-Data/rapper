// A second file attached for good (a company's forms) gets the whole shape in its own schema, never main's.
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { carry, type Db, exportBytes, loadApi, reconcile } from "./gate.js";

let make: () => Db;
beforeAll(async () => {
	const api = await loadApi(fileURLToPath(import.meta.resolve("@sqlite.org/sqlite-wasm/sqlite3.wasm")), false);
	make = () => new api.oo1.DB(":memory:") as unknown as Db;
});
const all = (db: Db, sql: string) => db.exec({ sql, rowMode: "object", returnValue: "resultRows" }) as Record<string, unknown>[];

const V1 = "CREATE TABLE `answer` (\n\t`id` text PRIMARY KEY NOT NULL,\n\t`data` text NOT NULL\n)";
const V2 = [
	"CREATE TABLE `answer` (\n\t`id` text PRIMARY KEY NOT NULL,\n\t`data` text NOT NULL,\n\t`sentAt` text\n)",
	"CREATE INDEX `answer_unsent` ON `answer` (`sentAt`)",
	"CREATE TRIGGER `answer_kept` BEFORE DELETE ON `answer` BEGIN SELECT RAISE(ABORT, 'insert-only'); END",
].join("\n--> statement-breakpoint\n");

describe("a file attached for good", () => {
	it("gets its tables, index and trigger in its own schema; main stays untouched", () => {
		const db = make();
		db.exec({ sql: "ATTACH ':memory:' AS company" });
		expect(reconcile(db, V2, "company", true)).toEqual(["answer"]);
		expect(all(db, "SELECT type, name FROM company.sqlite_master ORDER BY name").map((r) => `${r.type}:${r.name}`)).toEqual([
			"table:answer", "trigger:answer_kept", "index:answer_unsent", "index:sqlite_autoindex_answer_1",
		]);
		expect(all(db, "SELECT name FROM main.sqlite_master")).toEqual([]);
		db.exec({ sql: "INSERT INTO company.answer (id, data) VALUES ('a1', '{}')" });
		expect(() => db.exec({ sql: "DELETE FROM company.answer" })).toThrow(/insert-only/);
		expect(reconcile(db, V2, "company", true)).toEqual([]);
	});

	it("an older build's rows carry into a fresh file of today's shape", () => {
		const db = make();
		db.exec({ sql: "ATTACH ':memory:' AS company" });
		reconcile(db, V1, "company", true);
		db.exec({ sql: "INSERT INTO company.answer VALUES ('a1', '{\"dbh\":12}')" });
		const older = exportBytes(db, "company");
		db.exec({ sql: "DETACH company" });
		db.exec({ sql: "ATTACH ':memory:' AS company" });
		reconcile(db, V2, "company", true);
		carry(db, older, V2, "company");
		expect(all(db, "SELECT id, data, sentAt FROM company.answer")).toEqual([{ id: "a1", data: '{"dbh":12}', sentAt: null }]);
		expect(() => db.exec({ sql: "DELETE FROM company.answer" })).toThrow(/insert-only/);
	});
});
