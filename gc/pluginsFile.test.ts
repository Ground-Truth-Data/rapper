/** The plugins file refuses what its rules forbid: no form is deleted, no answer or photo rewritten, no half a fix. */

import { fileURLToPath } from "node:url";
import { beforeAll, beforeEach, expect, test } from "vitest";
import { type Db, loadApi, statements } from "../db/gate.js";
import { pluginsDdl } from "./pluginsFile";

let api: { oo1: { DB: new (f: string) => Db } };
let db: Db;
const run = (sql: string) => db.exec({ sql });

beforeAll(async () => {
	api = (await loadApi(fileURLToPath(import.meta.resolve("@sqlite.org/sqlite-wasm/sqlite3.wasm")))) as unknown as typeof api;
});

beforeEach(() => {
	db = new api.oo1.DB(":memory:");
	for (const sql of statements(pluginsDdl)) run(sql);
	run("PRAGMA foreign_keys = ON");
	run(`INSERT INTO plugin (id, definition, madeBy, publishedAt, addedAt) VALUES ('f', '{"title":"Survey"}', 'me', 't', 't')`);
	run(`INSERT INTO answer (id, plugin, filledAt, data, editedByKey, lat, lng, accuracyM) VALUES ('a1', 'f', 't', '{}', 'self', 49.2, -123.1, 5)`);
	run(`INSERT INTO answerRow (id, answer, groupKey, n, data) VALUES ('r1', 'a1', 'trees', 0, '{}')`);
	run(`INSERT INTO photo (key, type, bytes, takenAt) VALUES ('p', 'image/webp', x'00', 't')`);
});

test.each([
	["DELETE FROM plugin", "a form is never deleted"],
	["UPDATE answer SET data = '{\"x\":1}'", "answer rows are insert-only"],
	["DELETE FROM answer", "answer rows are insert-only"],
	["UPDATE answerRow SET n = 1", "answerRow rows are insert-only"],
	["DELETE FROM answerRow", "answerRow rows are insert-only"],
	["UPDATE photo SET type = 'x'", "photo rows are insert-only"],
	["DELETE FROM photo", "photo rows are insert-only"],
])("%s is refused", (sql, why) => {
	expect(() => run(sql)).toThrow(why);
});

test("a fix is a new answer naming the one it replaces", () => {
	run(`INSERT INTO answer (id, plugin, filledAt, replaces, data, editedByKey) VALUES ('a2', 'f', 't2', 'a1', '{"x":1}', 'self')`);
	expect(() => run(`INSERT INTO answer (id, plugin, filledAt, replaces, data, editedByKey) VALUES ('a3', 'f', 't', 'nope', '{}', 'self')`)).toThrow(/FOREIGN KEY/);
});

test.each([
	["a latitude with no longitude", "49.2, NULL, NULL"],
	["an accuracy with no place", "NULL, NULL, 5"],
])("an answer with %s is refused", (_, fix) => {
	expect(() => run(`INSERT INTO answer (id, plugin, filledAt, data, editedByKey, lat, lng, accuracyM) VALUES ('a9', 'f', 't', '{}', 'self', ${fix})`)).toThrow(/CHECK/);
});

test.each([
	["plugin", `INSERT INTO plugin (id, definition, madeBy, publishedAt, addedAt) VALUES ('g', '[]', 'me', 't', 't')`],
	["answer", `INSERT INTO answer (id, plugin, filledAt, data, editedByKey) VALUES ('a9', 'f', 't', 'not json', 'self')`],
	["draft path", `INSERT INTO draft (plugin, data, path, savedAt) VALUES ('f', '{}', '{}', 't')`],
	["replacedBy", `UPDATE plugin SET replacedBy = '"x"'`],
])("a %s that is not the right JSON shape is refused", (_, sql) => {
	expect(() => run(sql)).toThrow(/CHECK/);
});

test("the form and the draft are the rows that change", () => {
	run(`UPDATE plugin SET lockedAt = 't2', replacedBy = '{"id":"g","title":"Survey 2"}'`);
	run(`INSERT INTO draft (plugin, data, path, savedAt) VALUES ('f', '{}', '[]', 't')`);
	run(`UPDATE draft SET data = '{"x":1}'`);
	run("DELETE FROM draft");
	expect(db.exec({ sql: "SELECT lockedAt FROM plugin", rowMode: "array", returnValue: "resultRows" })).toEqual([["t2"]]);
});
